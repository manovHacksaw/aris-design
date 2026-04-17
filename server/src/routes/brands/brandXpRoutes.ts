import { Router } from 'express';
import {
  getBrandLevelStatus,
  getBrandDiscount,
  getBrandLevelHistory,
  recalculateBrandLevel,
  getLevelThresholds,
} from '../../controllers/brands/brandXpController.js';
import { authenticateJWT } from '../../middlewares/authMiddleware.js';

const router = Router();

// GET /api/brand-xp/status - Get brand's level status and progress
router.get('/status', authenticateJWT, getBrandLevelStatus);

// GET /api/brand-xp/discount - Get brand's current discount percentage
router.get('/discount', authenticateJWT, getBrandDiscount);

// GET /api/brand-xp/history - Get brand's level change history
router.get('/history', authenticateJWT, getBrandLevelHistory);

// GET /api/brand-xp/thresholds - Get level thresholds configuration (public)
router.get('/thresholds', getLevelThresholds);

// POST /api/brand-xp/recalculate - Force recalculation of brand level
router.post('/recalculate', authenticateJWT, recalculateBrandLevel);

export default router;
