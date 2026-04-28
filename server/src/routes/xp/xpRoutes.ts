import { Router } from 'express';
import {
  loginPing,
  getXpStatus,
  getMilestoneProgress,
  getReferralInfo,
  generateReferralCode,
  getRewardMultiplier,
  getXpTransactions,
} from '../../controllers/xp/xpController';
import { authenticateJWT } from '../../middlewares/authMiddleware';

const router = Router();

// POST /api/xp/login-ping - Record daily login and update streak
router.post('/login-ping', authenticateJWT, loginPing);

// GET /api/xp/me - Get user's full XP status
router.get('/me', authenticateJWT, getXpStatus);

// GET /api/xp/milestones - Get milestone progress for all categories
router.get('/milestones', authenticateJWT, getMilestoneProgress);

// GET /api/xp/multiplier - Get user's reward multiplier
router.get('/multiplier', authenticateJWT, getRewardMultiplier);

// GET /api/xp/transactions - Get XP transaction history
router.get('/transactions', authenticateJWT, getXpTransactions);

// GET /api/xp/referral - Get referral info and stats
router.get('/referral', authenticateJWT, getReferralInfo);

// POST /api/xp/referral/generate - Generate referral code for user
router.post('/referral/generate', authenticateJWT, generateReferralCode);

export default router;
