import { RewardsPoolService } from './RewardsPoolService.js';
import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma.js';
import { RewardsPoolStatus } from '@prisma/client';

export class RewardsRefundService {


  /**
   * Get brand's refundable balance from ON-CHAIN (source of truth)
   */
  static async getBrandRefundableBalance(brandId: string): Promise<{
    refundableBalanceUsdc: number;
    onChainBalance: number;
    pools: any[];
  }> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { walletAddress: true }
    });

    let onChainBalance = 0;
    if (brand?.walletAddress) {
      try {
        const { BlockchainService } = await import('../../lib/blockchain.js');
        onChainBalance = await BlockchainService.getBrandRefundBalance(brand.walletAddress);
      } catch (e) {
        logger.warn(e, 'Failed to fetch on-chain refund balance:');
      }
    }

    const events = await prisma.event.findMany({
      where: { brandId },
      include: { rewardsPool: { include: { claims: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const pools = events.filter(e => e.rewardsPool).map(e => {
      const p = e.rewardsPool!;
      const unusedSlots = Math.max(0, p.maxParticipants - p.participantCount);
      const feePerParticipant = p.creatorPoolUsdc > 0 ? 0.02 : 0.015;

      let refundBreakdown = { unusedBase: 0, unusedTop: 0, unusedCreator: 0, unusedLeaderboard: 0, platformFee: 0, totalRefund: 0 };

      if (p.status === RewardsPoolStatus.CANCELLED) {
        refundBreakdown = {
          unusedBase: p.basePoolUsdc, unusedTop: p.topPoolUsdc, unusedCreator: p.creatorPoolUsdc,
          unusedLeaderboard: p.leaderboardPoolUsdc || 0, platformFee: p.platformFeeUsdc,
          totalRefund: p.basePoolUsdc + p.topPoolUsdc + p.creatorPoolUsdc + (p.leaderboardPoolUsdc || 0) + p.platformFeeUsdc
        };
      } else if (p.status === RewardsPoolStatus.COMPLETED) {
        const baseRefund = 0.03 * unusedSlots;
        const creatorRefund = p.creatorPoolUsdc > 0 ? 0.05 * unusedSlots : 0;
        const feeRefund = feePerParticipant * unusedSlots;
        refundBreakdown = { unusedBase: baseRefund, unusedTop: 0, unusedCreator: creatorRefund, unusedLeaderboard: 0, platformFee: feeRefund, totalRefund: baseRefund + creatorRefund + feeRefund };
      }

      return { ...RewardsPoolService.formatPoolInfo(p), onChainEventId: e.onChainEventId, eventTitle: e.title, eventStatus: e.status, refundBreakdown };
    });

    return { refundableBalanceUsdc: onChainBalance, onChainBalance, pools };
  }


  /**
   * Get brand refund history
   */
  static async getBrandRefundHistory(brandId: string): Promise<any[]> {
    const pools = await prisma.eventRewardsPool.findMany({
      where: { event: { brandId }, status: { in: [RewardsPoolStatus.COMPLETED, RewardsPoolStatus.CANCELLED] } },
      include: { event: { select: { title: true, onChainEventId: true } } },
      orderBy: { updatedAt: 'desc' }
    });

    return pools.map(p => {
      const unusedSlots = Math.max(0, p.maxParticipants - p.participantCount);
      const feePerParticipant = p.creatorPoolUsdc > 0 ? 0.02 : 0.015;
      let refundAmount = 0;
      let breakdown = { unusedBase: 0, unusedTop: 0, unusedCreator: 0, unusedLeaderboard: 0, platformFee: 0 };

      if (p.status === RewardsPoolStatus.CANCELLED) {
        breakdown = { unusedBase: p.basePoolUsdc, unusedTop: p.topPoolUsdc, unusedCreator: p.creatorPoolUsdc, unusedLeaderboard: p.leaderboardPoolUsdc || 0, platformFee: p.platformFeeUsdc };
        refundAmount = p.basePoolUsdc + p.topPoolUsdc + p.creatorPoolUsdc + (p.leaderboardPoolUsdc || 0) + p.platformFeeUsdc;
      } else {
        const baseRefund = 0.03 * unusedSlots;
        const creatorRefund = p.creatorPoolUsdc > 0 ? 0.05 * unusedSlots : 0;
        const feeRefund = feePerParticipant * unusedSlots;
        breakdown = { unusedBase: baseRefund, unusedTop: 0, unusedCreator: creatorRefund, unusedLeaderboard: 0, platformFee: feeRefund };
        refundAmount = baseRefund + creatorRefund + feeRefund;
      }

      if (refundAmount <= 0) return null;
      return { type: 'REFUND_ADDED', amount: refundAmount, timestamp: p.completedAt || p.updatedAt, eventId: p.event.onChainEventId, dbEventId: p.eventId, eventTitle: p.event.title, status: p.status, breakdown };
    }).filter(Boolean);
  }


  /**
   * Prepare refund claim data for a specific event
   */
  static async prepareRefundClaim(eventId: string, brandId: string): Promise<{
    success: boolean;
    eventId?: string;
    eventTitle?: string;
    refundAmount?: number;
    poolStatus?: string;
    breakdown?: Record<string, number>;
    error?: string;
  }> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, brandId },
      include: { rewardsPool: true },
    });

    if (!event) return { success: false, error: 'Event not found' };
    if (!event.rewardsPool) return { success: false, error: 'No reward pool for this event' };

    const pool = event.rewardsPool;
    if (pool.status !== RewardsPoolStatus.COMPLETED && pool.status !== RewardsPoolStatus.CANCELLED) {
      return { success: false, error: 'Event must be completed or cancelled to claim refund' };
    }

    const unusedSlots = Math.max(0, pool.maxParticipants - pool.participantCount);
    const feePerParticipant = pool.creatorPoolUsdc > 0 ? 0.02 : 0.015;

    let breakdown: Record<string, number>;
    let refundAmount: number;

    if (pool.status === RewardsPoolStatus.CANCELLED) {
      breakdown = {
        unusedBase: pool.basePoolUsdc,
        unusedTop: pool.topPoolUsdc,
        unusedCreator: pool.creatorPoolUsdc,
        unusedLeaderboard: pool.leaderboardPoolUsdc || 0,
        platformFee: pool.platformFeeUsdc,
      };
      refundAmount = Object.values(breakdown).reduce((a, b) => a + b, 0);
    } else {
      const unusedBase = 0.03 * unusedSlots;
      const unusedCreator = pool.creatorPoolUsdc > 0 ? 0.05 * unusedSlots : 0;
      const platformFee = feePerParticipant * unusedSlots;
      breakdown = { unusedBase, unusedCreator, platformFee, unusedTop: 0, unusedLeaderboard: 0 };
      refundAmount = unusedBase + unusedCreator + platformFee;
    }

    return {
      success: true,
      eventId,
      eventTitle: event.title,
      refundAmount,
      poolStatus: pool.status,
      breakdown,
    };
  }
}
