import { prisma } from '../../lib/prisma';
import {
  BrandLevelConfig,
  BrandLevelStatus,
  BrandLevelUpdateResult,
  BrandMetrics,
} from '../../types/brandXp';

export class BrandXpService {
  // ==================== LEVEL CONFIGURATIONS ====================

  /**
   * Brand level thresholds - ALL three criteria must be met for each level
   */
  static readonly LEVEL_THRESHOLDS: BrandLevelConfig[] = [
    {
      level: 1,
      usdcGiven: 10000,
      eventsCreated: 3,
      uniqueParticipants: 1000,
      discountPercent: 1,
    },
    {
      level: 2,
      usdcGiven: 25000,
      eventsCreated: 6,
      uniqueParticipants: 2000,
      discountPercent: 2,
    },
    {
      level: 3,
      usdcGiven: 50000,
      eventsCreated: 9,
      uniqueParticipants: 5000,
      discountPercent: 3,
    },
    {
      level: 4,
      usdcGiven: 100000,
      eventsCreated: 20,
      uniqueParticipants: 10000,
      discountPercent: 5,
    },
    {
      level: 5,
      usdcGiven: 250000,
      eventsCreated: 50,
      uniqueParticipants: 25000,
      discountPercent: 10,
    },
    {
      level: 6,
      usdcGiven: 500000,
      eventsCreated: 75,
      uniqueParticipants: 50000,
      discountPercent: 15,
    },
    {
      level: 7,
      usdcGiven: 1000000,
      eventsCreated: 100,
      uniqueParticipants: 100000,
      discountPercent: 20,
    },
  ];

  // ==================== LEVEL CALCULATION (AND LOGIC) ====================

  /**
   * Calculate brand level using AND logic:
   * Brand level = highest level where ALL three thresholds are met
   */
  static calculateLevel(
    usdcGiven: number,
    eventsCreated: number,
    uniqueParticipants: number
  ): { level: number; discountPercent: number } {
    let achievedLevel = 0;
    let discountPercent = 0;

    for (const config of this.LEVEL_THRESHOLDS) {
      if (
        usdcGiven >= config.usdcGiven &&
        eventsCreated >= config.eventsCreated &&
        uniqueParticipants >= config.uniqueParticipants
      ) {
        achievedLevel = config.level;
        discountPercent = config.discountPercent;
      } else {
        break; // Stop at first unmet threshold
      }
    }

    return { level: achievedLevel, discountPercent };
  }

  // ==================== METRICS CALCULATION ====================

  /**
   * Calculate total USDC given as rewards for completed events
   */
  static async calculateTotalUsdcGiven(brandId: string): Promise<number> {
    const result = await prisma.event.aggregate({
      where: {
        brandId,
        status: 'completed',
        isDeleted: false,
      },
      _sum: {
        baseReward: true,
        topReward: true,
      },
    });

    return (result._sum.baseReward || 0) + (result._sum.topReward || 0);
  }

  /**
   * Count events created (non-draft, non-deleted events)
   */
  static async countEventsCreated(brandId: string): Promise<number> {
    return prisma.event.count({
      where: {
        brandId,
        isDeleted: false,
        status: { not: 'draft' },
      },
    });
  }

  /**
   * Count unique participants across all brand's completed events
   * Participants = users who voted OR submitted
   */
  static async countUniqueParticipants(brandId: string): Promise<number> {
    // Get all completed event IDs for this brand
    const events = await prisma.event.findMany({
      where: {
        brandId,
        status: 'completed',
        isDeleted: false,
      },
      select: { id: true },
    });

    const eventIds = events.map((e) => e.id);

    if (eventIds.length === 0) return 0;

    // Count unique users from votes
    const voterIds = await prisma.vote.findMany({
      where: { eventId: { in: eventIds } },
      select: { userId: true },
      distinct: ['userId'],
    });

    // Count unique users from submissions
    const submitterIds = await prisma.submission.findMany({
      where: { eventId: { in: eventIds } },
      select: { userId: true },
      distinct: ['userId'],
    });

    // Combine and deduplicate
    const allUserIds = new Set([
      ...voterIds.map((v) => v.userId),
      ...submitterIds.map((s) => s.userId),
    ]);

    return allUserIds.size;
  }

  // ==================== BRAND LEVEL OPERATIONS ====================

  /**
   * Get current brand metrics and level status
   */
  static async getBrandLevelStatus(brandId: string): Promise<BrandLevelStatus> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        level: true,
        totalUsdcGiven: true,
        eventsCreated: true,
        uniqueParticipants: true,
        discountPercent: true,
      },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    // Get next level requirements
    const nextLevelConfig = this.LEVEL_THRESHOLDS.find(
      (c) => c.level === brand.level + 1
    );

    return {
      level: brand.level,
      discountPercent: brand.discountPercent,
      metrics: {
        usdcGiven: brand.totalUsdcGiven,
        eventsCreated: brand.eventsCreated,
        uniqueParticipants: brand.uniqueParticipants,
      },
      nextLevel: nextLevelConfig
        ? {
            level: nextLevelConfig.level,
            requirements: {
              usdcGiven: nextLevelConfig.usdcGiven,
              eventsCreated: nextLevelConfig.eventsCreated,
              uniqueParticipants: nextLevelConfig.uniqueParticipants,
            },
            discountPercent: nextLevelConfig.discountPercent,
            progress: {
              usdcGiven: Math.min(
                100,
                (brand.totalUsdcGiven / nextLevelConfig.usdcGiven) * 100
              ),
              eventsCreated: Math.min(
                100,
                (brand.eventsCreated / nextLevelConfig.eventsCreated) * 100
              ),
              uniqueParticipants: Math.min(
                100,
                (brand.uniqueParticipants / nextLevelConfig.uniqueParticipants) *
                  100
              ),
            },
          }
        : null,
    };
  }

  /**
   * Recalculate and update brand level
   * Called after event completion or during backfill
   */
  static async recalculateBrandLevel(
    brandId: string,
    triggeredBy: string = 'manual_recalc',
    eventId?: string
  ): Promise<BrandLevelUpdateResult> {
    // Calculate all metrics first (outside transaction for efficiency)
    const [totalUsdcGiven, eventsCreated, uniqueParticipants] = await Promise.all([
      this.calculateTotalUsdcGiven(brandId),
      this.countEventsCreated(brandId),
      this.countUniqueParticipants(brandId),
    ]);

    // Calculate new level
    const { level: newLevel, discountPercent } = this.calculateLevel(
      totalUsdcGiven,
      eventsCreated,
      uniqueParticipants
    );

    return prisma.$transaction(async (tx) => {
      // Get current brand state
      const brand = await tx.brand.findUnique({
        where: { id: brandId },
        select: {
          level: true,
        },
      });

      if (!brand) {
        throw new Error('Brand not found');
      }

      const previousLevel = brand.level;

      // Update brand with new metrics and level
      await tx.brand.update({
        where: { id: brandId },
        data: {
          level: newLevel,
          totalUsdcGiven,
          eventsCreated,
          uniqueParticipants,
          discountPercent,
        },
      });

      // Create snapshot if level changed
      if (newLevel !== previousLevel) {
        await tx.brandLevelSnapshot.create({
          data: {
            brandId,
            level: newLevel,
            previousLevel,
            totalUsdcGiven,
            eventsCreated,
            uniqueParticipants,
            discountPercent,
            triggeredBy,
            eventId,
          },
        });
      }

      return {
        previousLevel,
        newLevel,
        leveledUp: newLevel > previousLevel,
        metrics: {
          usdcGiven: totalUsdcGiven,
          eventsCreated,
          uniqueParticipants,
        },
        discountPercent,
      };
    });
  }

  /**
   * Get brand's discount percentage (for use in payment calculations)
   */
  static async getBrandDiscount(brandId: string): Promise<number> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { discountPercent: true },
    });

    return brand?.discountPercent || 0;
  }

  /**
   * Get level thresholds for display
   */
  static getLevelThresholds(): BrandLevelConfig[] {
    return this.LEVEL_THRESHOLDS;
  }

  /**
   * Get progress towards each metric for next level
   */
  static getProgressToNextLevel(
    currentLevel: number,
    metrics: BrandMetrics
  ): {
    nextLevel: BrandLevelConfig | null;
    progress: { usdcGiven: number; eventsCreated: number; uniqueParticipants: number };
  } {
    const nextLevelConfig = this.LEVEL_THRESHOLDS.find(
      (c) => c.level === currentLevel + 1
    );

    if (!nextLevelConfig) {
      return {
        nextLevel: null,
        progress: { usdcGiven: 100, eventsCreated: 100, uniqueParticipants: 100 },
      };
    }

    return {
      nextLevel: nextLevelConfig,
      progress: {
        usdcGiven: Math.min(100, (metrics.usdcGiven / nextLevelConfig.usdcGiven) * 100),
        eventsCreated: Math.min(
          100,
          (metrics.eventsCreated / nextLevelConfig.eventsCreated) * 100
        ),
        uniqueParticipants: Math.min(
          100,
          (metrics.uniqueParticipants / nextLevelConfig.uniqueParticipants) * 100
        ),
      },
    };
  }

  /**
   * Get brand's level change history
   */
  static async getBrandLevelHistory(brandId: string, limit: number = 20, offset: number = 0) {
    const snapshots = await prisma.brandLevelSnapshot.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
    });

    const total = await prisma.brandLevelSnapshot.count({ where: { brandId } });

    return {
      snapshots,
      total,
    };
  }
}
