import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { ClaimType, ClaimStatus, WalletStatus } from '@prisma/client';
import {
  ClaimInfo,
  UserClaimableRewards,
  ClaimHistoryItem,
  UserClaimHistory,
} from '../../types/rewards';

export class RewardsClaimService {


  // ==================== CLAIMS ====================

  /**
   * Claim pending rewards for a user who has since initialized a Smart Account.
   * Finds all PENDING claims for the user, pushes them on-chain, and marks them CREDITED.
   */
  static async claimPendingRewards(userId: string): Promise<{ success: boolean; claimsCredited: number; totalAmount: number; transactionHash?: string; errors: string[] }> {
    const result = { success: false, claimsCredited: 0, totalAmount: 0, transactionHash: undefined as string | undefined, errors: [] as string[] };

    // Fetch current user wallet state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletAddress: true, eoaAddress: true },
    });

    if (!user) {
      result.errors.push('User not found');
      return result;
    }

    // Verify user now has a smart account
    const hasValidFormat = user.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(user.walletAddress);
    const isSmartAccount = hasValidFormat && user.walletAddress !== user.eoaAddress;

    if (!isSmartAccount) {
      result.errors.push('No Smart Account detected. Initialize your wallet first.');
      return result;
    }

    // Find all PENDING claims for this user
    const pendingClaims = await prisma.rewardClaim.findMany({
      where: {
        userId,
        status: ClaimStatus.PENDING,
      },
      include: {
        pool: { select: { eventId: true } },
      },
    });

    if (pendingClaims.length === 0) {
      result.errors.push('No pending rewards to claim.');
      return result;
    }

    // Aggregate amounts per event for on-chain distribution
    const perEventMap = new Map<string, { poolId: string; claimIds: string[]; totalWei: bigint; totalUsdc: number }>();
    for (const claim of pendingClaims) {
      const eventId = claim.pool.eventId;
      const existing = perEventMap.get(eventId) || { poolId: claim.poolId, claimIds: [], totalWei: 0n, totalUsdc: 0 };
      existing.claimIds.push(claim.id);
      existing.totalWei += BigInt(Math.round(claim.finalAmount * 1_000_000));
      existing.totalUsdc += claim.finalAmount;
      perEventMap.set(eventId, existing);
    }

    const BlockchainService = (await import('../../lib/blockchain')).BlockchainService;
    const NotificationService = (await import('../social/notificationService')).NotificationService;

    for (const [eventId, data] of perEventMap) {
      try {
        logger.info(`🔗 RewardsService.claimPendingRewards: Distributing ${data.totalUsdc.toFixed(2)} USDC for event ${eventId} to ${user.walletAddress}`);
        const txHash = await BlockchainService.distributeRewardsBatch(eventId, [user.walletAddress!], [data.totalWei], 1);

        // Update all claims for this event to CREDITED
        await prisma.$transaction(async (tx) => {
          await tx.rewardClaim.updateMany({
            where: { id: { in: data.claimIds } },
            data: { status: ClaimStatus.CREDITED, walletStatus: WalletStatus.SMART_ACCOUNT, transactionHash: txHash, claimedAt: new Date() },
          });
        });

        result.claimsCredited += data.claimIds.length;
        result.totalAmount += data.totalUsdc;
        result.transactionHash = txHash;

        const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
        await NotificationService.createNotification({
          userId,
          title: 'Pending Rewards Claimed!',
          message: `Your ${data.totalUsdc.toFixed(2)} USDC reward from "${event?.title ?? 'event'}" has been credited to your Smart Account.`,
          type: 'REWARD',
          metadata: { eventId },
        });
      } catch (error: any) {
        logger.error({ err: error }, `❌ RewardsService.claimPendingRewards: Failed for event ${eventId}`);
        result.errors.push(`Event ${eventId}: ${error.message}`);
      }
    }

    result.success = result.claimsCredited > 0;
    return result;
  }


  /**
   * Get user's claims for an event
   */
  static async getUserClaims(eventId: string, userId: string): Promise<ClaimInfo[]> {
    const pool = await prisma.eventRewardsPool.findUnique({
      where: { eventId },
    });

    if (!pool) {
      return [];
    }

    const claims = await prisma.rewardClaim.findMany({
      where: {
        poolId: pool.id,
        userId,
      },
    });

    return claims.map((claim) => ({
      id: claim.id,
      poolId: claim.poolId,
      userId: claim.userId,
      claimType: claim.claimType,
      baseAmount: claim.baseAmount,
      multiplier: claim.multiplier,
      finalAmount: claim.finalAmount,
      status: claim.status,
      transactionHash: (claim as any).transactionHash,
      claimedAt: claim.claimedAt,
    }));
  }


  /**
   * Get all claimable rewards for a user
   */
  static async getUserClaimableRewards(userId: string): Promise<UserClaimableRewards[]> {
    const claims = await prisma.rewardClaim.findMany({
      where: {
        userId,
        status: { in: [ClaimStatus.PENDING, ClaimStatus.CREDITED] },
      },
      include: {
        pool: {
          include: {
            event: {
              select: {
                id: true, title: true, onChainEventId: true,
                imageUrl: true, imageCid: true,
                brand: { select: { name: true, logoCid: true } },
              },
            },
          },
        },
      },
    });

    // Fetch user's submissions/votes per event for content thumbnails
    const eventIds = [...new Set(claims.map(c => c.pool.eventId))];
    const [submissions, votes] = await Promise.all([
      prisma.submission.findMany({
        where: { userId, eventId: { in: eventIds } },
        select: { eventId: true, imageUrl: true, imageCid: true },
      }),
      prisma.vote.findMany({
        where: { userId, eventId: { in: eventIds } },
        select: { eventId: true, submission: { select: { imageUrl: true, imageCid: true } } },
      }),
    ]);
    const submissionMap = new Map(submissions.map(s => [s.eventId, s]));
    const voteMap = new Map(votes.filter(v => v.submission).map(v => [v.eventId, v.submission!]));

    const PINATA_GW = 'https://gateway.pinata.cloud/ipfs';
    const imgUrl = (url?: string | null, cid?: string | null) =>
      url || (cid ? `${PINATA_GW}/${cid}` : null);

    // Group by event
    const byEvent = new Map<string, UserClaimableRewards>();

    for (const claim of claims) {
      const eventId = claim.pool.eventId;
      const ev = claim.pool.event;

      if (!byEvent.has(eventId)) {
        const sub = submissionMap.get(eventId);
        const votedSub = voteMap.get(eventId);
        const contentSrc = sub ?? votedSub;
        byEvent.set(eventId, {
          eventId,
          eventTitle: ev.title,
          onChainEventId: ev.onChainEventId ?? null,
          claims: [],
          totalClaimableUsdc: 0,
          brandName: ev.brand?.name ?? null,
          brandLogoUrl: imgUrl(null, ev.brand?.logoCid) ?? null,
          eventImageUrl: imgUrl(ev.imageUrl, ev.imageCid) ?? null,
          userContentImageUrl: contentSrc ? (imgUrl(contentSrc.imageUrl, contentSrc.imageCid) ?? null) : null,
        });
      }

      const eventRewards = byEvent.get(eventId)!;
      eventRewards.claims.push({
        id: claim.id,
        poolId: claim.poolId,
        userId: claim.userId,
        claimType: claim.claimType,
        baseAmount: claim.baseAmount,
        multiplier: claim.multiplier,
        finalAmount: claim.finalAmount,
        status: claim.status,
        transactionHash: (claim as any).transactionHash,
        claimedAt: claim.claimedAt,
        createdAt: claim.createdAt,
      });
      eventRewards.totalClaimableUsdc += claim.finalAmount;
    }

    return Array.from(byEvent.values());
  }


  /**
   * Get user's claim history
   */
  static async getUserClaimHistory(userId: string): Promise<UserClaimHistory> {
    const claims = await prisma.rewardClaim.findMany({
      where: { userId, status: ClaimStatus.CLAIMED },
      include: {
        pool: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
                imageCid: true,
                brand: { select: { id: true, name: true, logoCid: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Collect unique eventIds to batch-fetch user's content per event
    const eventIds = [...new Set(claims.map((c) => c.pool.eventId))];

    // User's own submissions per event (for CREATOR / LEADERBOARD claims)
    const submissions = await prisma.submission.findMany({
      where: { userId, eventId: { in: eventIds } },
      select: { eventId: true, imageUrl: true, imageCid: true },
    });
    const submissionByEvent = new Map(submissions.map((s) => [s.eventId, s]));

    // Submissions the user voted on per event (for VOTER claims)
    const votes = await prisma.vote.findMany({
      where: { userId, eventId: { in: eventIds }, submissionId: { not: null } },
      select: {
        eventId: true,
        submission: { select: { imageUrl: true, imageCid: true } },
      },
    });
    const votedSubmissionByEvent = new Map(
      votes.filter((v) => v.submission).map((v) => [v.eventId, v.submission!])
    );

    const PINATA_GW = 'https://gateway.pinata.cloud/ipfs';
    const imgUrl = (url?: string | null, cid?: string | null) =>
      url || (cid ? `${PINATA_GW}/${cid}` : null);

    let totalClaimedUsdc = 0;

    const claimHistory: ClaimHistoryItem[] = claims.map((claim) => {
      totalClaimedUsdc += claim.finalAmount;

      const event = claim.pool.event;
      const isVoterClaim = claim.claimType === ClaimType.BASE_VOTER || claim.claimType === ClaimType.TOP_VOTER;
      const contentSrc = isVoterClaim
        ? votedSubmissionByEvent.get(event.id)
        : submissionByEvent.get(event.id);

      return {
        id: claim.id,
        eventId: event.id,
        eventTitle: event.title,
        brandName: event.brand?.name ?? null,
        brandLogoUrl: imgUrl(null, event.brand?.logoCid) ?? null,
        claimType: claim.claimType,
        baseAmount: claim.baseAmount,
        multiplier: claim.multiplier,
        finalAmount: claim.finalAmount,
        status: claim.status,
        transactionHash: (claim as any).transactionHash,
        claimedAt: claim.claimedAt,
        eventImageUrl: imgUrl(event.imageUrl, event.imageCid) ?? null,
        contentImageUrl: imgUrl(contentSrc?.imageUrl, contentSrc?.imageCid) ?? null,
      };
    });

    return {
      claims: claimHistory,
      totalClaimedUsdc,
      totalPendingUsdc: 0,
    };
  }


  /**
   * Confirm claim (Web2 only - no transaction hash)
   */
  static async confirmClaim(
    eventId: string,
    userId: string,
    claimType: ClaimType
  ): Promise<ClaimInfo | null> {
    const pool = await prisma.eventRewardsPool.findUnique({
      where: { eventId },
    });

    if (!pool) {
      throw new Error('Pool not found');
    }

    // Find the claim
    const claim = await prisma.rewardClaim.findFirst({
      where: {
        poolId: pool.id,
        userId,
        claimType,
        status: { in: [ClaimStatus.PENDING, ClaimStatus.CREDITED] },
      },
    });

    if (!claim) {
      throw new Error('No pending claim found');
    }

    // Update claim status in a transaction
    const [updatedClaim] = await prisma.$transaction([
      prisma.rewardClaim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.CLAIMED,
          claimedAt: new Date(),
        },
      }),
      // Log the activity
      prisma.tokenActivityLog.create({
        data: {
          userId,
          actorType: 'USER',
          actionType: 'REWARD_CLAIM',
          amount: claim.finalAmount,
          tokenType: 'USDC',
          metadata: {
            eventId,
            claimId: claim.id,
            claimType,
          },
        },
      }),
    ]);

    return {
      id: updatedClaim.id,
      poolId: updatedClaim.poolId,
      userId: updatedClaim.userId,
      claimType: updatedClaim.claimType,
      baseAmount: updatedClaim.baseAmount,
      multiplier: updatedClaim.multiplier,
      finalAmount: updatedClaim.finalAmount,
      status: updatedClaim.status,
      transactionHash: (updatedClaim as any).transactionHash,
      claimedAt: updatedClaim.claimedAt,
    };
  }


  /**
   * Confirm all CREDITED claims for a user after on-chain claim
   * Called by frontend after successful claimRewards() transaction
   */
  static async confirmAllUserClaims(
    userId: string,
    transactionHash: string
  ): Promise<{ claimsUpdated: number; totalAmount: number }> {
    // Find all claimable (PENDING or CREDITED) claims for this user
    const claims = await prisma.rewardClaim.findMany({
      where: {
        userId,
        status: { in: [ClaimStatus.PENDING, ClaimStatus.CREDITED] },
      },
    });

    if (claims.length === 0) {
      return { claimsUpdated: 0, totalAmount: 0 };
    }

    const totalAmount = claims.reduce((sum, c) => sum + c.finalAmount, 0);
    const claimIds = claims.map(c => c.id);

    logger.info(`📝 RewardsService: Confirming ${claims.length} claims for user ${userId} with txHash ${transactionHash}`);

    await prisma.$transaction([
      // Update all CREDITED claims to CLAIMED
      prisma.rewardClaim.updateMany({
        where: {
          id: { in: claimIds },
        },
        data: {
          status: ClaimStatus.CLAIMED,
          transactionHash,
          claimedAt: new Date(),
        },
      }),
      // Log the bulk claim activity
      prisma.tokenActivityLog.create({
        data: {
          userId,
          actorType: 'USER',
          actionType: 'BULK_REWARD_CLAIM',
          amount: totalAmount,
          tokenType: 'USDC',
          metadata: {
            claimCount: claims.length,
            claimIds,
            transactionHash,
          },
        },
      }),
    ]);

    logger.info(`✅ RewardsService: Confirmed ${claims.length} claims totaling ${totalAmount} USDC`);

    return { claimsUpdated: claims.length, totalAmount };
  }


  /**
   * Sync database claims with on-chain state
   * Marks CREDITED claims as CLAIMED when on-chain balance is 0
   * Used when user has already claimed on-chain but DB is out of sync
   */
  static async syncClaimsWithOnChain(userId: string): Promise<{ claimsSynced: number }> {
    // Find all CREDITED claims for this user
    const claims = await prisma.rewardClaim.findMany({
      where: {
        userId,
        status: ClaimStatus.CREDITED,
      },
    });

    if (claims.length === 0) {
      return { claimsSynced: 0 };
    }

    const claimIds = claims.map(c => c.id);

    logger.info(`🔄 RewardsService: Syncing ${claims.length} claims for user ${userId} (on-chain already claimed)`);

    await prisma.rewardClaim.updateMany({
      where: {
        id: { in: claimIds },
      },
      data: {
        status: ClaimStatus.CLAIMED,
        claimedAt: new Date(),
      },
    });

    return { claimsSynced: claims.length };
  }

  /**
   * Get all claimable rewards for a brand's events
   */
  static async getBrandClaimableRewards(brandId: string) {
    // Get all events for this brand with their pools and claims
    const events = await prisma.event.findMany({
      where: { brandId },
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
          onChainEventId: event.onChainEventId,
          poolStatus: pool.status,
          claims,
          totalClaimable,
          claimCount: claims.length
        };
      });

    const totalClaimableAll = eventsWithClaims.reduce((sum, e) => sum + e.totalClaimable, 0);
    const totalClaimCount = eventsWithClaims.reduce((sum, e) => sum + e.claimCount, 0);

    return {
      events: eventsWithClaims,
      totalClaimable: totalClaimableAll,
      totalClaimCount
    };
  }
}
