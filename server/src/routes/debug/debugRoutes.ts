import { Router } from 'express';
import { checkVotingState, getPendingRewardUsers } from '../../controllers/debug/debugController';
import { authenticateJWT } from '../../middlewares/authMiddleware';
import { authenticateAdmin } from '../../middlewares/adminMiddleware';

const router = Router();

// Debug endpoint to check voting state
router.get('/voting-state/:eventId', authenticateJWT, authenticateAdmin, checkVotingState);

// Development-only endpoint to inspect users with pending/credited reward claims
router.get('/rewards-pending', authenticateJWT, authenticateAdmin, getPendingRewardUsers);

export default router;
