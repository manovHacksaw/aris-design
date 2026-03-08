import { prisma } from '../lib/prisma.js';
import { MilestoneCategory } from '@prisma/client';
import { XpService } from './xpService.js';
import {
  MilestoneCounts,
  MilestoneProgress,
  ClaimedMilestone,
} from '../types/xp.js';

export class MilestoneService {
  /**
   * Get all milestone-related counts for a user
   */
  static async getUserMilestoneCounts(userId: string): Promise<MilestoneCounts> {
    const [
      votesCast,
      topVotesCount,
      loginStreak,
      postsCreated,
      votesReceived,
      top3Count,
      referralCount,
    ] = await Promise.all([
      // Total votes cast by user
      prisma.vote.count({ where: { userId } }),

      // Total top votes (votes on top-3 submissions/proposals in completed events)
      this.countTopVotes(userId),

      // Current login streak
      prisma.userLoginStreak
        .findUnique({ where: { userId } })
        .then((s) => s?.currentStreak ?? 0),

      // Total posts/submissions created
      prisma.submission.count({ where: { userId } }),

      // Total votes received on user's submissions
      this.countVotesReceived(userId),

      // Total top-3 finishes
      this.countTop3Finishes(userId),

      // Total referrals made
      prisma.referral.count({ where: { referrerId: userId } }),
    ]);

    return {
      votesCast,
      topVotes: topVotesCount,
      loginStreak,
      postsCreated,
      votesReceived,
      top3Content: top3Count,
      referralCount,
    };
  }

  /**
   * Count how many "top votes" a user has
   * A top vote = voting on a submission/proposal that ended up in top 3
   */
  private static async countTopVotes(userId: string): Promise<number> {
    // Count votes where the submission has finalRank 1, 2, or 3
    const submissionTopVotes = await prisma.vote.count({
      where: {
        userId,
        submission: {
          finalRank: { in: [1, 2, 3] },
        },
      },
    });

    // Count votes where the proposal has finalRank 1, 2, or 3
    const proposalTopVotes = await prisma.vote.count({
      where: {
        userId,
        proposal: {
          finalRank: { in: [1, 2, 3] },
        },
      },
    });

    return submissionTopVotes + proposalTopVotes;
  }

  /**
   * Count total votes received on all user's submissions
   */
  private static async countVotesReceived(userId: string): Promise<number> {
    const result = await prisma.submission.aggregate({
      where: { userId },
      _sum: { voteCount: true },
    });
    return result._sum.voteCount ?? 0;
  }

  /**
   * Count how many times user's submissions ended in top 3
   */
  private static async countTop3Finishes(userId: string): Promise<number> {
    return prisma.submission.count({
      where: {
        userId,
        finalRank: { in: [1, 2, 3] },
      },
    });
  }

  /**
   * Get milestone progress for all categories
   */
  static async getMilestoneProgress(
    userId: string
  ): Promise<Record<MilestoneCategory, MilestoneProgress>> {
    const counts = await this.getUserMilestoneCounts(userId);

    // Get all claimed milestones
    const claimedMilestones = await prisma.xpMilestoneClaimed.findMany({
      where: { userId },
      select: { category: true, threshold: true },
    });

    // Group claimed thresholds by category
    const claimedByCategory: Record<MilestoneCategory, number[]> = {
      VOTES_CAST: [],
      TOP_VOTES: [],
      LOGIN_STREAK: [],
      POSTS_CREATED: [],
      VOTES_RECEIVED: [],
      TOP_3_CONTENT: [],
      REFERRAL: [],
    };

    for (const claim of claimedMilestones) {
      claimedByCategory[claim.category].push(claim.threshold);
    }

    // Build progress for each category
    const progress: Record<MilestoneCategory, MilestoneProgress> = {} as Record<
      MilestoneCategory,
      MilestoneProgress
    >;

    const categoryCountMap: Record<MilestoneCategory, number> = {
      VOTES_CAST: counts.votesCast,
      TOP_VOTES: counts.topVotes,
      LOGIN_STREAK: counts.loginStreak,
      POSTS_CREATED: counts.postsCreated,
      VOTES_RECEIVED: counts.votesReceived,
      TOP_3_CONTENT: counts.top3Content,
      REFERRAL: counts.referralCount,
    };

    for (const category of Object.values(MilestoneCategory)) {
      const current = categoryCountMap[category];
      const claimed = claimedByCategory[category];
      const next = XpService.getNextMilestone(category, current, claimed);

      let progressPercent = 0;
      if (next) {
        // Calculate progress towards next milestone
        // Find the previous threshold (highest claimed or 0)
        const prevThreshold = Math.max(0, ...claimed.filter((t) => t < next.threshold), 0);
        const range = next.threshold - prevThreshold;
        const progressInRange = current - prevThreshold;
        progressPercent = Math.min(100, Math.floor((progressInRange / range) * 100));
      } else if (claimed.length === XpService.MILESTONES[category].length) {
        // All milestones claimed
        progressPercent = 100;
      }

      progress[category] = {
        category,
        current,
        claimed,
        next,
        progress: progressPercent,
        allTiers: XpService.MILESTONES[category],
      };
    }

    return progress;
  }

  /**
   * Process event completion - check TOP_VOTES, TOP_3_CONTENT, VOTES_RECEIVED milestones
   * This should be called when an event transitions to COMPLETED status
   */
  static async processEventCompletion(eventId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { eventType: true },
    });

    if (!event) {
      console.error(`Event ${eventId} not found for milestone processing`);
      return;
    }

    if (event.eventType === 'post_and_vote') {
      await this.processPostAndVoteEventCompletion(eventId);
    } else {
      await this.processVoteOnlyEventCompletion(eventId);
    }
  }

  /**
   * Process milestone checks for POST_AND_VOTE event completion
   */
  private static async processPostAndVoteEventCompletion(
    eventId: string
  ): Promise<void> {
    // Get all submissions with their final ranks and vote counts
    const submissions = await prisma.submission.findMany({
      where: { eventId },
      select: {
        id: true,
        userId: true,
        finalRank: true,
        voteCount: true,
      },
    });

    // Get all votes for this event
    const votes = await prisma.vote.findMany({
      where: { eventId },
      select: {
        userId: true,
        submissionId: true,
      },
    });

    // Create map of submission -> finalRank
    const submissionRanks = new Map<string, number | null>();
    for (const sub of submissions) {
      submissionRanks.set(sub.id, sub.finalRank);
    }

    // Track unique users to process
    const usersToProcess = new Set<string>();

    // 1. Process TOP_VOTES for voters who voted on top-3 submissions
    const votersOnTop3 = new Set<string>();
    for (const vote of votes) {
      if (vote.submissionId) {
        const rank = submissionRanks.get(vote.submissionId);
        if (rank && rank <= 3) {
          votersOnTop3.add(vote.userId);
        }
      }
    }

    // Check TOP_VOTES milestones for voters on top-3
    for (const voterId of votersOnTop3) {
      usersToProcess.add(voterId);
      try {
        const totalTopVotes = await this.countTopVotes(voterId);
        await XpService.checkAndClaimMilestones(
          voterId,
          MilestoneCategory.TOP_VOTES,
          totalTopVotes
        );
      } catch (error) {
        console.error(`Failed to check TOP_VOTES milestone for user ${voterId}:`, error);
      }
    }

    // 2. Process TOP_3_CONTENT for users with top-3 submissions
    const top3Creators = submissions
      .filter((s) => s.finalRank && s.finalRank <= 3)
      .map((s) => s.userId);

    for (const creatorId of top3Creators) {
      usersToProcess.add(creatorId);
      try {
        const totalTop3 = await this.countTop3Finishes(creatorId);
        await XpService.checkAndClaimMilestones(
          creatorId,
          MilestoneCategory.TOP_3_CONTENT,
          totalTop3
        );
      } catch (error) {
        console.error(`Failed to check TOP_3_CONTENT milestone for user ${creatorId}:`, error);
      }
    }

    // 3. Process VOTES_RECEIVED for all submission creators
    const allCreators = new Set(submissions.map((s) => s.userId));

    for (const creatorId of allCreators) {
      usersToProcess.add(creatorId);
      try {
        const totalVotesReceived = await this.countVotesReceived(creatorId);
        await XpService.checkAndClaimMilestones(
          creatorId,
          MilestoneCategory.VOTES_RECEIVED,
          totalVotesReceived
        );
      } catch (error) {
        console.error(`Failed to check VOTES_RECEIVED milestone for user ${creatorId}:`, error);
      }
    }

    console.log(
      `Processed event completion milestones for ${usersToProcess.size} users in event ${eventId}`
    );
  }

  /**
   * Process milestone checks for VOTE_ONLY event completion
   */
  private static async processVoteOnlyEventCompletion(eventId: string): Promise<void> {
    // Get all proposals with their final ranks
    const proposals = await prisma.proposal.findMany({
      where: { eventId },
      select: {
        id: true,
        finalRank: true,
      },
    });

    // Get all votes for this event
    const votes = await prisma.vote.findMany({
      where: { eventId },
      select: {
        userId: true,
        proposalId: true,
      },
    });

    // Create map of proposal -> finalRank
    const proposalRanks = new Map<string, number | null>();
    for (const prop of proposals) {
      proposalRanks.set(prop.id, prop.finalRank);
    }

    // Process TOP_VOTES for voters who voted on top-3 proposals
    const votersOnTop3 = new Set<string>();
    for (const vote of votes) {
      if (vote.proposalId) {
        const rank = proposalRanks.get(vote.proposalId);
        if (rank && rank <= 3) {
          votersOnTop3.add(vote.userId);
        }
      }
    }

    for (const voterId of votersOnTop3) {
      try {
        const totalTopVotes = await this.countTopVotes(voterId);
        await XpService.checkAndClaimMilestones(
          voterId,
          MilestoneCategory.TOP_VOTES,
          totalTopVotes
        );
      } catch (error) {
        console.error(`Failed to check TOP_VOTES milestone for user ${voterId}:`, error);
      }
    }

    console.log(
      `Processed event completion milestones for ${votersOnTop3.size} voters in vote-only event ${eventId}`
    );
  }

  /**
   * Check all milestone categories for a user (useful for backfill)
   */
  static async checkAllMilestones(userId: string): Promise<ClaimedMilestone[]> {
    const counts = await this.getUserMilestoneCounts(userId);
    const allClaimed: ClaimedMilestone[] = [];

    const categoryCountMap: Record<MilestoneCategory, number> = {
      VOTES_CAST: counts.votesCast,
      TOP_VOTES: counts.topVotes,
      LOGIN_STREAK: counts.loginStreak,
      POSTS_CREATED: counts.postsCreated,
      VOTES_RECEIVED: counts.votesReceived,
      TOP_3_CONTENT: counts.top3Content,
      REFERRAL: counts.referralCount,
    };

    for (const category of Object.values(MilestoneCategory)) {
      try {
        const claimed = await XpService.checkAndClaimMilestones(
          userId,
          category,
          categoryCountMap[category]
        );
        allClaimed.push(...claimed);
      } catch (error) {
        console.error(`Failed to check ${category} milestones for user ${userId}:`, error);
      }
    }

    return allClaimed;
  }
}
