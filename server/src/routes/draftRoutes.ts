import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { getDrafts, createDraft, deleteDraft } from '../controllers/draftController.js';

const router = Router();

router.use(authenticateJWT);
router.get('/', getDrafts);
router.post('/', createDraft);
router.delete('/:id', deleteDraft);

export default router;
