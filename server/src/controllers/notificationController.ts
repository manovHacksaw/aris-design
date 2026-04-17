import logger from '../lib/logger';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { NotificationService } from '../services/notificationService.js';

const userId = (req: Request) => (req as AuthenticatedRequest).user?.id;

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = userId(req);
    if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;
    const result = await NotificationService.getUserNotifications(uid, limit, cursor);
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get notifications:');
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const getUnreadNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = userId(req);
    if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const notifications = await NotificationService.getUnreadNotifications(uid);
    res.json({ notifications, count: notifications.length });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get unread notifications:');
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = userId(req);
    if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const notification = await NotificationService.markNotificationAsRead(req.params.id, uid);
    res.json({ notification });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') { res.status(404).json({ error: 'Notification not found' }); return; }
    if (error.message === 'FORBIDDEN') { res.status(403).json({ error: 'Forbidden' }); return; }
    logger.error({ err: error }, 'Failed to mark notification as read:');
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = userId(req);
    if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const result = await NotificationService.markAllNotificationsAsRead(uid);
    res.json({ message: 'All notifications marked as read', count: result.count });
  } catch (error) {
    logger.error({ err: error }, 'Failed to mark all notifications as read:');
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = userId(req);
    if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }
    await NotificationService.deleteUserNotification(req.params.id, uid);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') { res.status(404).json({ error: 'Notification not found' }); return; }
    if (error.message === 'FORBIDDEN') { res.status(403).json({ error: 'Forbidden' }); return; }
    logger.error({ err: error }, 'Failed to delete notification:');
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = userId(req);
    if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const count = await NotificationService.getUnreadCount(uid);
    res.json({ count });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get unread count:');
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};
