import { prisma } from '../../lib/prisma';
import logger from '../../lib/logger';

export class AdminDashboardService {
    /**
     * Get dashboard statistics
     */
    static async getDashboardStats() {
        try {
            const [
                totalUsers,
                totalBrands,
                pendingApplications,
                totalEvents
            ] = await Promise.all([
                prisma.user.count(),
                prisma.brand.count(),
                prisma.brandApplication.count({ where: { status: 'PENDING' } }),
                prisma.event.count()
            ]);

            return {
                totalUsers,
                totalBrands,
                pendingApplications,
                totalEvents
            };
        } catch (error) {
            logger.error({ err: error }, 'AdminDashboardService.getDashboardStats failed:');
            throw error;
        }
    }

    /**
     * Get user activity logs with pagination
     */
    static async getUserActivities(page: number = 1, limit: number = 50) {
        try {
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

            return {
                activities,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error({ err: error }, 'AdminDashboardService.getUserActivities failed:');
            throw error;
        }
    }
}
