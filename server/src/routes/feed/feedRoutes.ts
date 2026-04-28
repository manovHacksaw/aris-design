import { Router } from 'express';
import * as feedController from '../../controllers/discovery/feedController';
import { authenticateJWT } from '../../middlewares/authMiddleware';

const router = Router();

/**
 * @route   GET /api/feed/home-events
 * @desc    Get personalized Home event feed
 * @access  Private
 */
router.get('/home-events', authenticateJWT, feedController.getHomeEvents);

/**
 * @route   GET /api/feed/home-content
 * @desc    Get personalized Home content feed
 * @access  Private
 */
router.get('/home-content', authenticateJWT, feedController.getHomeContent);

export default router;
