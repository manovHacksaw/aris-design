import { Request, Response } from 'express';
import { DraftService } from '../../services/drafts/DraftService';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

/** GET /api/drafts */
export const getDrafts = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const drafts = await DraftService.getUserDrafts(userId);
    res.json({ drafts });
};

/** POST /api/drafts */
export const createDraft = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { imageUrl, imageCid, prompt, caption, metadata } = req.body;
    const draft = await DraftService.createDraft(userId, { imageUrl, imageCid, prompt, caption, metadata });
    res.status(201).json({ draft });
};

/** DELETE /api/drafts/:id */
export const deleteDraft = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    try {
        const { id } = req.params;
        await DraftService.deleteDraft(id, userId);
        res.json({ message: 'Deleted' });
    } catch (err) {
        if (err instanceof NotFoundError) { res.status(404).json({ error: err.message }); return; }
        if (err instanceof ForbiddenError) { res.status(403).json({ error: err.message }); return; }
        throw err;
    }
};
