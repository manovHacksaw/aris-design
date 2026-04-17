import logger from '../lib/logger';
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
        const { search, category, sort, status, type } = req.query;
        const options = {
            search: search ? String(search) : undefined,
            category: category ? String(category) : undefined,
            sort: sort ? String(sort) : undefined,
            status: status ? String(status) : undefined,
            type: type ? String(type) : undefined
        };
        const eventsData = await ExploreService.getExploreEvents((req as any).user?.id, options);
        return res.status(200).json(eventsData);
    } catch (error: any) {
        logger.error('Failed to get explore events:', error);
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
        logger.error('Failed to get explore brands:', error);
        return res.status(500).json({ error: error.message || 'Failed to get explore brands' });
    }
});

/**
 * GET /api/explore/creators
 * Get top ranked creators for the explore page.
 */
router.get('/creators', async (_req: Request, res: Response) => {
    try {
        const creatorsData = await ExploreService.getExploreCreators();
        return res.status(200).json(creatorsData);
    } catch (error: any) {
        logger.error('Failed to get explore creators:', error);
        return res.status(500).json({ error: error.message || 'Failed to get explore creators' });
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
        logger.error('Failed to get explore content:', error);
        return res.status(500).json({ error: error.message || 'Failed to get explore content' });
    }
});

export default router;
