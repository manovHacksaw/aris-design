import logger from '../lib/logger';
import { prisma } from '../lib/prisma.js';
import { MilestoneCategory, XpTransactionType, Prisma } from '@prisma/client';
import {
  MilestoneConfig,
  LevelConfig,
  XpStatus,
  FullXpStatus,
  ClaimedMilestone,
  XpGrantResult,
  GrantXpParams,
  XpTransactionSummary,
  ReferralStats,
} from '../types/xp.js';
import { NotificationService } from './notificationService.js';

export class XpService {
  // ==================== MILESTONE CONFIGURATIONS ====================

  static readonly MILESTONES: Record<MilestoneCategory, MilestoneConfig[]> = {
    VOTES_CAST: [
      { threshold: 10, xp: 10 },
      { threshold: 25, xp: 20 },
      { threshold: 75, xp: 50 },
      { threshold: 200, xp: 100 },
      { threshold: 500, xp: 250 },
      { threshold: 1000, xp: 500 },
      { threshold: 2000, xp: 1000 },
    ],
    TOP_VOTES: [
      { threshold: 3, xp: 10 },
      { threshold: 10, xp: 20 },
      { threshold: 25, xp: 50 },
      { threshold: 50, xp: 100 },
      { threshold: 100, xp: 250 },
      { threshold: 200, xp: 500 },
      { threshold: 300, xp: 1000 },
    ],
    LOGIN_STREAK: [
      { threshold: 3, xp: 10 },
      { threshold: 7, xp: 20 },
      { threshold: 15, xp: 50 },
      { threshold: 30, xp: 100 },
      { threshold: 60, xp: 250 },
      { threshold: 100, xp: 500 },
      { threshold: 250, xp: 1000 },
    ],
    POSTS_CREATED: [
      { threshold: 5, xp: 10 },
      { threshold: 10, xp: 20 },
      { threshold: 15, xp: 50 },
      { threshold: 50, xp: 100 },
      { threshold: 100, xp: 250 },
      { threshold: 250, xp: 500 },
      { threshold: 500, xp: 1000 },
    ],
    VOTES_RECEIVED: [
      { threshold: 100, xp: 10 },
      { threshold: 200, xp: 20 },
      { threshold: 500, xp: 50 },
      { threshold: 1000, xp: 100 },
      { threshold: 2500, xp: 250 },
      { threshold: 5000, xp: 500 },
      { threshold: 10000, xp: 1000 },
    ],
    TOP_3_CONTENT: [
      { threshold: 2, xp: 10 },
      { threshold: 5, xp: 20 },
      { threshold: 10, xp: 50 },
      { threshold: 20, xp: 100 },
      { threshold: 40, xp: 250 },
      { threshold: 75, xp: 500 },
      { threshold: 100, xp: 1000 },
    ],
    REFERRAL: [
      { threshold: 5, xp: 10 },
      { threshold: 50, xp: 20 },
      { threshold: 125, xp: 50 },
      { threshold: 250, xp: 100 },
      { threshold: 500, xp: 250 },
      { threshold: 1250, xp: 500 },
      { threshold: 2500, xp: 1000 },
    ],
  };

  static readonly REFERRAL_BASE_XP = 5;

  static readonly LEVEL_THRESHOLDS: LevelConfig[] = [
    { level: 1, xpRequired: 0, multiplier: 1.0 },
    { level: 2, xpRequired: 100, multiplier: 1.2 },
    { level: 3, xpRequired: 500, multiplier: 1.5 },
    { level: 4, xpRequired: 1000, multiplier: 2.0 },
    { level: 5, xpRequired: 2500, multiplier: 2.5 },
    { level: 6, xpRequired: 5000, multiplier: 3.0 },
    { level: 7, xpRequired: 10000, multiplier: 3.5 },
    { level: 8, xpRequired: 15000, multiplier: 4.0 },
  ];

  // ==================== LEVEL CALCULATION ====================

  /**
   * Calculate user level and multiplier from XP
   */
  static calculateLevel(xp: number): { level: number; multiplier: number } {
    // Find the highest level the user qualifies for
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
      // Already at max level
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
      // Max level reached
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
   * This is the core method for all XP grants - always use this to modify XP
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
      // Get current user XP
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const previousXp = user.xp;
      const previousLevel = user.level;

      // Calculate new XP (ensure it doesn't go negative)
      const newXp = Math.max(0, user.xp + amount);

      // Calculate new level
      const { level: newLevel } = this.calculateLevel(newXp);

      // Create transaction record (audit trail)
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

      // Update user XP and level
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

    // Get already claimed milestones for this user+category
    const alreadyClaimed = await prisma.xpMilestoneClaimed.findMany({
      where: { userId, category },
      select: { threshold: true },
    });
    const claimedThresholds = new Set(alreadyClaimed.map((m) => m.threshold));

    // Find all eligible milestones (currentCount >= threshold AND not already claimed)
    const eligibleMilestones = milestones.filter(
      (m) => currentCount >= m.threshold && !claimedThresholds.has(m.threshold)
    );

    // Claim each eligible milestone
    for (const milestone of eligibleMilestones) {
      try {
        await prisma.$transaction(async (tx) => {
          // Try to create claim record (unique constraint prevents duplicates)
          await tx.xpMilestoneClaimed.create({
            data: {
              userId,
              category,
              threshold: milestone.threshold,
              xpAwarded: milestone.xp,
            },
          });

          // Get current user XP
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { xp: true },
          });

          if (!user) throw new Error('User not found');

          const newXp = user.xp + milestone.xp;
          const { level: newLevel } = this.calculateLevel(newXp);

          // Create XP transaction
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

          // Update user
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

        // Send notification (non-blocking)
        NotificationService.createXpMilestoneNotification(userId, {
          category,
          threshold: milestone.threshold,
          xpAwarded: milestone.xp,
        }).catch(err => logger.error('Failed to send milestone notification:', err));
      } catch (error: unknown) {
        // P2002 = unique constraint violation (already claimed by concurrent request)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          // Silently skip - milestone was claimed by concurrent request
          continue;
        }
        // Log other errors but don't fail the entire operation
        logger.error(
          `Failed to claim milestone ${category}:${milestone.threshold}:`,
          error
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

    // Find the first unclaimed milestone that hasn't been reached
    for (const milestone of milestones) {
      if (!claimedSet.has(milestone.threshold) && currentCount < milestone.threshold) {
        return milestone;
      }
    }

    return null;
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

    // Also count milestone XP from referrals
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
   * Useful for fixing any inconsistencies
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
