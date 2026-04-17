import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';

export class DraftService {
  static async getUserDrafts(userId: string) {
    return prisma.userDraft.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createDraft(
    userId: string,
    data: {
      imageUrl?: string;
      imageCid?: string;
      prompt?: string;
      caption?: string;
      metadata?: unknown;
    },
  ) {
    return prisma.userDraft.create({
      data: { userId, ...data },
    });
  }

  static async deleteDraft(id: string, userId: string) {
    const draft = await prisma.userDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundError('Draft not found');
    if (draft.userId !== userId) throw new ForbiddenError('Forbidden');
    await prisma.userDraft.delete({ where: { id } });
  }
}
