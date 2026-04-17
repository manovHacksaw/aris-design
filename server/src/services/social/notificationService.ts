import logger from '../../lib/logger';
/**
 * Notification Service
 *
 * Handles creation and delivery of notifications to users.
 * Integrates with Socket.io for real-time delivery.
 */

import { prisma } from '../../lib/prisma';
import { getIO } from '../../socket';

export interface NotificationData {
    userId: string;
    brandId?: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
    expiresAt?: Date;
}

/**
 * Create a notification in database and emit via Socket.io
 */
const createAndEmitNotification = async (data: NotificationData) => {
    // Create notification in database
    const notification = await prisma.notification.create({
        data: {
            userId: data.userId,
            brandId: data.brandId,
            type: data.type,
            title: data.title,
            message: data.message,
            metadata: data.metadata,
            expiresAt: data.expiresAt,
            isRead: false,
        },
    });

    // Emit via Socket.io to specific user
    try {
        let io;
        try {
            io = getIO();
        } catch (e) {
            // Socket.io not initialized (likely running in a script context)
            return notification;
        }

        const sockets = await io.fetchSockets();
        const userSockets = sockets.filter(socket => socket.data.user?.id === data.userId);

        userSockets.forEach(socket => {
            socket.emit('personal-notification', notification);
        });

        logger.info(`📬 Notification sent to user ${data.userId}: ${data.type}`);
    } catch (error) {
        logger.error({ err: error }, 'Failed to emit notification via socket:');
        // Don't throw - notification is still saved in DB
    }

    return notification;
};

/**
 * 1. Create welcome notification for first-time users
 */
export const createWelcomeNotification = async (userId: string) => {
    try {
        // Check if a welcome notification already exists
        const welcomeCount = await prisma.notification.count({
            where: { userId, type: 'WELCOME' },
        });

        if (welcomeCount > 0) {
            // Already welcomed
            return null;
        }

        // Get user details
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true, username: true },
        });

        const userName = user?.displayName || user?.username || 'there';

        return await createAndEmitNotification({
            userId,
            type: 'WELCOME',
            title: 'Welcome to Aris! 👋',
            message: `Welcome ${userName}! We're excited to have you here. Start exploring events and earn rewards!`,
            metadata: {
                demoLink: 'https://aris.com/demo', // Update with actual demo link
                isFirstLogin: true,
            },
        });
    } catch (error) {
        logger.error(error, 'Failed to create welcome notification:');
        return null;
    }
};

/**
 * 2. Create streak notification for consecutive login days
 */
export const createStreakNotification = async (userId: string, streakCount: number) => {
    try {
        // Only send streak notification if streak is >= 2
        if (streakCount < 2) {
            return null;
        }

        // Deduplicate: skip if a streak notification was already sent in the last 24 hours
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = await prisma.notification.findFirst({
            where: {
                userId,
                type: 'STREAK',
                createdAt: { gte: since },
            },
            select: { id: true },
        });
        if (recent) {
            return null;
        }

        // Get user details
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true, username: true },
        });

        const userName = user?.displayName || user?.username || 'there';

        // Determine message based on streak milestones
        let message = `Hi ${userName}, your current login streak: ${streakCount} days! Keep it up! 🔥`;

        if (streakCount === 7) {
            message = `Amazing! ${userName}, you've maintained a 7-day streak! 🎉`;
        } else if (streakCount === 30) {
            message = `Incredible! ${userName}, 30 days in a row! You're on fire! 🔥🔥🔥`;
        } else if (streakCount % 10 === 0) {
            message = `Wow! ${userName}, ${streakCount} days streak! You're unstoppable! 💪`;
        }

        return await createAndEmitNotification({
            userId,
            type: 'STREAK',
            title: `${streakCount} Day Streak! 🔥`,
            message,
            metadata: {
                streakCount,
                milestone: streakCount % 10 === 0 || streakCount === 7,
            },
        });
    } catch (error) {
        logger.error(error, 'Failed to create streak notification:');
        return null;
    }
};

/**
 * 3. Create event result notification for all participants
 */
export const createEventResultNotification = async (eventId: string) => {
    try {
        // Get event details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                brand: {
                    select: { name: true },
                },
            },
        });

        if (!event) {
            logger.error({ eventId }, 'Event not found for result notification');
            return;
        }

        // Get all participants (users who voted or submitted)
        const voters = await prisma.vote.findMany({
            where: { eventId },
            select: { userId: true },
            distinct: ['userId'],
        });

        const submitters = await prisma.submission.findMany({
            where: { eventId },
            select: { userId: true },
            distinct: ['userId'],
        });

        // Combine and deduplicate participant IDs
        const participantIds = new Set([
            ...voters.map(v => v.userId),
            ...submitters.map(s => s.userId),
        ]);

        // Create notification for each participant
        const notifications = await Promise.all(
            Array.from(participantIds).map(userId =>
                createAndEmitNotification({
                    userId,
                    brandId: event.brandId,
                    type: 'EVENT_RESULT',
                    title: 'Event Results Are In! 🎯',
                    message: `The results for "${event.title}" by ${event.brand.name} are now available. Check out the winners!`,
                    metadata: {
                        eventId,
                        eventName: event.title,
                        brandName: event.brand.name,
                        eventType: event.eventType,
                    },
                })
            )
        );

        logger.info(`📊 Sent ${notifications.length} event result notifications for event ${eventId}`);
        return notifications;
    } catch (error) {
        logger.error(error, 'Failed to create event result notifications:');
        return [];
    }
};

/**
 * 4. Create voting live notification for brand subscribers
 */
export const createVotingLiveNotification = async (eventId: string) => {
    try {
        // Get event details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                brand: {
                    select: { name: true },
                },
            },
        });

        if (!event) {
            logger.error({ eventId }, 'Event not found for voting live notification');
            return;
        }

        // Get all brand subscribers
        const subscribers = await prisma.brandSubscription.findMany({
            where: { brandId: event.brandId },
            select: { userId: true },
        });

        // Create notification for each subscriber
        const notifications = await Promise.all(
            subscribers.map(sub =>
                createAndEmitNotification({
                    userId: sub.userId,
                    brandId: event.brandId,
                    type: 'VOTING_LIVE',
                    title: 'Voting is Now Live! 🗳️',
                    message: `Voting has started for "${event.title}" by ${event.brand.name}. Cast your vote now!`,
                    metadata: {
                        eventId,
                        eventName: event.title,
                        brandName: event.brand.name,
                        votingEndTime: event.endTime,
                    },
                    expiresAt: event.endTime, // Notification expires when voting ends
                })
            )
        );

        logger.info(`🗳️ Sent ${notifications.length} voting live notifications for event ${eventId}`);
        return notifications;
    } catch (error) {
        logger.error(error, 'Failed to create voting live notifications:');
        return [];
    }
};

/**
 * 5. Create brand post notification for new events
 */
export const createBrandPostNotification = async (brandId: string, eventId: string) => {
    try {
        // Get event and brand details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                brand: {
                    select: { name: true },
                },
            },
        });

        if (!event) {
            logger.error({ eventId }, 'Event not found for brand post notification');
            return;
        }

        // Get all brand subscribers
        const subscribers = await prisma.brandSubscription.findMany({
            where: { brandId },
            select: { userId: true },
        });

        // Determine event type display text
        const eventTypeText = event.eventType === 'post_and_vote'
            ? 'Submit your content and vote!'
            : 'Vote on the best option!';

        // Create notification for each subscriber
        const notifications = await Promise.all(
            subscribers.map(sub =>
                createAndEmitNotification({
                    userId: sub.userId,
                    brandId,
                    type: 'BRAND_POST',
                    title: 'New Event from ' + event.brand.name + '! 📢',
                    message: `"${event.brand.name}" just created "${event.title}". ${eventTypeText} Participate to earn rewards now!`,
                    metadata: {
                        brandId,
                        eventId,
                        eventName: event.title,
                        eventType: event.eventType,
                        startTime: event.startTime,
                    },
                })
            )
        );

        logger.info(`📢 Sent ${notifications.length} brand post notifications for event ${eventId}`);
        return notifications;
    } catch (error) {
        logger.error(error, 'Failed to create brand post notifications:');
        return [];
    }
};

/**
 * 6. Create notification for brand when a user subscribes
 */
export const createBrandSubscriptionNotification = async (brandId: string, subscriberUserId: string) => {
    try {
        // Get brand and subscriber details
        const [brand, subscriber] = await Promise.all([
            prisma.brand.findUnique({
                where: { id: brandId },
                select: {
                    name: true,
                    ownerId: true,
                },
            }),
            prisma.user.findUnique({
                where: { id: subscriberUserId },
                select: {
                    username: true,
                    displayName: true,
                },
            }),
        ]);

        if (!brand || !brand.ownerId) {
            logger.error({ brandId }, 'Brand not found or has no owner');
            return;
        }

        if (!subscriber) {
            logger.error({ subscriberUserId }, 'Subscriber user not found');
            return;
        }

        const subscriberName = subscriber.displayName || subscriber.username || 'A user';

        // Create notification for brand owner
        const notification = await createAndEmitNotification({
            userId: brand.ownerId, // Send to brand owner
            brandId,
            type: 'NEW_SUBSCRIBER',
            title: 'New Subscriber! 🎉',
            message: `${subscriberName} just subscribed to ${brand.name}!`,
            metadata: {
                brandId,
                subscriberUserId,
                subscriberName,
                subscribedAt: new Date().toISOString(),
            },
        });

        logger.info(`🎉 New subscriber notification sent to brand owner for ${brand.name}`);
        return notification;
    } catch (error) {
        logger.error(error, 'Failed to create brand subscription notification:');
        return null;
    }
};

/**
 * Calculate login streak for a user
 */


/**
 * 7. Create notification for brand when a user votes
 */


/**
 * 8. Create notification for brand when a user posts a submission
 */


/**
 * 9. Create notification for brand when event phase changes
 */


/**
 * 10. Create notification for user when their submission receives a vote
 */
export const createSubmissionVoteNotification = async (submissionId: string, voterId: string) => {
    try {
        // Get submission and voter details
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        brandId: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!submission || !submission.user) {
            logger.error({ submissionId }, 'Submission or submission owner not found for vote notification');
            return;
        }

        // Don't notify if user voted for their own submission (should be prevented by rules, but safety check)
        if (submission.userId === voterId) {
            return;
        }

        // Create notification for submission owner
        const notification = await createAndEmitNotification({
            userId: submission.userId, // Send to submission owner
            brandId: submission.event.brandId,
            type: 'SUBMISSION_VOTE',
            title: 'New Vote! 🗳️',
            message: `Someone just voted for your submission in "${submission.event.title}"!`,
            metadata: {
                submissionId,
                eventId: submission.eventId,
                eventName: submission.event.title,
                votedAt: new Date().toISOString(),
            },
        });

        logger.info(`🗳️ Submission vote notification sent to user ${submission.userId}`);
        return notification;
    } catch (error) {
        logger.error(error, 'Failed to create submission vote notification:');
        return null;
    }
};
export const createEventPhaseChangeNotification = async (eventId: string, oldStatus: string, newStatus: string) => {
    try {
        // Get event details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                brand: {
                    select: {
                        id: true,
                        ownerId: true,
                        name: true,
                    },
                },
            },
        });

        if (!event || !event.brand || !event.brand.ownerId) {
            logger.error({ eventId }, 'Event or brand owner not found for phase change notification');
            return;
        }

        let message = `Your event "${event.title}" has transitioned from ${oldStatus} to ${newStatus}.`;
        let title = 'Event Phase Changed 🔄';

        if (newStatus === 'voting') {
            title = 'Voting is Live! 🗳️';
            message = `Voting is now open for your event "${event.title}"!`;
        } else if (newStatus === 'completed') {
            title = 'Event Completed! 🏁';
            message = `Your event "${event.title}" has ended. You can now view all submissions and voting results!`;
        } else if (newStatus === 'posting') {
            title = 'Posting is Live! 📸';
            message = `Users can now post submissions to your event "${event.title}"!`;
        }

        // Create notification for brand owner
        const notification = await createAndEmitNotification({
            userId: event.brand.ownerId, // Send to brand owner
            brandId: event.brand.id,
            type: 'EVENT_PHASE_CHANGE',
            title: title,
            message: message,
            metadata: {
                eventId,
                eventName: event.title,
                oldStatus,
                newStatus,
                timestamp: new Date().toISOString(),
            },
        });

        logger.info(`🔄 Phase change notification sent to brand owner for event ${event.title} (${newStatus})`);
        return notification;
    } catch (error) {
        logger.error(error, 'Failed to create event phase change notification:');
        return null;
    }
};
export const createEventSubmissionNotification = async (eventId: string) => {
    try {
        // Get event details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                brand: {
                    select: {
                        id: true,
                        ownerId: true,
                        name: true,
                    },
                },
            },
        });

        if (!event || !event.brand || !event.brand.ownerId) {
            logger.error({ eventId }, 'Event or brand owner not found for submission notification');
            return;
        }

        // Create notification for brand owner
        const notification = await createAndEmitNotification({
            userId: event.brand.ownerId, // Send to brand owner
            brandId: event.brand.id,
            type: 'EVENT_SUBMISSION',
            title: 'New Submission! 📸',
            message: `A user just posted a submission to your event "${event.title}"!`,
            metadata: {
                eventId,
                eventName: event.title,
                votedAt: new Date().toISOString(),
            },
        });

        logger.info(`📸 Submission notification sent to brand owner for event ${event.title}`);
        return notification;
    } catch (error) {
        logger.error(error, 'Failed to create event submission notification:');
        return null;
    }
};
export const createEventVoteNotification = async (eventId: string) => {
    try {
        // Get event details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                brand: {
                    select: {
                        id: true,
                        ownerId: true,
                        name: true,
                    },
                },
            },
        });

        if (!event || !event.brand || !event.brand.ownerId) {
            logger.error({ eventId }, 'Event or brand owner not found for vote notification');
            return;
        }

        // Create notification for brand owner
        const notification = await createAndEmitNotification({
            userId: event.brand.ownerId, // Send to brand owner
            brandId: event.brand.id,
            type: 'EVENT_VOTE',
            title: 'New Vote! 🗳️',
            message: `A user just voted in your event "${event.title}"!`,
            metadata: {
                eventId,
                eventName: event.title,
                votedAt: new Date().toISOString(),
            },
        });

        logger.info(`🗳️ Valid vote notification sent to brand owner for event ${event.title}`);
        return notification;
    } catch (error) {
        logger.error(error, 'Failed to create event vote notification:');
        return null;
    }
};

/**
 * Create XP milestone notification when user claims a milestone reward
 */
export const createXpMilestoneNotification = async (
    userId: string,
    milestone: { category: string; threshold: number; xpAwarded: number }
) => {
    try {
        // Format category name for display
        const categoryNames: Record<string, string> = {
            VOTES_CAST: 'Votes Cast',
            TOP_VOTES: 'Top Votes',
            LOGIN_STREAK: 'Login Streak',
            POSTS_CREATED: 'Posts Created',
            VOTES_RECEIVED: 'Votes Received',
            TOP_3_CONTENT: 'Top 3 Finishes',
            REFERRAL: 'Referrals',
        };

        const categoryName = categoryNames[milestone.category] || milestone.category;

        return await createAndEmitNotification({
            userId,
            type: 'XP_MILESTONE',
            title: `🎉 Milestone Achieved!`,
            message: `Congratulations! You reached ${milestone.threshold} ${categoryName} and earned ${milestone.xpAwarded} XP!`,
            metadata: {
                category: milestone.category,
                threshold: milestone.threshold,
                xpAwarded: milestone.xpAwarded,
            },
        });
    } catch (error) {
        logger.error(error, 'Failed to create XP milestone notification:');
        return null;
    }
};

/**
 * Create notification for event cancellation due to insufficient submissions
 * Notifies brand owner and all subscribers
 */
export const createEventCancellationNotification = async (
    eventId: string,
    reason: 'INSUFFICIENT_POSTS' | 'MANUAL' = 'INSUFFICIENT_POSTS'
) => {
    try {
        // Get event details with brand and subscribers
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                brand: {
                    select: {
                        id: true,
                        ownerId: true,
                        name: true,
                        subscriptions: {
                            select: {
                                userId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!event || !event.brand) {
            logger.error({ eventId }, 'Event or brand not found for cancellation notification');
            return;
        }

        const reasonMessage = reason === 'INSUFFICIENT_POSTS'
            ? 'The event did not receive enough submissions during the posting phase.'
            : 'The event was cancelled by the brand.';

        // 1. Notify brand owner
        if (event.brand.ownerId) {
            await createAndEmitNotification({
                userId: event.brand.ownerId,
                brandId: event.brand.id,
                type: 'EVENT_CANCELLED',
                title: 'Event Cancelled ⚠️',
                message: `Your event "${event.title}" has been cancelled. ${reasonMessage} A full refund has been credited to your account.`,
                metadata: {
                    eventId,
                    eventTitle: event.title,
                    reason,
                    refundPending: true,
                },
            });
            logger.info(`📢 Cancellation notification sent to brand owner for event ${event.title}`);
        }

        // 2. Notify all subscribers
        const subscriberIds = event.brand.subscriptions.map(s => s.userId);

        for (const userId of subscriberIds) {
            // Don't notify the brand owner twice if they're also a subscriber
            if (userId === event.brand.ownerId) continue;

            await createAndEmitNotification({
                userId,
                brandId: event.brand.id,
                type: 'EVENT_CANCELLED',
                title: `${event.brand.name} Event Cancelled`,
                message: `The event "${event.title}" from ${event.brand.name} has been cancelled. ${reasonMessage}`,
                metadata: {
                    eventId,
                    eventTitle: event.title,
                    brandName: event.brand.name,
                    reason,
                },
            });
        }

        logger.info(`📢 Cancellation notifications sent to ${subscriberIds.length} subscribers for event ${event.title}`);

    } catch (error) {
        logger.error(error, 'Failed to create event cancellation notification:');
    }
};

/**
 * Generic notification creation
 */
export const createNotification = async (data: NotificationData) => {
    return await createAndEmitNotification(data);
};

const ACTIVE_NOTIFICATION_FILTER = {
    OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
    ],
};

const BRAND_SELECT = { select: { id: true, name: true, logoCid: true } };

export const getUserNotifications = async (userId: string, limit: number, cursor?: string) => {
    const where: any = {
        userId,
        ...ACTIVE_NOTIFICATION_FILTER,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    };

    const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: { brand: BRAND_SELECT },
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : undefined;

    let unreadCount: number | undefined;
    if (!cursor) {
        unreadCount = await prisma.notification.count({
            where: { userId, isRead: false, ...ACTIVE_NOTIFICATION_FILTER },
        });
    }

    return { notifications: items, nextCursor, unreadCount };
};

export const getUnreadNotifications = async (userId: string) => {
    return prisma.notification.findMany({
        where: { userId, isRead: false, ...ACTIVE_NOTIFICATION_FILTER },
        orderBy: { createdAt: 'desc' },
        include: { brand: BRAND_SELECT },
    });
};

export const getUnreadCount = async (userId: string) => {
    return prisma.notification.count({
        where: { userId, isRead: false, ...ACTIVE_NOTIFICATION_FILTER },
    });
};

export const markNotificationAsRead = async (id: string, userId: string) => {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new Error('NOT_FOUND');
    if (notification.userId !== userId) throw new Error('FORBIDDEN');
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
};

export const markAllNotificationsAsRead = async (userId: string) => {
    return prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
};

export const deleteUserNotification = async (id: string, userId: string) => {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new Error('NOT_FOUND');
    if (notification.userId !== userId) throw new Error('FORBIDDEN');
    return prisma.notification.delete({ where: { id } });
};

// Export all functions as a service
export const NotificationService = {
    createWelcomeNotification,
    createStreakNotification,
    createEventResultNotification,
    createVotingLiveNotification,
    createBrandPostNotification,
    createBrandSubscriptionNotification,
    createEventVoteNotification,
    createEventSubmissionNotification,
    createEventPhaseChangeNotification,
    createSubmissionVoteNotification,
    createXpMilestoneNotification,
    createEventCancellationNotification,
    createNotification,
    getUserNotifications,
    getUnreadNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteUserNotification,
};
