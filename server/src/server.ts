import dotenv from 'dotenv';
import http from 'http';
import { createApp } from './app';
import { checkDatabaseConnection, disconnectDatabase } from './utils/dbConnection';
import { setupSocket, closeSocket } from './socket';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

/**
 * Initialize and start the server
 */
async function startServer(): Promise<void> {
    // Check database connection before starting server
    console.log('🔍 Checking database connection...');
    const isConnected = await checkDatabaseConnection();

    if (!isConnected) {
        console.error('❌ Database connection failed. Server will not start.');
        process.exit(1);
    }

    console.log('✅ Database connection established');

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    setupSocket(httpServer);

    // Start server
    const server = httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start background task for event transitions
    const transitionInterval = setInterval(async () => {
        try {
            const { EventService } = await import('./services/eventService');
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
                console.log(`🔄 Auto-transitioning ${eventsToTransition.length} events...`);
                for (const event of eventsToTransition) {
                    await EventService.autoTransitionEvent(event.id);
                }
            }
        } catch (error) {
            console.error('Error in background transition task:', error);
        }
    }, 60000); // Run every minute

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string): Promise<void> => {
        console.log(`${signal} signal received: closing HTTP server`);
        clearInterval(transitionInterval);

        // Close Socket.io connections
        await closeSocket();

        server.close(async () => {
            console.log('HTTP server closed');
            await disconnectDatabase();
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (err: Error) => {
        console.error('Unhandled Promise Rejection:', err);
        await disconnectDatabase();
        process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (err: Error) => {
        console.error('Uncaught Exception:', err);
        await disconnectDatabase();
        process.exit(1);
    });
}

// Start the server
startServer().catch(async (error) => {
    console.error('Failed to start server:', error);
    await disconnectDatabase();
    process.exit(1);
});

// Trigger restart 8
