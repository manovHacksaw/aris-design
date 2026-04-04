import { Router, Request, Response } from 'express';
import { ExploreService } from '../services/exploreService.js';
import { authenticateOptional } from '../middlewares/authMiddleware.js';

const router = Router();

/**
 * GET /api/explore/events
 * Get grouped events data for the explore page (Trending, Closed, Domain-categorized).
 */
router.get('/events', authenticateOptional, async (req: Request, res: Response) => {
    try {
        const eventsData = await ExploreService.getExploreEvents((req as any).user?.id);
        return res.status(200).json(eventsData);
    } catch (error: any) {
        console.error('Failed to get explore events:', error);
        return res.status(500).json({ error: error.message || 'Failed to get explore events' });
    }
});

/**
 * GET /api/explore/brands
 * Get top brands ranked by their total live active reward size.
 */
router.get('/brands', async (_req: Request, res: Response) => {
    try {
        const brandsData = await ExploreService.getExploreBrands();
        return res.status(200).json(brandsData);
    } catch (error: any) {
        console.error('Failed to get explore brands:', error);
        return res.status(500).json({ error: error.message || 'Failed to get explore brands' });
    }
});

/**
 * GET /api/explore/content
 * Get past top voted submissions to form a content mosaic.
 */
router.get('/content', authenticateOptional, async (req: Request, res: Response) => {
    try {
        const contentData = await ExploreService.getExploreContent((req as any).user?.id);
        return res.status(200).json(contentData);
    } catch (error: any) {
        console.error('Failed to get explore content:', error);
        return res.status(500).json({ error: error.message || 'Failed to get explore content' });
    }
});

export default router;
