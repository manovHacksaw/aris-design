import { Router } from 'express';
import { checkVotingState } from '../controllers/debugController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = Router();

// Debug endpoint to check voting state
router.get('/voting-state/:eventId', authenticateJWT, checkVotingState);

export default router;
