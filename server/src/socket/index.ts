import logger from '../lib/logger.js';
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { PrivyClient } from '@privy-io/server-auth';
import { prisma } from '../lib/prisma.js';
import { PresenceService } from '../services/presenceService.js';
import { AnalyticsTrackingService } from '../services/analytics/AnalyticsTrackingService.js';

const privy = new PrivyClient(
    process.env.PRIVY_APP_ID || '',
    process.env.PRIVY_APP_SECRET || ''
);

/**
 * Extended Socket interface with user data
 */
interface AuthenticatedSocket extends Socket {
    data: {
        user?: {
            id: string;
            address: string | null;
            email: string;
            sessionId: string;
        };
    };
}

/**
 * Socket.io server instance
 */
let io: Server | null = null;

/**
 * Get the Socket.io instance
 * @returns Socket.io server instance
 */
export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.io has not been initialized. Call setupSocket first.');
    }
    return io;
};

/**
 * Authentication middleware for Socket.io
 * Verifies JWT token and attaches user info to socket
 */
const authenticateSocket = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        // Verify Privy access token (matches HTTP authenticateJWT middleware)
        let verifiedClaims;
        try {
            verifiedClaims = await privy.verifyAuthToken(token);
        } catch {
            return next(new Error('Invalid or expired token'));
        }

        const user = await prisma.user.findUnique({
            where: { privyId: verifiedClaims.userId },
            select: { id: true, walletAddress: true, email: true },
        });

        if (!user) {
            return next(new Error('User not found'));
        }

        // Attach user info to socket
        socket.data.user = {
            id: user.id,
            address: user.walletAddress,
            email: user.email || '',
            sessionId: '',
        };

        next();
    } catch (error) {
        logger.error(error, 'Socket authentication error:');
        next(new Error('Authentication failed'));
    }
};

/**
 * Handle socket connection event
 */
const handleConnection = (socket: AuthenticatedSocket) => {
    const userId = socket.data.user?.id;
    logger.info(`✅ Socket connected: ${socket.id} (User: ${userId})`);

    // Handle join-event: User joins an event room
    socket.on('join-event', (eventId: string) => {
        if (!userId) return;

        socket.join(`event:${eventId}`);

        // Track presence
        PresenceService.addUser(eventId, userId);
        const activeCount = PresenceService.getActiveCount(eventId);

        // Track view in analytics (unique check handled inside)
        AnalyticsTrackingService.trackEventView(eventId, userId).catch(err => {
            logger.error({ err: err }, 'Failed to track event view from socket:');
        });

        // Notify all users in the room (including the joiner)
        io?.to(`event:${eventId}`).emit('presence-update', {
            eventId,
            activeCount,
            activeUsers: PresenceService.getActiveUsers(eventId)
        });
    });

    // Handle leave-event: User leaves an event room
    socket.on('leave-event', (eventId: string) => {
        if (!userId) return;

        socket.leave(`event:${eventId}`);

        // Remove from presence tracking
        PresenceService.removeUser(eventId, userId);
        const activeCount = PresenceService.getActiveCount(eventId);

        // Notify other users in the room
        socket.to(`event:${eventId}`).emit('user-left', {
            userId,
            eventId,
            activeCount
        });

        // Broadcast updated presence to remaining users
        socket.to(`event:${eventId}`).emit('presence-update', {
            eventId,
            activeCount,
            activeUsers: PresenceService.getActiveUsers(eventId)
        });
    });

    // Handle heartbeat: User sends periodic heartbeat to stay active
    socket.on('heartbeat', () => {
        if (!userId) return;

        // Heartbeat received - presence is maintained through join/leave events
        // No action needed as the user is already in the presence map
    });

    // Handle disconnect: Cleanup when user disconnects
    socket.on('disconnect', () => {
        if (!userId) return;

        logger.info(`❌ Socket disconnected: ${socket.id} (User: ${userId})`);

        // Get all events the user was viewing before removing them
        const userEvents = PresenceService.getUserEvents(userId);

        // Remove user from all events
        PresenceService.removeUserFromAll(userId);

        // Notify all affected event rooms
        userEvents.forEach(eventId => {
            const activeCount = PresenceService.getActiveCount(eventId);

            socket.to(`event:${eventId}`).emit('user-left', {
                userId,
                eventId,
                activeCount
            });

            socket.to(`event:${eventId}`).emit('presence-update', {
                eventId,
                activeCount,
                activeUsers: PresenceService.getActiveUsers(eventId)
            });
        });
    });

    // Handle errors
    socket.on('error', (error) => {
        logger.error(error, `Socket error for ${socket.id}:`);
    });
};

/**
 * Setup and initialize Socket.io server
 * @param httpServer - HTTP server instance
 * @returns Socket.io server instance
 */
export const setupSocket = (httpServer: HTTPServer): Server => {
    // Initialize Socket.io with CORS configuration
    io = new Server(httpServer, {
        cors: {
            origin: [
                'http://localhost:3000',
                'https://aris-demo.vercel.app',
                'https://arisweb-demo.vercel.app',
                process.env.FRONTEND_URL || ''
            ].filter(Boolean),
            credentials: true
        },
        // Additional Socket.io options
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Apply authentication middleware
    io.use(authenticateSocket);

    // Handle connections
    io.on('connection', handleConnection);

    logger.info('🔌 Socket.io initialized');

    return io;
};

/**
 * Close all Socket.io connections
 */
export const closeSocket = (): Promise<void> => {
    return new Promise((resolve) => {
        if (!io) {
            resolve();
            return;
        }

        logger.info('Closing Socket.io connections...');
        io.close(() => {
            logger.info('Socket.io connections closed');
            io = null;
            resolve();
        });
    });
};

/**
 * Broadcast to a specific event room
 * @param eventId - Event ID
 * @param event - Event name
 * @param data - Data to broadcast
 */
export const broadcastToEvent = (eventId: string, event: string, data: any) => {
    if (!io) {
        logger.warn('Socket.io not initialized, cannot broadcast');
        return;
    }

    io.to(`event:${eventId}`).emit(event, data);
    logger.info(`📡 Broadcast to event:${eventId} - ${event}`);
};

/**
 * Broadcast to all connected clients
 * @param event - Event name
 * @param data - Data to broadcast
 */
export const broadcastToAll = (event: string, data: any) => {
    if (!io) {
        logger.warn('Socket.io not initialized, cannot broadcast');
        return;
    }


    io.emit(event, data);
    logger.info(`📡 Broadcast to all - ${event}`);
};

/**
 * Re-export presence service functions for convenience
 * This allows importing both socket and presence functions from the same module
 */
export {
    PresenceService,
    // Individual presence functions for direct import
    addUser,
    removeUser,
    removeUserFromAll,
    getActiveCount,
    getActiveUsers,
    getAllActiveEvents,
    isUserViewing,
    getUserEvents,
    getStats as getPresenceStats
} from '../services/presenceService.js';
