import logger from '../../lib/logger';
import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { SubscriptionService } from '../../services/social/subscriptionService';

/**
 * Subscribe to a brand
 * POST /api/subscriptions/:brandId
 */
export const subscribeToBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { brandId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        if (!brandId) {
            res.status(400).json({ success: false, error: 'Brand ID is required' });
            return;
        }

        const result = await SubscriptionService.subscribe(userId, brandId);

        if (!result.success) {
            res.status(400).json(result);
            return;
        }

        res.json(result);
    } catch (error: any) {
        logger.error({ err: error }, 'Error in subscribeToBrand:');
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to subscribe to brand'
        });
    }
};

/**
 * Unsubscribe from a brand
 * DELETE /api/subscriptions/:brandId
 */
export const unsubscribeFromBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { brandId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        if (!brandId) {
            res.status(400).json({ success: false, error: 'Brand ID is required' });
            return;
        }

        const result = await SubscriptionService.unsubscribe(userId, brandId);

        if (!result.success) {
            res.status(400).json(result);
            return;
        }

        res.json(result);
    } catch (error: any) {
        logger.error({ err: error }, 'Error in unsubscribeFromBrand:');
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to unsubscribe from brand'
        });
    }
};

/**
 * Check if user is subscribed to a brand
 * GET /api/subscriptions/:brandId/status
 * Note: Uses optional authentication - works for both logged-in and non-logged-in users
 */
export const getSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { brandId } = req.params;

        if (!brandId) {
            res.status(400).json({ success: false, error: 'Brand ID is required' });
            return;
        }

        // If no user is logged in, return false (not subscribed)
        if (!userId) {
            res.json({
                success: true,
                isSubscribed: false
            });
            return;
        }

        const isSubscribed = await SubscriptionService.isSubscribed(userId, brandId);

        res.json({
            success: true,
            isSubscribed
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in getSubscriptionStatus:');
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check subscription status'
        });
    }
};

/**
 * Get all brands user is subscribed to
 * GET /api/subscriptions/my-subscriptions
 */
export const getMySubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        const subscriptions = await SubscriptionService.getUserSubscriptions(userId);

        res.json({
            success: true,
            subscriptions
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in getMySubscriptions:');
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch subscriptions'
        });
    }
};

/**
 * Get all subscribers for a brand (brand owners only)
 * GET /api/subscriptions/brand/:brandId/subscribers
 */
export const getBrandSubscribers = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { brandId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        if (!brandId) {
            res.status(400).json({ success: false, error: 'Brand ID is required' });
            return;
        }

        // Verify user owns this brand
        const brand = await prisma.brand.findFirst({
            where: {
                id: brandId,
                ownerId: userId
            }
        });

        if (!brand) {
            res.status(403).json({
                success: false,
                error: 'You do not have permission to view subscribers for this brand'
            });
            return;
        }

        const subscribers = await SubscriptionService.getBrandSubscribers(brandId);

        res.json({
            success: true,
            subscribers
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in getBrandSubscribers:');
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch subscribers'
        });
    }
};

/**
 * Get subscriber count for a brand
 * GET /api/subscriptions/brand/:brandId/count
 */
export const getSubscriberCount = async (req: Request, res: Response): Promise<void> => {
    try {
        const { brandId } = req.params;

        if (!brandId) {
            res.status(400).json({ success: false, error: 'Brand ID is required' });
            return;
        }

        const count = await SubscriptionService.getSubscriberCount(brandId);

        res.json({
            success: true,
            count
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in getSubscriberCount:');
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get subscriber count'
        });
    }
};
