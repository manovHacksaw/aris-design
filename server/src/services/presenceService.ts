import logger from '../lib/logger';
                                                                                                                                                                                                                                                                                    /**
 * Presence Service
 * 
 * Tracks which users are currently viewing which events in real-time.
 * 
 * IMPORTANT: This is an in-memory implementation. For production with multiple
 * servers, upgrade to Redis using the structure:
 *   - Key: event:presence:{eventId}
 *   - Value: Set of userIds
 */                                                                                                                                                                                                                                         

/**                                                                                                                           
 * In-memory store for event presence                                                                                                                                                                                                                                                                                           
 * Key: eventId
 * Value: Set of userIds currently viewing that event
 */
const eventPresence = new Map<string, Set<string>>();

/**
 * Add a user to an event's presence list                                                                                                                                                                                                                                           
 * @param eventId - The event ID
 * @param userId - The user ID to add
 */
export const addUser = (eventId: string, userId: string): void => {
    if (!eventPresence.has(eventId)) {
        eventPresence.set(eventId, new Set<string>());
    }

    const users = eventPresence.get(eventId)!;
    users.add(userId);

    logger.info(`👁️  User ${userId} is now viewing event ${eventId} (${users.size} active)`);
};

/**
 * Remove a user from an event's presence list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
 * @param eventId - The event ID
 * @param userId - The user ID to remove
 */
export const removeUser = (eventId: string, userId: string): void => {
    const users = eventPresence.get(eventId);

    if (!users) {
        return;
    }

    users.delete(userId);

    // Clean up empty sets to prevent memory leaks
    if (users.size === 0) {
        eventPresence.delete(eventId);
        logger.info(`🧹 Event ${eventId} presence cleared (no active users)`);
    } else {
        logger.info(`👋 User ${userId} left event ${eventId} (${users.size} remaining)`);
    }
};

/**
 * Remove a user from all events they're viewing                                                                                                                                                                                                        
 * Called when a user disconnects
 * @param userId - The user ID to remove from all events
 */
export const removeUserFromAll = (userId: string): void => {
    let removedCount = 0;

    // Iterate through all events and remove the user
    for (const [eventId, users] of eventPresence.entries()) {
        if (users.has(userId)) {
            users.delete(userId);
            removedCount++;

            // Clean up empty sets
            if (users.size === 0) {
                eventPresence.delete(eventId);
            }
        }
    }

    if (removedCount > 0) {
        logger.info(`🔌 User ${userId} disconnected, removed from ${removedCount} event(s)`);
    }
};

/**
 * Get the number of active users viewing an event
 * @param eventId - The event ID
 * @returns Number of active users
 */
export const getActiveCount = (eventId: string): number => {
    const users = eventPresence.get(eventId);
    return users ? users.size : 0;
};

/**
 * Get the list of active users viewing an event
 * Useful for showing user avatars or presence indicators
 * @param eventId - The event ID
 * @returns Array of user IDs
 */
export const getActiveUsers = (eventId: string): string[] => {
    const users = eventPresence.get(eventId);
    return users ? Array.from(users) : [];
};

/**
 * Get all events with active viewers
 * Useful for debugging or admin dashboards
 * @returns Map of eventId to user count
 */
export const getAllActiveEvents = (): Map<string, number> => {
    const activeEvents = new Map<string, number>();

    for (const [eventId, users] of eventPresence.entries()) {
        activeEvents.set(eventId, users.size);
    }

    return activeEvents;
};

/**
 * Check if a specific user is viewing a specific event
 * @param eventId - The event ID
 * @param userId - The user ID
 * @returns True if user is viewing the event
 */
export const isUserViewing = (eventId: string, userId: string): boolean => {
    const users = eventPresence.get(eventId);
    return users ? users.has(userId) : false;
};

/**
 * Get all events a user is currently viewing
 * @param userId - The user ID
 * @returns Array of event IDs
 */
export const getUserEvents = (userId: string): string[] => {
    const events: string[] = [];

    for (const [eventId, users] of eventPresence.entries()) {
        if (users.has(userId)) {
            events.push(eventId);
        }
    }

    return events;
};

/**
 * Clear all presence data
 * Useful for testing or maintenance
 */
export const clearAll = (): void => {
    const eventCount = eventPresence.size;
    eventPresence.clear();
    logger.info(`🧹 Cleared presence data for ${eventCount} event(s)`);
};

/**
 * Get statistics about current presence
 * Useful for monitoring and debugging
 */
export const getStats = () => {
    const totalEvents = eventPresence.size;
    let totalUsers = 0;
    let maxUsers = 0;
    let maxEventId = '';

    for (const [eventId, users] of eventPresence.entries()) {
        const userCount = users.size;
        totalUsers += userCount;

        if (userCount > maxUsers) {
            maxUsers = userCount;
            maxEventId = eventId;
        }
    }

    return {
        totalEvents,
        totalUsers,
        averageUsersPerEvent: totalEvents > 0 ? (totalUsers / totalEvents).toFixed(2) : 0,
        mostActiveEvent: maxEventId ? { eventId: maxEventId, userCount: maxUsers } : null
    };
};

// Export the service as a namespace for cleaner imports
export const PresenceService = {
    addUser,
    removeUser,
    removeUserFromAll,
    getActiveCount,
    getActiveUsers,
    getAllActiveEvents,
    isUserViewing,
    getUserEvents,
    clearAll,
    getStats
};
