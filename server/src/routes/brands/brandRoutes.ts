import { Router } from 'express';
import { getCurrentBrand, upsertBrandProfile, getBrandMilestones, getPublicBrandProfile } from '../../controllers/brands/brandController';
import { authenticateJWT, authenticateOptional } from '../../middlewares/authMiddleware';

const router = Router();

// Public brand profile (must be before authenticated routes or use distinctive path)
router.get('/public/:identifier', authenticateOptional, getPublicBrandProfile);

// Get current authenticated brand
router.get('/me', authenticateJWT, getCurrentBrand);

// Create or update brand profile
router.post('/', authenticateJWT, upsertBrandProfile);

// Get brand milestones
router.get('/milestones', authenticateJWT, getBrandMilestones);

export default router;
