/**
 * Trust Score Service
 *
 * Updates each user's trustScore after an event completes,
 * based on whether they voted for the winning content.
 *
 * Uses Exponential Moving Average (EMA):
 *   newTrustScore = currentTrustScore * (1 - ALPHA) + alignment * ALPHA
 *
 * where alignment = 1.0 if user voted for the winner, 0.0 otherwise.
 */

import { prisma } from '../lib/prisma.js';

const ALPHA = 0.1; // Weight for the new event outcome

export class TrustService {
  /**
   * Update trust scores for all voters in a completed event.
   *
   * Must be called AFTER rankings have been computed (finalRank is set).
   */
  static async updateTrustScores(eventId: string): Promise<void> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, eventType: true },
      });

      if (!event) {
        console.error(`[TrustService] Event not found: ${eventId}`);
        return;
      }

      // Determine the winning content ID (finalRank === 1)
      let winningContentId: string | null = null;

      if (event.eventType === 'vote_only') {
        const winner = await prisma.proposal.findFirst({
          where: { eventId, finalRank: 1 },
          select: { id: true },
        });
        winningContentId = winner?.id ?? null;
      } else {
        const winner = await prisma.submission.findFirst({
          where: { eventId, finalRank: 1 },
          select: { id: true },
        });
        winningContentId = winner?.id ?? null;
      }

      if (!winningContentId) {
        console.warn(`[TrustService] No winner found for event ${eventId}, skipping trust update`);
        return;
      }

      // Fetch all votes for this event with user's current trust score
      const votes = await prisma.vote.findMany({
        where: { eventId },
        select: {
          userId: true,
          submissionId: true,
          proposalId: true,
          user: { select: { trustScore: true } },
        },
      });

      if (votes.length === 0) return;

      // Deduplicate by userId (in case of multiple votes, take the first)
      const userVoteMap = new Map<string, { currentTrustScore: number; votedForWinner: boolean }>();

      for (const vote of votes) {
        if (userVoteMap.has(vote.userId)) continue;

        const votedContentId = event.eventType === 'vote_only'
          ? vote.proposalId
          : vote.submissionId;

        userVoteMap.set(vote.userId, {
          currentTrustScore: vote.user.trustScore,
          votedForWinner: votedContentId === winningContentId,
        });
      }

      // Batch update trust scores
      const updates = Array.from(userVoteMap.entries()).map(([userId, { currentTrustScore, votedForWinner }]) => {
        const alignment = votedForWinner ? 1.0 : 0.0;
        const newTrustScore = currentTrustScore * (1 - ALPHA) + alignment * ALPHA;

        return prisma.user.update({
          where: { id: userId },
          data: { trustScore: newTrustScore },
        });
      });

      await prisma.$transaction(updates);

      console.log(`✅ [TrustService] Updated trust scores for ${updates.length} users in event ${eventId}`);
    } catch (error) {
      console.error(`[TrustService] Failed to update trust scores for event ${eventId}:`, error);
    }
  }
}
