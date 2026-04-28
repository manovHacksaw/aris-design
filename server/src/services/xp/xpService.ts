import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { MilestoneCategory, XpTransactionType, Prisma } from '@prisma/client';
import {
  MilestoneConfig,
  XpStatus,
  FullXpStatus,
  ClaimedMilestone,
  XpGrantResult,
  GrantXpParams,
  XpTransactionSummary,
  ReferralStats,
  MilestoneCounts,
  MilestoneProgress,
} from '../../types/xp';
import { NotificationService } from '../social/notificationService';
import {
  MILESTONE_CONFIGS,
  USER_LEVEL_THRESHOLDS,
  REFERRAL_BASE_XP,
} from '../../config/xpConfig';

export class XpService {
  // ==================== CONFIGURATIONS (Internal) ====================

  static readonly MILESTONES = MILESTONE_CONFIGS;
  static readonly LEVEL_THRESHOLDS = USER_LEVEL_THRESHOLDS;
  static readonly REFERRAL_BASE_XP = REFERRAL_BASE_XP;

  // ==================== LEVEL CALCULATION ====================

  /**
   * Calculate user level and multiplier from XP
   */
  static calculateLevel(xp: number): { level: number; multiplier: number } {
    let result = { level: 1, multiplier: 1.0 };

    for (const config of this.LEVEL_THRESHOLDS) {
      if (xp >= config.xpRequired) {
        result = { level: config.level, multiplier: config.multiplier };
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Get XP required for next level
   */
  static getXpToNextLevel(currentXp: number, currentLevel: number): number {
    const nextLevelConfig = this.LEVEL_THRESHOLDS.find(
      (c) => c.level === currentLevel + 1
    );

    if (!nextLevelConfig) {
      return 0;
    }

    return nextLevelConfig.xpRequired - currentXp;
  }

  /**
   * Get level progress information
   */
  static getLevelProgress(
    currentXp: number,
    currentLevel: number
  ): { current: number; required: number; percentage: number } {
    const currentLevelConfig = this.LEVEL_THRESHOLDS.find(
      (c) => c.level === currentLevel
    );
    const nextLevelConfig = this.LEVEL_THRESHOLDS.find(
      (c) => c.level === currentLevel + 1
    );

    if (!nextLevelConfig || !currentLevelConfig) {
      return { current: currentXp, required: currentXp, percentage: 100 };
    }

    const xpIntoLevel = currentXp - currentLevelConfig.xpRequired;
    const xpForLevel = nextLevelConfig.xpRequired - currentLevelConfig.xpRequired;
    const percentage = Math.floor((xpIntoLevel / xpForLevel) * 100);

    return {
      current: xpIntoLevel,
      required: xpForLevel,
      percentage: Math.min(percentage, 100),
    };
  }

  // ==================== CORE XP OPERATIONS ====================

  /**
   * Grant XP to a user with transaction logging
   */
  static async grantXp(params: GrantXpParams): Promise<XpGrantResult> {
    const { userId, amount, type, category, threshold, description, metadata } =
      params;

    if (amount === 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true },
      });
      if (!user) throw new Error('User not found');
      return {
        newXp: user.xp,
        newLevel: user.level,
        previousXp: user.xp,
        previousLevel: user.level,
        leveledUp: false,
      };
    }

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const previousXp = user.xp;
      const previousLevel = user.level;
      const newXp = Math.max(0, user.xp + amount);
      const { level: newLevel } = this.calculateLevel(newXp);

      await tx.xpTransaction.create({
        data: {
          userId,
          amount,
          type,
          category,
          threshold,
          description,
          metadata: metadata as Prisma.InputJsonValue,
          balanceAfter: newXp,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel },
      });

      return {
        newXp,
        newLevel,
        previousXp,
        previousLevel,
        leveledUp: newLevel > previousLevel,
      };
    });
  }

  // ==================== MILESTONE OPERATIONS ====================

  /**
   * Check and claim all eligible milestones for a category
   * This is idempotent - safe to call multiple times
   */
  static async checkAndClaimMilestones(
    userId: string,
    category: MilestoneCategory,
    currentCount: number
  ): Promise<ClaimedMilestone[]> {
    const milestones = this.MILESTONES[category];
    const claimedMilestones: ClaimedMilestone[] = [];

    const alreadyClaimed = await prisma.xpMilestoneClaimed.findMany({
      where: { userId, category },
      select: { threshold: true },
    });
    const claimedThresholds = new Set(alreadyClaimed.map((m) => m.threshold));

    const eligibleMilestones = milestones.filter(
      (m) => currentCount >= m.threshold && !claimedThresholds.has(m.threshold)
    );

    for (const milestone of eligibleMilestones) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.xpMilestoneClaimed.create({
            data: {
              userId,
              category,
              threshold: milestone.threshold,
              xpAwarded: milestone.xp,
            },
          });

          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { xp: true },
          });

          if (!user) throw new Error('User not found');

          const newXp = user.xp + milestone.xp;
          const { level: newLevel } = this.calculateLevel(newXp);

          await tx.xpTransaction.create({
            data: {
              userId,
              amount: milestone.xp,
              type: XpTransactionType.MILESTONE_REWARD,
              category,
              threshold: milestone.threshold,
              description: `${category} milestone: reached ${milestone.threshold}`,
              balanceAfter: newXp,
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: { xp: newXp, level: newLevel },
          });
        });

        claimedMilestones.push({
          category,
          threshold: milestone.threshold,
          xpAwarded: milestone.xp,
          claimedAt: new Date(),
        });

        NotificationService.createXpMilestoneNotification(userId, {
          category,
          threshold: milestone.threshold,
          xpAwarded: milestone.xp,
        }).catch(err => logger.error({ err }, 'Failed to send milestone notification:'));
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        logger.error(
            { err: error },
            `Failed to claim milestone ${category}:${milestone.threshold}:`
        );
      }
    }

    return claimedMilestones;
  }

  /**
   * Get the next milestone for a category
   */
  static getNextMilestone(
    category: MilestoneCategory,
    currentCount: number,
    claimedThresholds: number[]
  ): MilestoneConfig | null {
    const milestones = this.MILESTONES[category];
    const claimedSet = new Set(claimedThresholds);

    for (const milestone of milestones) {
      if (!claimedSet.has(milestone.threshold) && currentCount < milestone.threshold) {
        return milestone;
      }
    }

    return null;
  }

  // ==================== ABSORBED MILESTONE SERVICE LOGIC ====================

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
      prisma.vote.count({ where: { userId } }),
      this.countTopVotes(userId),
      prisma.userLoginStreak
        .findUnique({ where: { userId } })
        .then((s) => s?.currentStreak ?? 0),
      prisma.submission.count({ where: { userId } }),
      this.countVotesReceived(userId),
      this.countTop3Finishes(userId),
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

  private static async countTopVotes(userId: string): Promise<number> {
    const submissionTopVotes = await prisma.vote.count({
      where: {
        userId,
        submission: { finalRank: { in: [1, 2, 3] } },
      },
    });

    const proposalTopVotes = await prisma.vote.count({
      where: {
        userId,
        proposal: { finalRank: { in: [1, 2, 3] } },
      },
    });

    return submissionTopVotes + proposalTopVotes;
  }

  private static async countVotesReceived(userId: string): Promise<number> {
    const result = await prisma.submission.aggregate({
      where: { userId },
      _sum: { voteCount: true },
    });
    return result._sum.voteCount ?? 0;
  }

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
    const claimedMilestones = await prisma.xpMilestoneClaimed.findMany({
      where: { userId },
      select: { category: true, threshold: true },
    });

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

    const progress: Record<MilestoneCategory, MilestoneProgress> = {} as any;

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
      const next = this.getNextMilestone(category, current, claimed);

      let progressPercent = 0;
      if (next) {
        const prevThreshold = Math.max(0, ...claimed.filter((t) => t < next.threshold), 0);
        const range = next.threshold - prevThreshold;
        const progressInRange = current - prevThreshold;
        progressPercent = Math.min(100, Math.floor((progressInRange / range) * 100));
      } else if (claimed.length === this.MILESTONES[category].length) {
        progressPercent = 100;
      }

      progress[category] = {
        category,
        current,
        claimed,
        next,
        progress: progressPercent,
        allTiers: this.MILESTONES[category],
      };
    }

    return progress;
  }

  /**
   * Process event completion milestones
   */
  static async processEventCompletion(eventId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { eventType: true },
    });

    if (!event) {
      logger.error(`Event ${eventId} not found for milestone processing`);
      return;
    }

    if (event.eventType === 'post_and_vote') {
      await this.processPostAndVoteEventCompletion(eventId);
    } else {
      await this.processVoteOnlyEventCompletion(eventId);
    }
  }

  private static async processPostAndVoteEventCompletion(eventId: string): Promise<void> {
    const submissions = await prisma.submission.findMany({
      where: { eventId },
      select: { id: true, userId: true, finalRank: true, voteCount: true },
    });

    const votes = await prisma.vote.findMany({
      where: { eventId },
      select: { userId: true, submissionId: true },
    });

    const submissionRanks = new Map<string, number | null>();
    for (const sub of submissions) submissionRanks.set(sub.id, sub.finalRank);

    const usersToProcess = new Set<string>();

    // 1. TOP_VOTES
    const votersOnTop3 = new Set<string>();
    for (const vote of votes) {
      if (vote.submissionId) {
        const rank = submissionRanks.get(vote.submissionId);
        if (rank && rank <= 3) votersOnTop3.add(vote.userId);
      }
    }

    for (const voterId of votersOnTop3) {
      usersToProcess.add(voterId);
      try {
        const totalTopVotes = await this.countTopVotes(voterId);
        await this.checkAndClaimMilestones(voterId, MilestoneCategory.TOP_VOTES, totalTopVotes);
      } catch (error) {
        logger.error({ err: error }, `Failed to check TOP_VOTES milestone for user ${voterId}`);
      }
    }

    // 2. TOP_3_CONTENT
    const top3Creators = submissions.filter((s) => s.finalRank && s.finalRank <= 3).map((s) => s.userId);
    for (const creatorId of top3Creators) {
      usersToProcess.add(creatorId);
      try {
        const totalTop3 = await this.countTop3Finishes(creatorId);
        await this.checkAndClaimMilestones(creatorId, MilestoneCategory.TOP_3_CONTENT, totalTop3);
      } catch (error) {
        logger.error({ err: error }, `Failed to check TOP_3_CONTENT milestone for user ${creatorId}`);
      }
    }

    // 3. VOTES_RECEIVED
    const allCreators = new Set(submissions.map((s) => s.userId));
    for (const creatorId of allCreators) {
      usersToProcess.add(creatorId);
      try {
        const totalVotesReceived = await this.countVotesReceived(creatorId);
        await this.checkAndClaimMilestones(creatorId, MilestoneCategory.VOTES_RECEIVED, totalVotesReceived);
      } catch (error) {
        logger.error({ err: error }, `Failed to check VOTES_RECEIVED milestone for user ${creatorId}`);
      }
    }
  }

  private static async processVoteOnlyEventCompletion(eventId: string): Promise<void> {
    const proposals = await prisma.proposal.findMany({
      where: { eventId },
      select: { id: true, finalRank: true },
    });

    const votes = await prisma.vote.findMany({
      where: { eventId },
      select: { userId: true, proposalId: true },
    });

    const proposalRanks = new Map<string, number | null>();
    for (const prop of proposals) proposalRanks.set(prop.id, prop.finalRank);

    const votersOnTop3 = new Set<string>();
    for (const vote of votes) {
      if (vote.proposalId) {
        const rank = proposalRanks.get(vote.proposalId);
        if (rank && rank <= 3) votersOnTop3.add(vote.userId);
      }
    }

    for (const voterId of votersOnTop3) {
      try {
        const totalTopVotes = await this.countTopVotes(voterId);
        await this.checkAndClaimMilestones(voterId, MilestoneCategory.TOP_VOTES, totalTopVotes);
      } catch (error) {
        logger.error({ err: error }, `Failed to check TOP_VOTES milestone for user ${voterId}`);
      }
    }
  }

  /**
   * Check all milestone categories for a user
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
        const claimed = await this.checkAndClaimMilestones(userId, category, categoryCountMap[category]);
        allClaimed.push(...claimed);
      } catch (error) {
        logger.error({ err: error }, `Failed to check ${category} milestones for user ${userId}`);
      }
    }

    return allClaimed;
  }

  // ==================== USER STATUS OPERATIONS ====================

  /**
   * Get user's XP status
   */
  static async getXpStatus(userId: string): Promise<XpStatus> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { multiplier } = this.calculateLevel(user.xp);
    const xpToNextLevel = this.getXpToNextLevel(user.xp, user.level);
    const levelProgress = this.getLevelProgress(user.xp, user.level);

    return {
      xp: user.xp,
      level: user.level,
      multiplier,
      xpToNextLevel,
      levelProgress,
    };
  }

  /**
   * Get user's full XP status including streak and referral info
   */
  static async getFullXpStatus(userId: string): Promise<FullXpStatus> {
    const [user, loginStreak, referralStats, recentTransactions] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { xp: true, level: true, referralCode: true },
        }),
        prisma.userLoginStreak.findUnique({
          where: { userId },
        }),
        this.getReferralStats(userId),
        prisma.xpTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            amount: true,
            type: true,
            category: true,
            threshold: true,
            description: true,
            createdAt: true,
          },
        }),
      ]);

    if (!user) {
      throw new Error('User not found');
    }

    const { multiplier } = this.calculateLevel(user.xp);
    const xpToNextLevel = this.getXpToNextLevel(user.xp, user.level);
    const levelProgress = this.getLevelProgress(user.xp, user.level);

    const transactionSummaries: XpTransactionSummary[] = recentTransactions.map(
      (t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        category: t.category,
        threshold: t.threshold,
        description: t.description,
        createdAt: t.createdAt,
      })
    );

    return {
      xp: user.xp,
      level: user.level,
      multiplier,
      xpToNextLevel,
      levelProgress,
      streak: loginStreak
        ? {
          current: loginStreak.currentStreak,
          longest: loginStreak.longestStreak,
          lastLoginDate: loginStreak.lastLoginDate,
        }
        : null,
      referralStats: {
        ...referralStats,
        referralCode: user.referralCode,
      },
      recentTransactions: transactionSummaries,
    };
  }

  /**
   * Get user's reward multiplier
   */
  static async getUserRewardMultiplier(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { multiplier } = this.calculateLevel(user.xp);
    return multiplier;
  }

  /**
   * Get referral stats for a user
   */
  static async getReferralStats(userId: string): Promise<ReferralStats> {
    const [referralCount, totalXpFromReferrals, user] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: userId },
      }),
      prisma.referral.aggregate({
        where: { referrerId: userId },
        _sum: { xpAwarded: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      }),
    ]);

    const milestoneClaims = await prisma.xpMilestoneClaimed.findMany({
      where: {
        userId,
        category: MilestoneCategory.REFERRAL,
      },
      select: { xpAwarded: true },
    });

    const milestoneXp = milestoneClaims.reduce(
      (sum, claim) => sum + claim.xpAwarded,
      0
    );

    return {
      totalReferrals: referralCount,
      xpFromReferrals: (totalXpFromReferrals._sum.xpAwarded || 0) + milestoneXp,
      referralCode: user?.referralCode || null,
    };
  }

  /**
   * Recalculate user level from their current XP
   */
  static async recalculateUserLevel(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { level } = this.calculateLevel(user.xp);

    await prisma.user.update({
      where: { id: userId },
      data: { level },
    });
  }
}
