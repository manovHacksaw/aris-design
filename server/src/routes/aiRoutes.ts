import { Router } from 'express';
import { generateImage, refinePrompt, generateProposals } from '../controllers/aiController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// Keep it authenticated for brand owners
router.post('/generate-image', authenticateJWT, generateImage);
router.post('/refine-prompt', authenticateJWT, refinePrompt);
router.post('/generate-proposals', authenticateJWT, generateProposals);

export default router;
