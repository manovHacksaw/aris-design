/**
 * Notification Routes
 * 
 * API endpoints for notification management.
 */

import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware';
import {
    getNotifications,
    getUnreadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount,
} from '../controllers/notificationController';

const router = Router();

// All notification routes require authentication
router.use(authenticateJWT);

// GET /api/notifications - Get all notifications
router.get('/', getNotifications);

// GET /api/notifications/unread - Get only unread notifications
router.get('/unread', getUnreadNotifications);

// GET /api/notifications/count - Get unread count
router.get('/count', getUnreadCount);

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', markAllNotificationsAsRead);

// PATCH /api/notifications/:id/read - Mark specific notification as read
router.patch('/:id/read', markNotificationAsRead);

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', deleteNotification);

export default router;
