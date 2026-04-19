import logger from './lib/logger';
import dotenv from 'dotenv';
import http from 'http';
import { createApp } from './app';
import { checkDatabaseConnection, disconnectDatabase } from './utils/dbConnection';
import { setupSocket, closeSocket } from './socket';
import { EventLifecycleService } from './services/events/EventLifecycleService.js';
import { RewardsDistributionService } from './services/rewards/RewardsDistributionService.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

/**
 * Initialize and start the server
 */
async function startServer(): Promise<void> {
    // Check database connection before starting server
    logger.info('🔍 Checking database connection...');
    const isConnected = await checkDatabaseConnection();

    if (!isConnected) {
        logger.error('❌ Database connection failed. Server will not start.');
        process.exit(1);
    }

    logger.info('✅ Database connection established');

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    setupSocket(httpServer);

    // Start server
    const server = httpServer.listen(PORT, () => {
        logger.info(`🚀 Server running on http://localhost:${PORT}`);
        logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start background task for event transitions
    const transitionInterval = setInterval(async () => {
        try {
            const { prisma } = await import('./lib/prisma');

            const now = new Date();
            const eventsToTransition = await prisma.event.findMany({
                where: {
                    isDeleted: false,
                    blockchainStatus: 'ACTIVE',
                    OR: [
                        { status: 'scheduled', eventType: 'post_and_vote', postingStart: { lte: now } },
                        { status: 'scheduled', eventType: 'vote_only', startTime: { lte: now } },
                        { status: 'posting', postingEnd: { lte: now } },
                        { status: 'voting', endTime: { lte: now } }
                    ]
                },
                select: { id: true }
            });

            if (eventsToTransition.length > 0) {
                logger.info(`🔄 Auto-transitioning ${eventsToTransition.length} events...`);
                for (const event of eventsToTransition) {
                    await EventLifecycleService.autoTransitionEvent(event.id);
                }
            }
        } catch (error) {
            logger.error({ err: error }, 'Error in background transition task:');
        }
    }, 60000); // Run every minute

    // Retry rewards for ACTIVE pools on COMPLETED events (runs every 5 minutes)
    const rewardRetryInterval = setInterval(async () => {
        try {
            const { prisma } = await import('./lib/prisma');
            const MAX_ATTEMPTS = 3;
            const RETRY_COOLDOWN_MS = 5 * 60_000;

            // Only retry pools where the event completed >10min ago — gives the
            // fire-and-forget processEventRewards call time to finish on its own
            // before we treat it as stuck.
            const GRACE_PERIOD_MS = 10 * 60_000;

            const stuckPools = await prisma.eventRewardsPool.findMany({
                where: {
                    status: 'ACTIVE',
                    processingAttempts: { lt: MAX_ATTEMPTS },
                    event: {
                        status: 'completed',
                        updatedAt: { lt: new Date(Date.now() - GRACE_PERIOD_MS) },
                    },
                    OR: [
                        { lastAttemptAt: null },
                        { lastAttemptAt: { lt: new Date(Date.now() - RETRY_COOLDOWN_MS) } },
                    ],
                },
                select: { id: true, eventId: true, processingAttempts: true },
            });

            if (stuckPools.length > 0) {
                logger.warn(`⚠️ Found ${stuckPools.length} stuck reward pool(s). Retrying...`);
            }

            for (const pool of stuckPools) {
                await prisma.eventRewardsPool.update({
                    where: { id: pool.id },
                    data: { processingAttempts: { increment: 1 }, lastAttemptAt: new Date() },
                });
                logger.info(`🔁 Retrying rewards for event ${pool.eventId} (attempt ${pool.processingAttempts + 1}/${MAX_ATTEMPTS})`);
                RewardsDistributionService.processEventRewards(pool.eventId).catch((err) =>
                    logger.error({ err }, `Reward retry failed for event ${pool.eventId}`)
                );
            }
        } catch (error) {
            logger.error({ err: error }, 'Error in reward retry task:');
        }
    }, 5 * 60_000);

    // Reset events stuck in SCHEDULED with no blockchain activity for >24h (runs every 10 minutes)
    const blockchainTimeoutInterval = setInterval(async () => {
        try {
            const { prisma } = await import('./lib/prisma');
            const TIMEOUT_MS = 24 * 60 * 60_000;

            const timedOut = await prisma.event.findMany({
                where: {
                    status: 'scheduled',
                    blockchainStatus: { not: 'ACTIVE' },
                    isDeleted: false,
                    updatedAt: { lt: new Date(Date.now() - TIMEOUT_MS) },
                },
                select: { id: true, title: true, blockchainStatus: true },
            });

            for (const event of timedOut) {
                logger.warn(`⏰ Event "${event.title}" (${event.id}) stuck in SCHEDULED with blockchainStatus=${event.blockchainStatus} for >24h. Resetting to DRAFT.`);
                await prisma.event.update({
                    where: { id: event.id },
                    data: { status: 'draft', blockchainStatus: 'FAILED' },
                });
            }
        } catch (error) {
            logger.error({ err: error }, 'Error in blockchain timeout task:');
        }
    }, 10 * 60_000);

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string): Promise<void> => {
        logger.info(`${signal} signal received: closing HTTP server`);
        clearInterval(transitionInterval);
        clearInterval(rewardRetryInterval);
        clearInterval(blockchainTimeoutInterval);

        // Close Socket.io connections
        await closeSocket();

        server.close(async () => {
            logger.info('HTTP server closed');
            await disconnectDatabase();
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (err: Error) => {
        logger.error({ err: err }, 'Unhandled Promise Rejection:');
        await disconnectDatabase();
        process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (err: Error) => {
        console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
        logger.error({ err: err }, 'Uncaught Exception:');
        await disconnectDatabase();
        process.exit(1);
    });
}

// Start the server
startServer().catch(async (error) => {
    logger.error({ err: error }, 'Failed to start server:');
    await disconnectDatabase();
    process.exit(1);
});

// Trigger restart 8
