import { Router } from 'express';
import {
  validateClaimToken,
  claimBrand,
} from '../../controllers/brands/brandClaimController';

const router = Router();

/**
 * Public routes for brand claiming (no authentication required)
 */

/**
 * Validate claim token and get brand details
 * GET /api/brands/claim/:token
 *
 * Returns brand information if token is valid and not expired
 * Frontend calls this when user lands on /claim-brand/:token page
 */
router.get('/claim/:token', validateClaimToken);

/**
 * Finalize brand claim
 * POST /api/brands/claim
 * Body: {
 *   claimToken: string,
 *   email: string,
 *   walletAddress: string,
 *   displayName?: string
 * }
 *
 * Creates user account, assigns brand ownership, and completes onboarding
 * Frontend calls this after user authenticates via Google OAuth + DevZero
 */
router.post('/claim', claimBrand);

export default router;
