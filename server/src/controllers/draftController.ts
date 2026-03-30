import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

/** GET /api/drafts */
export const getDrafts = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const drafts = await prisma.userDraft.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ drafts });
};

/** POST /api/drafts */
export const createDraft = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { imageUrl, imageCid, prompt, caption, metadata } = req.body;
    const draft = await prisma.userDraft.create({
        data: { userId, imageUrl, imageCid, prompt, caption, metadata },
    });
    res.status(201).json({ draft });
};

/** DELETE /api/drafts/:id */
export const deleteDraft = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { id } = req.params;
    const draft = await prisma.userDraft.findUnique({ where: { id } });
    if (!draft) { res.status(404).json({ error: 'Not found' }); return; }
    if (draft.userId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    await prisma.userDraft.delete({ where: { id } });
    res.json({ message: 'Deleted' });
};
