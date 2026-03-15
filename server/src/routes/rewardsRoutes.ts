import { Router } from 'express';
import { RewardsController } from '../controllers/rewardsController.js';
import { authenticateJWT, authenticateOptional } from '../middlewares/authMiddleware.js';

const router = Router();

// ==================== PUBLIC ROUTES ====================

// Get reward system constants
router.get('/constants', RewardsController.getConstants);

// Get smart contract addresses
router.get('/contract-info', RewardsController.getContractInfo);

// ==================== POOL ROUTES (Require Auth) ====================

// Calculate pool requirements for an event
router.get('/pools/:eventId/calculate', authenticateOptional, RewardsController.calculatePoolRequirements);

// Get pool status
router.get('/pools/:eventId', authenticateOptional, RewardsController.getPool);

// Cancel a pool (Brand or Admin)
router.post('/pools/:eventId/cancel', authenticateJWT, RewardsController.cancelPool);

// ==================== CLAIM ROUTES (Require Auth) ====================

// Get user's claims for an event
router.get('/claims/:eventId', authenticateJWT, RewardsController.getUserClaims);

// Confirm claim (Web2 only)
router.post('/claims/:eventId/confirm', authenticateJWT, RewardsController.confirmClaim);

// ==================== USER ROUTES (Require Auth) ====================

// Get user's rewards summary
router.get('/me', authenticateJWT, RewardsController.getMyRewards);

// Get all claimable rewards for the user
router.get('/user/claimable', authenticateJWT, RewardsController.getClaimableRewards);

// Get user's claim history
router.get('/user/history', authenticateJWT, RewardsController.getClaimHistory);

// Claim rewards (Web2 only - simplified)
router.post('/claim', authenticateJWT, RewardsController.claimReward);

// Confirm all claims after on-chain transaction
router.post('/confirm-all-claims', authenticateJWT, RewardsController.confirmAllClaims);

// Sync database claims with on-chain state (when already claimed on-chain)
router.post('/sync-claims', authenticateJWT, RewardsController.syncClaims);

// ==================== BRAND ROUTES (Require Auth) ====================

// Get brand's refundable balance and pool details
router.get('/brand/refunds', authenticateJWT, RewardsController.getBrandRefunds);

// Prepare refund claim for a specific event
router.post('/brand/refunds/prepare', authenticateJWT, RewardsController.prepareRefundClaim);

// Get all claimable rewards for participants in brand's events
router.get('/brand/claimable', authenticateJWT, RewardsController.getBrandClaimableRewards);

export default router;
