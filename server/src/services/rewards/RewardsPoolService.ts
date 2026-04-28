import { prisma } from '../../lib/prisma';
import { RewardsPoolStatus } from '@prisma/client';
import {
  REWARDS_CONSTANTS,
  EventType,
  PoolRequirements,
  PoolCalculationParams,
  PoolInfo,
} from '../../types/rewards';

export class RewardsPoolService {

  // ==================== POOL CALCULATIONS ====================

  /**
   * Calculate all pool requirements for creating an event reward pool
   */
  static calculatePoolRequirements(params: PoolCalculationParams): PoolRequirements {
    const { eventType, maxParticipants, topPoolAmount } = params;
    const { BASE_REWARD_VOTE_ONLY, BASE_REWARD_POST_VOTE, PLATFORM_FEE_PER_PARTICIPANT, MIN_TOP_REWARD_MULTIPLIER, USDC_DECIMALS } = REWARDS_CONSTANTS;

    // Calculate base pool
    const basePoolRaw = BigInt(BASE_REWARD_VOTE_ONLY) * BigInt(maxParticipants);
    const basePoolUsdc = Number(basePoolRaw) / Math.pow(10, USDC_DECIMALS);

    // Convert top pool amount to raw (input is in USDC)
    const topPoolRaw = BigInt(Math.floor(topPoolAmount * Math.pow(10, USDC_DECIMALS)));
    const topPoolUsdc = topPoolAmount;

    // Validate top pool is at least 1x base pool
    const minTopPool = basePoolRaw * BigInt(MIN_TOP_REWARD_MULTIPLIER);
    if (topPoolRaw < minTopPool) {
      throw new Error(`Top pool must be at least ${Number(minTopPool) / Math.pow(10, USDC_DECIMALS)} USDC (1x base pool)`);
    }

    // Calculate platform fee
    const platformFeeRaw = BigInt(PLATFORM_FEE_PER_PARTICIPANT) * BigInt(maxParticipants);
    const platformFeeUsdc = Number(platformFeeRaw) / Math.pow(10, USDC_DECIMALS);

    // Calculate creator pool for post_and_vote events
    let creatorPoolRaw = 0n;
    let creatorPoolUsdc = 0;
    if (eventType === EventType.PostAndVote) {
      creatorPoolRaw = BigInt(BASE_REWARD_POST_VOTE) * BigInt(maxParticipants);
      creatorPoolUsdc = Number(creatorPoolRaw) / Math.pow(10, USDC_DECIMALS);
    }

    // Calculate leaderboard pool (only for post_and_vote if specified)
    const leaderboardPoolUsdc = params.leaderboardPoolAmount || 0;
    const leaderboardPoolRaw = BigInt(Math.floor(leaderboardPoolUsdc * Math.pow(10, USDC_DECIMALS)));

    // Calculate total
    const totalRequiredRaw = basePoolRaw + topPoolRaw + platformFeeRaw + creatorPoolRaw + leaderboardPoolRaw;
    const totalRequiredUsdc = Number(totalRequiredRaw) / Math.pow(10, USDC_DECIMALS);

    return {
      basePoolUsdc,
      topPoolUsdc,
      leaderboardPoolUsdc,
      platformFeeUsdc,
      creatorPoolUsdc,
      totalRequiredUsdc,
      basePoolRaw,
      topPoolRaw,
      leaderboardPoolRaw,
      platformFeeRaw,
      creatorPoolRaw,
      totalRequiredRaw,
    };
  }


  // ==================== POOL MANAGEMENT ====================

  /**
   * Create a rewards pool record in the database (Web2 only)
   */
  static async createPoolRecord(
    eventId: string,
    maxParticipants: number,
    topPoolAmount: number
  ): Promise<PoolInfo> {
    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { brand: true },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Check if pool already exists
    const existingPool = await prisma.eventRewardsPool.findUnique({
      where: { eventId },
    });

    if (existingPool) {
      throw new Error('Rewards pool already exists for this event');
    }

    // Determine event type
    const eventType = event.eventType === 'post_and_vote' ? EventType.PostAndVote : EventType.VoteOnly;

    // Calculate pool requirements
    const requirements = RewardsPoolService.calculatePoolRequirements({
      eventType,
      maxParticipants,
      topPoolAmount,
    });

    // Create pool record (Web2 - no on-chain interaction)
    const pool = await prisma.eventRewardsPool.create({
      data: {
        eventId,
        maxParticipants,
        basePoolUsdc: requirements.basePoolUsdc,
        topPoolUsdc: requirements.topPoolUsdc,
        platformFeeUsdc: requirements.platformFeeUsdc,
        creatorPoolUsdc: requirements.creatorPoolUsdc,
        status: RewardsPoolStatus.ACTIVE,
      },
    });

    return this.formatPoolInfo(pool);
  }


  /**
   * Get pool info for an event
   */
  static async getPoolInfo(eventId: string): Promise<PoolInfo | null> {
    const pool = await prisma.eventRewardsPool.findUnique({
      where: { eventId },
    });

    if (!pool) {
      return null;
    }

    return this.formatPoolInfo(pool);
  }


  /**
   * Mark pool as completed
   */
  static async completePool(eventId: string): Promise<PoolInfo> {
    const pool = await prisma.eventRewardsPool.update({
      where: { eventId },
      data: {
        status: RewardsPoolStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return this.formatPoolInfo(pool);
  }


  /**
   * Mark pool as cancelled
   */
  static async cancelPool(eventId: string): Promise<PoolInfo> {
    const pool = await prisma.eventRewardsPool.update({
      where: { eventId },
      data: {
        status: RewardsPoolStatus.CANCELLED,
      },
    });

    return this.formatPoolInfo(pool);
  }


  /**
   * Format a Prisma pool model into a PoolInfo object
   */
  static formatPoolInfo(pool: any): PoolInfo {
    return {
      id: pool.id,
      eventId: pool.eventId,
      maxParticipants: pool.maxParticipants,
      basePoolUsdc: pool.basePoolUsdc,
      topPoolUsdc: pool.topPoolUsdc,
      leaderboardPoolUsdc: pool.leaderboardPoolUsdc || 0,
      platformFeeUsdc: pool.platformFeeUsdc,
      creatorPoolUsdc: pool.creatorPoolUsdc,
      totalDisbursed: pool.totalDisbursed || 0,
      participantCount: pool.participantCount || 0,
      status: pool.status,
      remainingPoolUsdc: (pool.basePoolUsdc + pool.topPoolUsdc + pool.creatorPoolUsdc + (pool.leaderboardPoolUsdc || 0)) - (pool.totalDisbursed || 0),
      completedAt: pool.completedAt,
    };
  }
}
