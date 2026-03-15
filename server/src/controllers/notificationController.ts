/**
 * Notification Controller
 * 
 * Handles HTTP requests for notification management.
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

/**
 * GET /api/notifications
 * Get all notifications for the logged-in user
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const notifications = await prisma.notification.findMany({
            where: {
                userId,
                // Optionally filter out expired notifications
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                brand: {
                    select: {
                        id: true,
                        name: true,
                        logoCid: true,
                    },
                },
            },
        });

        res.json({ notifications });
    } catch (error) {
        console.error('Failed to get notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

/**
 * GET /api/notifications/unread
 * Get only unread notifications for the logged-in user
 */
export const getUnreadNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const notifications = await prisma.notification.findMany({
            where: {
                userId,
                isRead: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                brand: {
                    select: {
                        id: true,
                        name: true,
                        logoCid: true,
                    },
                },
            },
        });

        res.json({
            notifications,
            count: notifications.length,
        });
    } catch (error) {
        console.error('Failed to get unread notifications:', error);
        res.status(500).json({ error: 'Failed to fetch unread notifications' });
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.id;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Verify notification belongs to user
        const notification = await prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }

        if (notification.userId !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Mark as read
        const updatedNotification = await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });

        res.json({ notification: updatedNotification });
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the logged-in user
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        res.json({
            message: 'All notifications marked as read',
            count: result.count,
        });
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.id;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Verify notification belongs to user
        const notification = await prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }

        if (notification.userId !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Delete notification
        await prisma.notification.delete({
            where: { id },
        });

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Failed to delete notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};

/**
 * GET /api/notifications/count
 * Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const count = await prisma.notification.count({
            where: {
                userId,
                isRead: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
        });

        res.json({ count });
    } catch (error) {
        console.error('Failed to get unread count:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
};
