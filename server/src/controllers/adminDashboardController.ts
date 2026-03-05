import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (_req: Request, res: Response) => {
    try {
        const [
            totalUsers,
            totalBrands,
            pendingApplications,
            activeSessions,
            totalEvents
        ] = await Promise.all([
            prisma.user.count(),
            prisma.brand.count(),
            prisma.brandApplication.count({ where: { status: 'PENDING' } }),
            prisma.userSession.count({ where: { isActive: true } }),
            prisma.event.count()
        ]);

        res.json({
            totalUsers,
            totalBrands,
            pendingApplications,
            activeSessions,
            totalEvents
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

/**
 * Get user sessions with pagination
 */
export const getUserSessions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
            prisma.userSession.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            displayName: true,
                            avatarUrl: true,
                            role: true
                        }
                    }
                }
            }),
            prisma.userSession.count()
        ]);

        res.json({
            sessions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        res.status(500).json({ error: 'Failed to fetch user sessions' });
    }
};

/**
 * Get user activity logs
 */
export const getUserActivities = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const [activities, total] = await Promise.all([
            prisma.activityLog.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatarUrl: true
                        }
                    },
                    event: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            }),
            prisma.activityLog.count()
        ]);

        res.json({
            activities,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching user activities:', error);
        res.status(500).json({ error: 'Failed to fetch user activities' });
    }
};
