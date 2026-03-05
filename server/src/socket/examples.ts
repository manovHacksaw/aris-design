/**
 * Example: How to use Socket.io in your services
 * 
 * This file demonstrates how to integrate real-time updates
 * into your existing services using the centralized socket module.
 */

import { broadcastToEvent, getIO } from '../socket';

/**
 * Example 1: Broadcasting when a new submission is created
 */
export const createSubmission = async (eventId: string, userId: string, content: any) => {
    // ... your existing submission creation logic ...

    // Broadcast to all users in the event room
    broadcastToEvent(eventId, 'new-submission', {
        eventId,
        userId,
        content,
        timestamp: new Date()
    });
};

/**
 * Example 2: Broadcasting when a vote is cast
 */
export const castVote = async (eventId: string, proposalId: string, userId: string) => {
    // ... your existing vote logic ...

    // Broadcast vote update to event room
    broadcastToEvent(eventId, 'vote-update', {
        eventId,
        proposalId,
        userId,
        timestamp: new Date()
    });
};

/**
 * Example 3: Broadcasting when event status changes
 */
export const updateEventStatus = async (eventId: string, newStatus: string) => {
    // ... your existing status update logic ...

    // Broadcast status change to event room
    broadcastToEvent(eventId, 'event-status-change', {
        eventId,
        status: newStatus,
        timestamp: new Date()
    });
};

/**
 * Example 4: Using getIO() for more complex scenarios
 */
export const notifyEventParticipants = async (eventId: string, message: string) => {
    const io = getIO();

    // Get all sockets in the event room
    const sockets = await io.in(`event:${eventId}`).fetchSockets();

    console.log(`Notifying ${sockets.length} participants in event ${eventId}`);

    // Emit to the room
    io.to(`event:${eventId}`).emit('notification', {
        eventId,
        message,
        timestamp: new Date()
    });
};

/**
 * Example 5: Sending to specific user
 */
export const notifyUser = async (userId: string, notification: any) => {
    const io = getIO();

    // Get all sockets for this user (they might be connected from multiple devices)
    const sockets = await io.fetchSockets();
    const userSockets = sockets.filter(socket => socket.data.user?.id === userId);

    // Send to all user's sockets
    userSockets.forEach(socket => {
        socket.emit('personal-notification', notification);
    });
};

/**
 * Example 6: Broadcasting leaderboard updates
 */
export const updateLeaderboard = async (eventId: string, leaderboardData: any) => {
    broadcastToEvent(eventId, 'leaderboard-update', {
        eventId,
        leaderboard: leaderboardData,
        timestamp: new Date()
    });
};

/**
 * Example 7: Real-time presence tracking
 */
export const getEventParticipantCount = async (eventId: string): Promise<number> => {
    const io = getIO();
    const sockets = await io.in(`event:${eventId}`).fetchSockets();
    return sockets.length;
};

/**
 * Example 8: Broadcasting when event ends
 */
export const endEvent = async (eventId: string, results: any) => {
    // ... your existing event ending logic ...

    // Broadcast final results to all participants
    broadcastToEvent(eventId, 'event-ended', {
        eventId,
        results,
        timestamp: new Date()
    });
};
