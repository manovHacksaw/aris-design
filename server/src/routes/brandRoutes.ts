import { Router } from 'express';
import { getCurrentBrand, upsertBrandProfile, getBrandMilestones } from '../controllers/brandController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// Get current authenticated brand
router.get('/me', authenticateJWT, getCurrentBrand);

// Create or update brand profile
router.post('/', authenticateJWT, upsertBrandProfile);

// Get brand milestones
router.get('/milestones', authenticateJWT, getBrandMilestones);

export default router;
