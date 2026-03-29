import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateJWT, authenticateOptional } from '../middlewares/authMiddleware';
import { AnalyticsService } from '../services/analyticsService';
import { AiService } from '../services/aiService';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * POST /api/analytics/events/:id/view
 * Track an event view
 * Note: Uses optional authentication - tracks views for both logged-in and anonymous users
 */
router.post('/events/:id/view', authenticateOptional, async (req: Request, res: Response) => {
    try {
        const eventId = req.params.id;
        const userId = req.user?.id || null; // null for anonymous users

        await AnalyticsService.trackEventView(eventId, userId);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error tracking event view:', error);
        return res.status(500).json({ error: error.message || 'Failed to track event view' });
    }
});

/**
 * POST /api/analytics/events/:id/share
 * Track an event share
 */
router.post('/events/:id/share', authenticateOptional, async (req: Request, res: Response) => {
    try {
        const eventId = req.params.id;
        const userId = req.user?.id || null;

        await AnalyticsService.trackShare(eventId, userId);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error tracking share:', error);
        return res.status(500).json({ error: error.message || 'Failed to track share' });
    }
});

/**
 * POST /api/analytics/events/:id/click
 * Track a click interaction
 * Body: { target: 'brand' | 'image' | 'vote_button' }
 */
router.post('/events/:id/click', authenticateOptional, async (req: Request, res: Response) => {
    try {
        const eventId = req.params.id;
        const userId = req.user?.id || null;
        const { target } = req.body;

        if (!target || typeof target !== 'string') {
            return res.status(400).json({ error: 'target is required' });
        }

        await AnalyticsService.trackClick(eventId, userId, target);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error tracking click:', error);
        return res.status(500).json({ error: error.message || 'Failed to track click' });
    }
});

/**
 * GET /api/analytics/events/:id
 * Get event analytics
 */
router.get('/events/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const eventId = req.params.id;

        const analytics = await AnalyticsService.getEventAnalytics(eventId);

        return res.status(200).json(analytics);
    } catch (error: any) {
        console.error('Error fetching event analytics:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
    }
});

/**
 * GET /api/analytics/events/:id/detailed
 * Get detailed event analytics with demographics & decision metrics
 */
router.get('/events/:id/detailed', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const eventId = req.params.id;
        const userId = req.user?.id;

        // Verify brand ownership
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { brand: { select: { ownerId: true } } },
        });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.brand.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        const analytics = await AnalyticsService.getDetailedEventAnalytics(eventId);
        return res.status(200).json(analytics);
    } catch (error: any) {
        console.error('Error fetching detailed event analytics:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch detailed analytics' });
    }
});

/**
 * GET /api/analytics/brand/overview
 * Get aggregate brand analytics
 */
router.get('/brand/overview', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        const brand = await prisma.brand.findFirst({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!brand) return res.status(404).json({ error: 'Brand not found' });

        const analytics = await AnalyticsService.getBrandAnalytics(brand.id);
        return res.status(200).json(analytics);
    } catch (error: any) {
        console.error('Error fetching brand analytics:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch brand analytics' });
    }
});

/**
 * POST /api/analytics/events/:id/generate-summary
 * Generate AI summary for a completed event (brand owners only, on-demand)
 * Returns cached summary if already generated.
 */
router.post('/events/:id/generate-summary', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const eventId = req.params.id;
        const userId = req.user?.id;

        // Verify brand ownership
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { status: true, brand: { select: { ownerId: true } } },
        });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.brand.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });
        if (event.status !== 'completed') return res.status(400).json({ error: 'Event must be completed' });

        // Check if summary already exists
        const existing = await prisma.eventAnalytics.findUnique({
            where: { eventId },
            select: { aiSummary: true },
        });
        if (existing?.aiSummary) {
            return res.status(200).json({ aiSummary: existing.aiSummary });
        }

        // Generate
        const summary = await AiService.generateEventSummary(eventId);
        if (!summary) {
            return res.status(500).json({ error: 'Failed to generate summary' });
        }

        return res.status(200).json({ aiSummary: summary });
    } catch (error: any) {
        console.error('Error generating AI summary:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate summary' });
    }
});

/**
 * GET /api/analytics/brand/stats
 * Get brand heading stats
 */
router.get('/brand/stats', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const stats = await AnalyticsService.getBrandStats(userId);
        return res.status(200).json(stats);
    } catch (error: any) {
        console.error('Error fetching brand stats:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch brand stats' });
    }
});

/**
 * GET /api/analytics/brand/timeseries
 * Get brand timeseries data
 * Query params: metric (views|votes|posts), from (optional), to (optional)
 */
router.get('/brand/timeseries', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { metric, from, to } = req.query;

        if (!metric || typeof metric !== 'string') {
            return res.status(400).json({ error: 'metric query param is required' });
        }

        const brand = await prisma.brand.findFirst({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!brand) return res.status(404).json({ error: 'Brand not found' });

        const series = await AnalyticsService.getBrandTimeseries(brand.id, metric, from as string, to as string);
        return res.status(200).json(series);
    } catch (error: any) {
        console.error('Error fetching brand timeseries:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch brand timeseries' });
    }
});

/**
 * GET /api/analytics/events/:id/clicks-breakdown
 * Get click breakdown for a specific event
 */
router.get('/events/:id/clicks-breakdown', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const eventId = req.params.id;
        const breakdown = await AnalyticsService.getEventClicksBreakdown(eventId);
        return res.status(200).json(breakdown);
    } catch (error: any) {
        console.error('Error fetching event clicks breakdown:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch event clicks breakdown' });
    }
});

/**
 * GET /api/analytics/brand/clicks-breakdown
 * Get click breakdown for all brand's events
 */
router.get('/brand/clicks-breakdown', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        const brand = await prisma.brand.findFirst({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!brand) return res.status(404).json({ error: 'Brand not found' });

        const breakdown = await AnalyticsService.getBrandClicksBreakdown(brand.id);
        return res.status(200).json(breakdown);
    } catch (error: any) {
        console.error('Error fetching brand clicks breakdown:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch brand clicks breakdown' });
    }
});

/**
 * POST /api/analytics/brands/:id/view
 * Track a visit to a brand profile
 */
router.post('/brands/:id/view', authenticateOptional, async (req: Request, res: Response) => {
    try {
        const brandId = req.params.id;
        await AnalyticsService.trackBrandView(brandId);
        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error tracking brand view:', error);
        return res.status(500).json({ error: error.message || 'Failed to track brand view' });
    }
});

/**
 * GET /api/analytics/brands/:id/views
 * Get brand profile views
 */
router.get('/brands/:id/views', authenticateOptional, async (req: Request, res: Response) => {
    try {
        const brandId = req.params.id;
        const views = await AnalyticsService.getBrandViews(brandId);
        return res.status(200).json(views);
    } catch (error: any) {
        console.error('Error fetching brand views:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch brand views' });
    }
});

/**
 * GET /api/analytics/events/:id/engagement
 * Get average engagement time for an event
 */
router.get('/events/:id/engagement', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const eventId = req.params.id;
        const engagement = await AnalyticsService.getAverageEngagementTime(eventId);
        return res.status(200).json(engagement);
    } catch (error: any) {
        console.error('Error fetching average engagement time:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch average engagement time' });
    }
});

/**
 * GET /api/analytics/brand/follower-growth
 * Get follower growth over time
 * Query params: from (optional), to (optional), granularity (day|week|month)
 */
router.get('/brand/follower-growth', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { from, to, granularity } = req.query;

        const brand = await prisma.brand.findFirst({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!brand) return res.status(404).json({ error: 'Brand not found' });

        const growth = await AnalyticsService.getFollowerGrowth(brand.id, from as string, to as string, granularity as string || 'day');
        return res.status(200).json(growth);
    } catch (error: any) {
        console.error('Error fetching follower growth:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch follower growth' });
    }
});

/**
 * POST /api/analytics/brand/generate-summary
 * Generate AI summary for a brand based on all its events
 */
router.post('/brand/generate-summary', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        const brand = await prisma.brand.findFirst({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!brand) return res.status(404).json({ error: 'Brand not found' });

        const summary = await AiService.generateBrandSummary(brand.id);
        if (!summary) return res.status(500).json({ error: 'Failed to generate brand summary' });

        return res.status(200).json({ aiSummary: summary });
    } catch (error: any) {
        console.error('Error generating brand summary:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate brand summary' });
    }
});

export default router;
