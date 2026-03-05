import { prisma } from '../lib/prisma';
import { NotificationService } from './notificationService';

/**
 * Brand Subscription Service
 * Handles user subscriptions to brands for notifications
 */
export class SubscriptionService {
    /**
     * Subscribe a user to a brand
     */
    static async subscribe(userId: string, brandId: string): Promise<{ success: boolean; message: string }> {
        try {
            // Check if brand exists
            const brand = await prisma.brand.findUnique({
                where: { id: brandId }
            });

            if (!brand) {
                return { success: false, message: 'Brand not found' };
            }

            // Check if already subscribed
            const existingSubscription = await prisma.brandSubscription.findUnique({
                where: {
                    userId_brandId: {
                        userId,
                        brandId
                    }
                }
            });

            if (existingSubscription) {
                return { success: false, message: 'Already subscribed to this brand' };
            }

            // Create subscription
            await prisma.brandSubscription.create({
                data: {
                    userId,
                    brandId
                }
            });

            // Send notification to brand owner (non-blocking)
            NotificationService.createBrandSubscriptionNotification(brandId, userId)
                .catch(error => {
                    console.error('Failed to send brand subscription notification:', error);
                    // Don't throw - subscription was successful even if notification fails
                });

            return { success: true, message: 'Successfully subscribed to brand' };
        } catch (error) {
            console.error('Error subscribing to brand:', error);
            throw new Error('Failed to subscribe to brand');
        }
    }

    /**
     * Unsubscribe a user from a brand
     */
    static async unsubscribe(userId: string, brandId: string): Promise<{ success: boolean; message: string }> {
        try {
            // Check if subscription exists
            const subscription = await prisma.brandSubscription.findUnique({
                where: {
                    userId_brandId: {
                        userId,
                        brandId
                    }
                }
            });

            if (!subscription) {
                return { success: false, message: 'Not subscribed to this brand' };
            }

            // Delete subscription
            await prisma.brandSubscription.delete({
                where: {
                    id: subscription.id
                }
            });

            return { success: true, message: 'Successfully unsubscribed from brand' };
        } catch (error) {
            console.error('Error unsubscribing from brand:', error);
            throw new Error('Failed to unsubscribe from brand');
        }
    }

    /**
     * Check if a user is subscribed to a brand
     */
    static async isSubscribed(userId: string, brandId: string): Promise<boolean> {
        try {
            const subscription = await prisma.brandSubscription.findUnique({
                where: {
                    userId_brandId: {
                        userId,
                        brandId
                    }
                }
            });

            return !!subscription;
        } catch (error) {
            console.error('Error checking subscription status:', error);
            return false;
        }
    }

    /**
     * Get all brands a user is subscribed to
     */
    static async getUserSubscriptions(userId: string) {
        try {
            const subscriptions = await prisma.brandSubscription.findMany({
                where: { userId },
                include: {
                    brand: {
                        select: {
                            id: true,
                            name: true,
                            logoCid: true,
                            tagline: true,
                            categories: true,
                            _count: {
                                select: {
                                    subscriptions: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    subscribedAt: 'desc'
                }
            });

            return subscriptions.map(sub => ({
                ...sub.brand,
                subscribedAt: sub.subscribedAt
            }));
        } catch (error) {
            console.error('Error fetching user subscriptions:', error);
            throw new Error('Failed to fetch subscriptions');
        }
    }

    /**
     * Get all subscribers for a brand
     */
    static async getBrandSubscribers(brandId: string) {
        try {
            const subscribers = await prisma.brandSubscription.findMany({
                where: { brandId },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatarUrl: true
                        }
                    }
                },
                orderBy: {
                    subscribedAt: 'desc'
                }
            });

            return subscribers.map(sub => ({
                ...sub.user,
                subscribedAt: sub.subscribedAt
            }));
        } catch (error) {
            console.error('Error fetching brand subscribers:', error);
            throw new Error('Failed to fetch subscribers');
        }
    }

    /**
     * Get subscription count for a brand
     */
    static async getSubscriberCount(brandId: string): Promise<number> {
        try {
            const count = await prisma.brandSubscription.count({
                where: { brandId }
            });

            return count;
        } catch (error) {
            console.error('Error getting subscriber count:', error);
            return 0;
        }
    }
}
