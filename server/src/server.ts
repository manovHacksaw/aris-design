import logger from './lib/logger';
import dotenv from 'dotenv';
import http from 'http';
import { createApp } from './app';
import { checkDatabaseConnection, disconnectDatabase } from './utils/dbConnection';
import { setupSocket, closeSocket } from './socket';
import { EventLifecycleService } from './services/events/EventLifecycleService.js';

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

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string): Promise<void> => {
        logger.info(`${signal} signal received: closing HTTP server`);
        clearInterval(transitionInterval);

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
