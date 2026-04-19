import logger from '../../lib/logger.js';
import { Request, Response } from 'express';
import { AdminDashboardService } from '../../services/admin/AdminDashboardService.js';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (_req: Request, res: Response) => {
    try {
        const stats = await AdminDashboardService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        logger.error({ err: error }, 'Error fetching dashboard stats:');
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};


/**
 * Get user activity logs
 */
export const getUserActivities = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await AdminDashboardService.getUserActivities(page, limit);
        res.json(result);
    } catch (error) {
        logger.error({ err: error }, 'Error fetching user activities:');
        res.status(500).json({ error: 'Failed to fetch user activities' });
    }
};
