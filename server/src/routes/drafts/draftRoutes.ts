import { Router } from 'express';
import { authenticateJWT } from '../../middlewares/authMiddleware';
import { getDrafts, createDraft, deleteDraft } from '../../controllers/drafts/draftController';

const router = Router();

router.use(authenticateJWT);
router.get('/', getDrafts);
router.post('/', createDraft);
router.delete('/:id', deleteDraft);

export default router;
