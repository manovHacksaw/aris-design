import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

export class EventRankingService {


  // ==================== MILESTONE 3: RANKING & TRANSITIONS ====================

  /**
   * Compute and assign rankings for submissions or proposals
   * Sort by voteCount DESC, then createdAt ASC (tie-breaker)
   */
  // When tx is provided, all operations run inside the caller's transaction (rankings + status update are atomic).
  // When omitted, wraps updates in its own transaction.
  static async computeRankings(eventId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx ?? prisma;

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        submissions: {
          include: {
            _count: { select: { votes: true } },
          },
        },
        proposals: {
          include: {
            _count: { select: { votes: true } },
          },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const lastVotes = await db.vote.groupBy({
      by: ['submissionId', 'proposalId'],
      where: { eventId },
      _max: { createdAt: true },
    });

    const lastVoteMap = new Map<string, Date>();
    lastVotes.forEach((lv) => {
      const id = lv.submissionId || lv.proposalId;
      if (id && lv._max.createdAt) {
        lastVoteMap.set(id, lv._max.createdAt);
      }
    });

    const doUpdates = async (client: Prisma.TransactionClient) => {
      if (event.eventType === 'post_and_vote') {
        const ranked = event.submissions
          .map((s) => ({
            id: s.id,
            voteCount: s._count.votes,
            lastVoteAt: lastVoteMap.get(s.id) || s.createdAt,
          }))
          .sort((a, b) => {
            if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
            // Tie-breaker: whichever reached the count first wins
            return a.lastVoteAt.getTime() - b.lastVoteAt.getTime();
          });

        for (let i = 0; i < ranked.length; i++) {
          await client.submission.update({
            where: { id: ranked[i].id },
            data: { finalRank: i + 1, voteCount: ranked[i].voteCount },
          });
        }
      } else if (event.eventType === 'vote_only') {
        const ranked = event.proposals
          .map((p) => ({
            id: p.id,
            voteCount: p._count.votes,
            lastVoteAt: lastVoteMap.get(p.id) || p.createdAt,
          }))
          .sort((a, b) => {
            if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
            return a.lastVoteAt.getTime() - b.lastVoteAt.getTime();
          });

        for (let i = 0; i < ranked.length; i++) {
          await client.proposal.update({
            where: { id: ranked[i].id },
            data: { finalRank: i + 1, voteCount: ranked[i].voteCount },
          });
        }
      }
    };

    if (tx) {
      await doUpdates(tx);
    } else {
      await prisma.$transaction(doUpdates);
    }
  }
}
