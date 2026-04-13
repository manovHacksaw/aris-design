import { Request, Response } from 'express';
import { RewardsService } from '../services/rewardsService.js';
import { prisma } from '../lib/prisma.js';
import { ClaimType, RewardsPoolStatus } from '@prisma/client';
import { EventType, REWARDS_CONSTANTS } from '../types/rewards.js';

/**
 * Rewards Controller
 * Handles all reward pool and claim-related endpoints
 */
export class RewardsController {
  private static setNoStore(res: Response): void {
    res.set({
      'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  }

  // ==================== POOL ENDPOINTS ====================
  // Note: Pool creation is now automatic during event creation (Web2 only)

  /**
   * GET /api/rewards/pools/:eventId
   * Get pool status for an event
   */
  static async getPool(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;

      const pool = await RewardsService.getPoolInfo(eventId);

      if (!pool) {
        res.status(404).json({ success: false, error: 'Pool not found' });
        return;
      }

      res.json({
        success: true,
        data: pool,
      });
    } catch (error: any) {
      console.error('Error getting pool:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get pool',
      });
    }
  }







  /**
   * POST /api/rewards/pools/:eventId/cancel
   * Cancel a pool (Brand or Admin) - Web2 only
   */
  static async cancelPool(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Get event and verify ownership or admin
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { brand: true },
      });

      if (!event) {
        res.status(404).json({ success: false, error: 'Event not found' });
        return;
      }

      if (event.brand.ownerId !== userId && userRole !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      const pool = await RewardsService.cancelPool(eventId);

      res.json({
        success: true,
        data: pool,
      });
    } catch (error: any) {
      console.error('Error cancelling pool:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to cancel pool',
      });
    }
  }

  /**
   * GET /api/rewards/pools/:eventId/calculate
   * Calculate pool requirements for an event
   */
  static async calculatePoolRequirements(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { maxParticipants, topPoolAmount } = req.query;

      // Get event to determine type
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        res.status(404).json({ success: false, error: 'Event not found' });
        return;
      }

      if (!maxParticipants || !topPoolAmount) {
        res.status(400).json({
          success: false,
          error: 'maxParticipants and topPoolAmount query params required',
        });
        return;
      }

      const eventType = event.eventType === 'post_and_vote' ? EventType.PostAndVote : EventType.VoteOnly;

      const requirements = RewardsService.calculatePoolRequirements({
        eventType,
        maxParticipants: parseInt(maxParticipants as string),
        topPoolAmount: parseFloat(topPoolAmount as string),
      });

      res.json({
        success: true,
        data: {
          eventType: event.eventType,
          ...requirements,
        },
      });
    } catch (error: any) {
      console.error('Error calculating requirements:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to calculate requirements',
      });
    }
  }

  // ==================== CLAIM ENDPOINTS ====================

  /**
   * GET /api/rewards/claims/:eventId
   * Get user's claims for an event
   */
  static async getUserClaims(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const claims = await RewardsService.getUserClaims(eventId, userId);

      res.json({
        success: true,
        data: claims,
      });
    } catch (error: any) {
      console.error('Error getting claims:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get claims',
      });
    }
  }



  /**
   * POST /api/rewards/claims/:eventId/confirm
   * Confirm claim (Web2 only - no transaction hash needed)
   */
  static async confirmClaim(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { claimType } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!claimType) {
        res.status(400).json({ success: false, error: 'claimType required' });
        return;
      }

      const claim = await RewardsService.confirmClaim(
        eventId,
        userId,
        claimType as ClaimType
      );

      if (!claim) {
        res.status(404).json({ success: false, error: 'Claim not found' });
        return;
      }

      res.json({
        success: true,
        data: claim,
      });
    } catch (error: any) {
      console.error('Error confirming claim:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to confirm claim',
      });
    }
  }

  /**
   * POST /api/rewards/confirm-all-claims
   * Confirm all CREDITED claims after on-chain transaction
   * Called by frontend after successful claimRewards() transaction
   */
  static async confirmAllClaims(req: Request, res: Response): Promise<void> {
    try {
      const { transactionHash } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!transactionHash) {
        res.status(400).json({ success: false, error: 'transactionHash required' });
        return;
      }

      const result = await RewardsService.confirmAllUserClaims(userId, transactionHash);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error confirming all claims:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to confirm claims',
      });
    }
  }

  /**
   * POST /api/rewards/sync-claims
   * Sync database claims with on-chain state
   * Used when user has already claimed on-chain but DB is out of sync
   */
  static async syncClaims(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await RewardsService.syncClaimsWithOnChain(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error syncing claims:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync claims',
      });
    }
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * GET /api/rewards/me
   * Get user's rewards summary (simplified endpoint as requested)
   */
  static async getMyRewards(req: Request, res: Response): Promise<void> {
    try {
      RewardsController.setNoStore(res);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const rewards = await RewardsService.getUserClaimableRewards(userId);

      // Calculate total
      const totalClaimable = rewards.reduce((sum, r) => sum + r.totalClaimableUsdc, 0).toFixed(2);

      // Format response as requested
      const events = rewards.map(r => ({
        eventId: r.eventId,
        title: r.eventTitle,
        onChainEventId: r.onChainEventId,
        claimableAmount: r.totalClaimableUsdc.toFixed(2),
        alreadyClaimed: false,
        claimStatus: r.claims.length > 0 ? 'CLAIMABLE' : 'NO_REWARDS',
        claims: r.claims,
      }));

      res.json({
        success: true,
        totalClaimable,
        events,
      });
    } catch (error: any) {
      console.error('Error getting my rewards:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get rewards',
      });
    }
  }

  /**
   * POST /api/rewards/claim
   * Claim a single reward (Web2 only - simplified)
   */
  static async claimReward(req: Request, res: Response): Promise<void> {
    try {
      const { eventId, claimType } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!eventId) {
        res.status(400).json({ success: false, error: 'eventId required' });
        return;
      }

      // If claimType not specified, claim all pending claims for this event
      if (!claimType) {
        const claims = await RewardsService.getUserClaims(eventId, userId);
        const pendingClaims = claims.filter(c => c.status === 'PENDING');

        if (pendingClaims.length === 0) {
          res.status(400).json({ success: false, error: 'No pending claims for this event' });
          return;
        }

        // Claim all pending
        const claimedRewards = [];
        for (const claim of pendingClaims) {
          const result = await RewardsService.confirmClaim(
            eventId,
            userId,
            claim.claimType
          );
          if (result) {
            claimedRewards.push(result);
          }
        }

        res.json({
          success: true,
          data: {
            claims: claimedRewards,
            totalClaims: claimedRewards.length,
            totalAmount: claimedRewards.reduce((sum, c) => sum + c.finalAmount, 0),
          },
        });
        return;
      }

      // Validate claim type
      if (!Object.values(ClaimType).includes(claimType as ClaimType)) {
        res.status(400).json({ success: false, error: 'Invalid claim type' });
        return;
      }

      // Claim single reward
      const claim = await RewardsService.confirmClaim(
        eventId,
        userId,
        claimType as ClaimType
      );

      if (!claim) {
        res.status(404).json({ success: false, error: 'Claim not found' });
        return;
      }

      res.json({
        success: true,
        data: claim,
      });
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to claim reward',
      });
    }
  }

  /**
   * GET /api/rewards/user/claimable
   * Get all claimable rewards for the user
   */
  static async getClaimableRewards(req: Request, res: Response): Promise<void> {
    try {
      RewardsController.setNoStore(res);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const rewards = await RewardsService.getUserClaimableRewards(userId);

      // Calculate total
      const totalClaimableUsdc = rewards.reduce((sum, r) => sum + r.totalClaimableUsdc, 0);

      res.json({
        success: true,
        data: {
          events: rewards,
          totalClaimableUsdc,
        },
      });
    } catch (error: any) {
      console.error('Error getting claimable rewards:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get claimable rewards',
      });
    }
  }

  /**
   * GET /api/rewards/user/history
   * Get user's claim history
   */
  static async getClaimHistory(req: Request, res: Response): Promise<void> {
    try {
      RewardsController.setNoStore(res);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const history = await RewardsService.getUserClaimHistory(userId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('Error getting claim history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get claim history',
      });
    }
  }

  // ==================== UTILITY ENDPOINTS ====================

  /**
   * GET /api/rewards/constants
   * Get reward system constants
   */
  static async getConstants(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        baseRewardVoteOnly: REWARDS_CONSTANTS.BASE_REWARD_VOTE_ONLY / Math.pow(10, REWARDS_CONSTANTS.USDC_DECIMALS),
        baseRewardPostVote: REWARDS_CONSTANTS.BASE_REWARD_POST_VOTE / Math.pow(10, REWARDS_CONSTANTS.USDC_DECIMALS),
        platformFeePerParticipant: REWARDS_CONSTANTS.PLATFORM_FEE_PER_PARTICIPANT / Math.pow(10, REWARDS_CONSTANTS.USDC_DECIMALS),
        minTopRewardMultiplier: REWARDS_CONSTANTS.MIN_TOP_REWARD_MULTIPLIER,
        leaderboardDistribution: {
          firstPlace: REWARDS_CONSTANTS.FIRST_PLACE_BPS / 100,
          secondPlace: REWARDS_CONSTANTS.SECOND_PLACE_BPS / 100,
          thirdPlace: REWARDS_CONSTANTS.THIRD_PLACE_BPS / 100,
        },
        usdcDecimals: REWARDS_CONSTANTS.USDC_DECIMALS,
      },
    });
  }

  /**
   * GET /api/rewards/contract-info
   * Get smart contract addresses
   */
  static async getContractInfo(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        rewardsVaultAddress: process.env.REWARDS_VAULT_ADDRESS || null,
        testUsdcAddress: process.env.TEST_USDC_ADDRESS || null,
        chainId: parseInt(process.env.CHAIN_ID || '80002'),
        chainName: 'Polygon Amoy',
      },
    });
  }

  /**
   * POST /api/rewards/claim-pending
   * User-triggered: distribute PENDING rewards now that the user has a Smart Account
   */
  static async claimPendingRewards(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await RewardsService.claimPendingRewards(userId);

      if (!result.success && result.claimsCredited === 0) {
        res.status(400).json({ success: false, error: result.errors[0] ?? 'Failed to claim pending rewards', errors: result.errors });
        return;
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error claiming pending rewards:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to claim pending rewards' });
    }
  }

  // ==================== BRAND REFUND ENDPOINTS ====================

  /**
   * GET /api/rewards/brand/refunds
   * Get brand's refundable balance and pool details
   */
  static async getBrandRefunds(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Get user's brand
      const brand = await prisma.brand.findFirst({
        where: { ownerId: userId },
      });

      if (!brand) {
        res.status(404).json({ success: false, error: 'Brand not found' });
        return;
      }

      const refundData = await RewardsService.getBrandRefundableBalance(brand.id);
      const refundHistory = await RewardsService.getBrandRefundHistory(brand.id);

      res.json({
        success: true,
        data: {
          brandId: brand.id,
          brandName: brand.name,
          ...refundData,
          refundHistory // Include history from DB
        },
      });
    } catch (error: any) {
      console.error('Error getting brand refunds:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get refund data',
      });
    }
  }

  /**
   * GET /api/rewards/brand/claimable
   * Get all claimable rewards for participants in brand's events
   */
  static async getBrandClaimableRewards(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Get user's brand
      const brand = await prisma.brand.findFirst({
        where: { ownerId: userId },
      });

      if (!brand) {
        res.status(404).json({ success: false, error: 'Brand not found' });
        return;
      }

      // Get all events for this brand with their pools and claims
      const events = await prisma.event.findMany({
        where: { brandId: brand.id },
        include: {
          rewardsPool: {
            include: {
              claims: {
                where: {
                  status: { in: ['PENDING', 'SIGNED'] }
                },
                include: {
                  user: {
                    select: { id: true, username: true, walletAddress: true, avatarUrl: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Format the response
      const eventsWithClaims = events
        .filter(event => event.rewardsPool && event.rewardsPool.claims.length > 0)
        .map(event => {
          const pool = event.rewardsPool!;
          const claims = pool.claims.map(claim => ({
            id: claim.id,
            claimType: claim.claimType,
            baseAmount: claim.baseAmount,
            multiplier: claim.multiplier,
            finalAmount: claim.finalAmount,
            status: claim.status,
            user: {
              id: claim.user?.id,
              username: claim.user?.username || 'Unknown',
              walletAddress: claim.user?.walletAddress,
              avatarUrl: claim.user?.avatarUrl
            }
          }));

          const totalClaimable = claims.reduce((sum, c) => sum + c.finalAmount, 0);

          return {
            eventId: event.id,
            eventTitle: event.title,
            onChainEventId: pool.onChainEventId,
            poolStatus: pool.status,
            claims,
            totalClaimable,
            claimCount: claims.length
          };
        });

      const totalClaimableAll = eventsWithClaims.reduce((sum, e) => sum + e.totalClaimable, 0);
      const totalClaimCount = eventsWithClaims.reduce((sum, e) => sum + e.claimCount, 0);

      res.json({
        success: true,
        data: {
          brandId: brand.id,
          brandName: brand.name,
          events: eventsWithClaims,
          totalClaimable: totalClaimableAll,
          totalClaimCount
        }
      });
    } catch (error: any) {
      console.error('Error getting brand claimable rewards:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get claimable rewards',
      });
    }
  }

  /**
   * POST /api/rewards/brand/refunds/prepare
   * Prepare refund claim data for a specific event
   */
  static async prepareRefundClaim(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!eventId) {
        res.status(400).json({ success: false, error: 'eventId required' });
        return;
      }

      // Get user's brand
      const brand = await prisma.brand.findFirst({
        where: { ownerId: userId },
      });

      if (!brand) {
        res.status(404).json({ success: false, error: 'Brand not found' });
        return;
      }

      const result = await RewardsService.prepareRefundClaim(eventId, brand.id);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error preparing refund claim:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to prepare refund',
      });
    }
  }




}
