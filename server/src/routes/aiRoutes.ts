import { Router } from 'express';
import { generateImage, refinePrompt, generateProposals, generateTagline, generateEventDetails, generateBannerPrompts, generateVotingOptionPrompts } from '../controllers/aiController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// Keep it authenticated for brand owners
router.post('/generate-image', authenticateJWT, generateImage);
router.post('/refine-prompt', authenticateJWT, refinePrompt);
router.post('/generate-proposals', authenticateJWT, generateProposals);
router.post('/generate-tagline', authenticateJWT, generateTagline);
router.post('/generate-event-details', authenticateJWT, generateEventDetails);
router.post('/generate-banner-prompts', authenticateJWT, generateBannerPrompts);
router.post('/generate-voting-option-prompts', authenticateJWT, generateVotingOptionPrompts);

export default router;
