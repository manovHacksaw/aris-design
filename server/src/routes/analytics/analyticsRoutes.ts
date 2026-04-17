import { Router } from 'express';
import { authenticateJWT, authenticateOptional } from '../../middlewares/authMiddleware';
import * as analytics from '../../controllers/analytics/analyticsController';

const router = Router();

router.post('/events/:id/view',              authenticateOptional, analytics.trackEventView);
router.post('/events/:id/share',             authenticateOptional, analytics.trackShare);
router.post('/events/:id/click',             authenticateOptional, analytics.trackClick);
router.get('/events/:id',                    authenticateJWT,      analytics.getEventAnalytics);
router.get('/events/:id/detailed',           authenticateJWT,      analytics.getDetailedEventAnalytics);
router.get('/events/:id/clicks-breakdown',   authenticateJWT,      analytics.getEventClicksBreakdown);
router.post('/events/:id/generate-summary',  authenticateJWT,      analytics.generateEventSummary);
router.post('/events/:id/insights',          authenticateJWT,      analytics.generateEventInsights);
router.get('/brand/overview',                authenticateJWT,      analytics.getBrandOverview);
router.get('/brand/stats',                   authenticateJWT,      analytics.getBrandStats);
router.get('/brand/timeseries',              authenticateJWT,      analytics.getBrandTimeseries);
router.get('/brand/clicks-breakdown',        authenticateJWT,      analytics.getBrandClicksBreakdown);
router.get('/brand/follower-growth',         authenticateJWT,      analytics.getBrandFollowerGrowth);
router.post('/brand/generate-summary',       authenticateJWT,      analytics.generateBrandSummary);
router.post('/brands/:id/view',              authenticateOptional, analytics.trackBrandView);
router.get('/brands/:id/views',              authenticateOptional, analytics.getBrandViews);

export default router;
