import { Router } from 'express';
import { RewardsController } from '../controllers/rewardsController.js';
import { authenticateJWT, authenticateOptional } from '../middlewares/authMiddleware.js';
import { arcjetMiddleware } from '../middlewares/arcjetMiddleware';
import aj from '../lib/arcjet';
import { fixedWindow } from '@arcjet/node';

const router = Router();

// 5 claim operations per 5 minutes per user
const claimRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '5m', max: 5, characteristics: ['userId'] })),
  (req) => ({ userId: req.user?.id ?? req.ip ?? 'anon' }),
);

router.get('/constants', RewardsController.getConstants);
router.get('/contract-info', RewardsController.getContractInfo);
router.get('/pools/:eventId/calculate', authenticateOptional, RewardsController.calculatePoolRequirements);
router.get('/pools/:eventId', authenticateOptional, RewardsController.getPool);
router.post('/pools/:eventId/cancel', authenticateJWT, RewardsController.cancelPool);
router.get('/claims/:eventId', authenticateJWT, RewardsController.getUserClaims);
router.post('/claims/:eventId/confirm', authenticateJWT, claimRateLimit, RewardsController.confirmClaim);
router.get('/me', authenticateJWT, RewardsController.getMyRewards);
router.get('/user/claimable', authenticateJWT, RewardsController.getClaimableRewards);
router.get('/user/history', authenticateJWT, RewardsController.getClaimHistory);
router.post('/claim', authenticateJWT, claimRateLimit, RewardsController.claimReward);
router.post('/confirm-all-claims', authenticateJWT, claimRateLimit, RewardsController.confirmAllClaims);
router.post('/claim-pending', authenticateJWT, claimRateLimit, RewardsController.claimPendingRewards);
router.post('/sync-claims', authenticateJWT, RewardsController.syncClaims);
router.get('/brand/refunds', authenticateJWT, RewardsController.getBrandRefunds);
router.post('/brand/refunds/prepare', authenticateJWT, RewardsController.prepareRefundClaim);
router.get('/brand/claimable', authenticateJWT, RewardsController.getBrandClaimableRewards);

export default router;
