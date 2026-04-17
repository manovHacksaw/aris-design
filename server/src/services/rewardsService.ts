import logger from '../lib/logger';
import { prisma } from '../lib/prisma.js';
import { ClaimType, ClaimStatus, WalletStatus, RewardsPoolStatus, EventType as PrismaEventType } from '@prisma/client';
import {
  REWARDS_CONSTANTS,
  EventType,
  PoolRequirements,
  PoolCalculationParams,
  PoolInfo,
  ClaimInfo,
  UserClaimableRewards,
  ProcessEventRewardsResult,
  ClaimHistoryItem,
  UserClaimHistory,
} from '../types/rewards.js';

export class RewardsService {
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

    // Calculate total
    const totalRequiredRaw = basePoolRaw + topPoolRaw + platformFeeRaw + creatorPoolRaw;
    const totalRequiredUsdc = Number(totalRequiredRaw) / Math.pow(10, USDC_DECIMALS);

    return {
      basePoolUsdc,
      topPoolUsdc,
      platformFeeUsdc,
      creatorPoolUsdc,
      totalRequiredUsdc,
      basePoolRaw,
      topPoolRaw,
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
    const requirements = this.calculatePoolRequirements({
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
   * Format pool record to PoolInfo
   */
  private static formatPoolInfo(pool: any): PoolInfo {
    const totalPool = pool.basePoolUsdc + pool.topPoolUsdc + pool.creatorPoolUsdc;
    const remainingPoolUsdc = Math.max(0, totalPool - pool.totalDisbursed);

    return {
      id: pool.id,
      eventId: pool.eventId,
      maxParticipants: pool.maxParticipants,
      basePoolUsdc: pool.basePoolUsdc,
      topPoolUsdc: pool.topPoolUsdc,
      platformFeeUsdc: pool.platformFeeUsdc,
      creatorPoolUsdc: pool.creatorPoolUsdc,
      totalDisbursed: pool.totalDisbursed,
      participantCount: pool.participantCount,
      status: pool.status,
      remainingPoolUsdc,
      completedAt: pool.completedAt,
    };
  }

  // ==================== EVENT REWARDS PROCESSING ====================

  /**
   * Process event rewards after completion
   * Follows strictly: On-chain -> DB -> Notifications
   */
  static async processEventRewards(eventId: string): Promise<ProcessEventRewardsResult> {
    const result: ProcessEventRewardsResult = {
      success: false,
      claimsCreated: 0,
      totalRewards: 0,
      errors: [],
    };

    try {
      // Get pool
      const pool = await prisma.eventRewardsPool.findUnique({
        where: { eventId },
      });

      if (!pool) {
        throw new Error(`No rewards pool found for event ${eventId}. The blockchain transaction may have failed. Check event.blockchainStatus.`);
      }

      if (pool.status !== RewardsPoolStatus.ACTIVE) {
        // If already completed, check if we need to re-sync
        logger.info(`ℹ️ RewardsService: Pool for event ${eventId} is already ${pool.status}. Processing anyway to ensure DB sync.`);
      }

      // Get event with votes and submissions
      // Filter for active submissions and valid votes
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          votes: {
            include: {
              user: {
                select: { id: true, xp: true, walletAddress: true, eoaAddress: true, role: true },
              },
            },
          },
          submissions: {
            where: { status: 'active' },
            include: {
              user: {
                select: { id: true, xp: true, walletAddress: true, eoaAddress: true },
              },
              _count: {
                select: { votes: true },
              },
            },
            orderBy: { finalRank: 'asc' },
          },
        },
      });

      if (!event) {
        result.errors.push('Event not found');
        return result;
      }

      const claimsToCreate: any[] = [];
      const { USDC_DECIMALS, BASE_REWARD_VOTE_ONLY, BASE_REWARD_POST_VOTE, FIRST_PLACE_BPS, SECOND_PLACE_BPS, THIRD_PLACE_BPS, BPS_DENOMINATOR } = REWARDS_CONSTANTS;

      /** Classify a wallet address pair into a WalletStatus */
      const resolveWalletStatus = (walletAddress: string | null, eoaAddress: string | null): WalletStatus => {
        const hasValidFormat = walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
        if (hasValidFormat && walletAddress !== eoaAddress) return WalletStatus.SMART_ACCOUNT;
        if (hasValidFormat && walletAddress === eoaAddress) return WalletStatus.EOA_PENDING;
        return WalletStatus.NO_WALLET;
      };

      // Process voter base rewards (Strictly USER role only, capped at pool.maxParticipants)
      const voterCap = pool.maxParticipants;
      const uniqueVoters = new Map<string, { userId: string; xp: number; walletAddress: string | null; eoaAddress: string | null }>();

      for (const vote of event.votes) {
        if (vote.user.role !== 'USER') continue;

        if (!uniqueVoters.has(vote.userId)) {
          if (uniqueVoters.size >= voterCap) break;

          uniqueVoters.set(vote.userId, {
            userId: vote.userId,
            xp: vote.user.xp,
            walletAddress: vote.user.walletAddress,
            eoaAddress: vote.user.eoaAddress,
          });
        }
      }

      // Create base voter reward claims
      for (const [userId, voter] of uniqueVoters) {
        const multiplier = 1.0;
        const baseAmount = BASE_REWARD_VOTE_ONLY / Math.pow(10, USDC_DECIMALS);
        const finalAmount = baseAmount * multiplier;

        claimsToCreate.push({
          poolId: pool.id,
          userId,
          walletAddress: voter.walletAddress,
          eoaAddress: voter.eoaAddress,
          walletStatus: resolveWalletStatus(voter.walletAddress, voter.eoaAddress),
          claimType: ClaimType.BASE_VOTER,
          baseAmount,
          multiplier,
          finalAmount,
          status: ClaimStatus.PENDING,
        });
      }

      // Calculate top voter rewards
      if (event.eventType === 'post_and_vote') {
        const topSubmissions = event.submissions.slice(0, 3);
        const topVoters = new Map<string, { count: number; xp: number; walletAddress: string | null; eoaAddress: string | null }>();

        for (const submission of topSubmissions) {
          const votes = await prisma.vote.findMany({
            where: { eventId, submissionId: submission.id },
            include: {
              user: { select: { id: true, xp: true, walletAddress: true, eoaAddress: true } },
            },
          });

          for (const vote of votes) {
            const current = topVoters.get(vote.userId) || { count: 0, xp: vote.user.xp, walletAddress: vote.user.walletAddress, eoaAddress: vote.user.eoaAddress };
            topVoters.set(vote.userId, { count: current.count + 1, xp: vote.user.xp, walletAddress: vote.user.walletAddress, eoaAddress: vote.user.eoaAddress });
          }
        }

        const sortedTopVoters = Array.from(topVoters.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3);

        const topVoterPercentages = [FIRST_PLACE_BPS, SECOND_PLACE_BPS, THIRD_PLACE_BPS];

        for (let i = 0; i < sortedTopVoters.length; i++) {
          const [userId, data] = sortedTopVoters[i];
          const multiplier = 1.0;
          const percentage = topVoterPercentages[i];
          const baseAmount = (pool.topPoolUsdc * percentage) / BPS_DENOMINATOR;
          const finalAmount = baseAmount * multiplier;

          claimsToCreate.push({
            poolId: pool.id,
            userId,
            walletAddress: data.walletAddress,
            eoaAddress: data.eoaAddress,
            walletStatus: resolveWalletStatus(data.walletAddress, data.eoaAddress),
            claimType: ClaimType.TOP_VOTER,
            baseAmount,
            multiplier,
            finalAmount,
            status: ClaimStatus.PENDING,
          });
        }

        // Creator rewards
        for (const submission of event.submissions) {
          const multiplier = 1.0;
          const votesReceived = submission._count.votes;
          const baseAmount = (BASE_REWARD_POST_VOTE / Math.pow(10, USDC_DECIMALS)) * votesReceived;
          const finalAmount = baseAmount * multiplier;

          claimsToCreate.push({
            poolId: pool.id,
            userId: submission.userId,
            walletAddress: submission.user.walletAddress,
            eoaAddress: submission.user.eoaAddress,
            walletStatus: resolveWalletStatus(submission.user.walletAddress, submission.user.eoaAddress),
            claimType: ClaimType.CREATOR,
            baseAmount,
            multiplier,
            finalAmount,
            status: ClaimStatus.PENDING,
          });
        }

        // Leaderboard rewards
        const topCreators = event.submissions.slice(0, 3);
        const leaderboardPercentages = [FIRST_PLACE_BPS, SECOND_PLACE_BPS, THIRD_PLACE_BPS];

        for (let i = 0; i < topCreators.length; i++) {
          const creator = topCreators[i];
          const multiplier = 1.0;
          const percentage = leaderboardPercentages[i];
          const baseAmount = (pool.leaderboardPoolUsdc * percentage) / BPS_DENOMINATOR;
          const finalAmount = baseAmount * multiplier;

          claimsToCreate.push({
            poolId: pool.id,
            userId: creator.userId,
            walletAddress: creator.user.walletAddress,
            eoaAddress: creator.user.eoaAddress,
            walletStatus: resolveWalletStatus(creator.user.walletAddress, creator.user.eoaAddress),
            claimType: ClaimType.LEADERBOARD,
            baseAmount,
            multiplier,
            finalAmount,
            status: ClaimStatus.PENDING,
          });
        }
      } else {
        // vote_only event — fallback to voteCount DESC if finalRank not yet synced
        const topProposals = await prisma.proposal.findMany({
          where: { eventId },
          orderBy: [
            { finalRank: 'asc' },
            { voteCount: 'desc' },
            { createdAt: 'asc' }
          ],
          take: 3,
        });

        const topVoterPercentages = [BPS_DENOMINATOR, 0, 0];

        for (let i = 0; i < topProposals.length; i++) {
          const proposal = topProposals[i];
          const votes = await prisma.vote.findMany({
            where: { eventId, proposalId: proposal.id },
            include: {
              user: { select: { id: true, xp: true, walletAddress: true, eoaAddress: true, role: true } },
            },
          });

          const validVotedUsers = votes.filter(v => v.user.role === 'USER');

          const percentage = topVoterPercentages[i];
          const totalForPosition = (pool.topPoolUsdc * percentage) / BPS_DENOMINATOR;
          const perVoter = validVotedUsers.length > 0 ? totalForPosition / validVotedUsers.length : 0;

          for (const vote of validVotedUsers) {
            const multiplier = 1.0;
            const baseAmount = perVoter;
            const finalAmount = baseAmount * multiplier;

            claimsToCreate.push({
              poolId: pool.id,
              userId: vote.userId,
              walletAddress: vote.user.walletAddress,
              eoaAddress: vote.user.eoaAddress,
              walletStatus: resolveWalletStatus(vote.user.walletAddress, vote.user.eoaAddress),
              claimType: ClaimType.TOP_VOTER,
              baseAmount,
              multiplier,
              finalAmount,
              status: ClaimStatus.PENDING,
            });
          }
        }
      }

      // ==================== ON-CHAIN DISTRIBUTION ====================
      const BlockchainService = (await import('../lib/blockchain.js')).BlockchainService;
      const NotificationService = (await import('./notificationService.js')).NotificationService;

      const usersBatch: string[] = [];
      const amountsBatch: bigint[] = [];
      const notificationQueue: any[] = [];
      const validClaims: any[] = [];

      logger.info(`🔍 RewardsService: Processing ${claimsToCreate.length} potential claims for event ${eventId}`);

      // Separate claims: smart accounts go on-chain + CREDITED, everyone else gets PENDING in DB only
      const pendingClaims: any[] = []; // EOA_PENDING or NO_WALLET

      for (const claim of claimsToCreate) {
        if (claim.walletStatus === WalletStatus.SMART_ACCOUNT) {
          usersBatch.push(claim.walletAddress!);
          const amountWei = BigInt(Math.round(claim.finalAmount * 1_000_000));
          amountsBatch.push(amountWei);
          validClaims.push(claim);

          notificationQueue.push({
            userId: claim.userId,
            title: "Event Rewards Credited!",
            message: `You earned ${claim.finalAmount.toFixed(2)} USDC from "${event.title}". It has been credited to your Smart Account.`,
            type: "REWARD"
          });
        } else {
          pendingClaims.push(claim);
          logger.info(`⏳ RewardsService: Queuing PENDING reward for user ${claim.userId} (walletStatus=${claim.walletStatus})`);

          const isEoa = claim.walletStatus === WalletStatus.EOA_PENDING;
          notificationQueue.push({
            userId: claim.userId,
            title: "Reward Pending — Wallet Setup Required",
            message: isEoa
              ? `You earned ${claim.finalAmount.toFixed(2)} USDC from "${event.title}". Your reward is pending because your wallet is not yet a Smart Account. Open your wallet to activate and claim.`
              : `You earned ${claim.finalAmount.toFixed(2)} USDC from "${event.title}". Connect a wallet to claim your reward.`,
            type: "SYSTEM"
          });
        }
      }

      logger.info(`📊 RewardsService: ${validClaims.length} smart-account claims, ${pendingClaims.length} pending claims (out of ${claimsToCreate.length} total)`);

      // 1. On-Chain Distribution (smart account recipients only)
      if (usersBatch.length > 0) {
        let skipOnChain = false;
        try {
          const { createPublicClient, http, defineChain } = (await import('viem'));
          const polygonAmoy = defineChain({ id: 80002, name: 'Polygon Amoy', nativeCurrency: { decimals: 18, name: 'MATIC', symbol: 'MATIC' }, rpcUrls: { default: { http: [process.env.RPC_URL || 'https://rpc-amoy.polygon.technology'] } }, testnet: true });
          const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(process.env.RPC_URL || 'https://rpc-amoy.polygon.technology') });
          const onChainEventId = (await import('../lib/blockchain.js')).eventIdToBytes32(eventId);
          const vaultAddress = process.env.REWARDS_VAULT_ADDRESS || '0x7BEbA9297aED5a2c09a05807617318bAA0F561C6';

          const poolData: any = await publicClient.readContract({
            address: vaultAddress as `0x${string}`,
            abi: [{
              inputs: [{ name: "", type: "bytes32" }],
              name: "eventPools",
              outputs: [
                { name: "eventId", type: "bytes32" }, { name: "status", type: "uint8" }, { name: "eventType", type: "uint8" },
                { name: "brandOwner", type: "address" }, { name: "maxParticipants", type: "uint256" }, { name: "basePoolUsdc", type: "uint256" },
                { name: "topPoolUsdc", type: "uint256" }, { name: "platformFeeUsdc", type: "uint256" }, { name: "creatorPoolUsdc", type: "uint256" },
                { name: "leaderboardPoolUsdc", type: "uint256" }, { name: "totalDisbursed", type: "uint256" }, { name: "actualParticipants", type: "uint256" },
                { name: "createdAt", type: "uint256" }, { name: "completedAt", type: "uint256" }
              ],
              stateMutability: "view", type: "function"
            }],
            functionName: "eventPools",
            args: [onChainEventId as `0x${string}`]
          });

          if (poolData && Number(poolData[1]) === 1) { // 1 = Completed
            logger.info(`ℹ️ RewardsService: Event ${eventId} already COMPLETED on-chain. Syncing database records...`);
            skipOnChain = true;
          }
        } catch (e) {
          logger.warn("⚠️ RewardsService: Failed to check on-chain status, proceeding with distribution:", e);
        }

        if (!skipOnChain) {
          // Deduplicate users and sum their amounts (a user may have multiple reward types)
          const aggregatedRewards = new Map<string, bigint>();
          for (let i = 0; i < usersBatch.length; i++) {
            const user = usersBatch[i];
            const amount = amountsBatch[i];
            aggregatedRewards.set(user, (aggregatedRewards.get(user) || 0n) + amount);
          }
          const finalUsers = Array.from(aggregatedRewards.keys());
          const finalAmounts = Array.from(aggregatedRewards.values());
          logger.info(`📊 RewardsService: Aggregated ${usersBatch.length} claims into ${finalUsers.length} unique on-chain recipients`);

          try {
            const txHash = await BlockchainService.distributeRewardsBatch(
              eventId,
              finalUsers,
              finalAmounts,
              uniqueVoters.size
            );
            logger.info(`✅ RewardsService: On-chain distribution successful: ${txHash}`);
            result.transactionHash = txHash;
          } catch (error: any) {
            logger.error('❌ RewardsService: Blockchain distribution failed:', error);
            const msg = error.message ?? '';
            // Known recoverable on-chain states — proceed with DB writes
            const isEventNotActive  = msg.includes('0x0f0c1bc8') || msg.includes('EventNotActive');
            const isPoolNotFound    = msg.includes('0x5add5543'); // contract: no on-chain pool for this event
            if (isEventNotActive) {
              logger.info(`ℹ️ RewardsService: Event already completed on-chain. Proceeding with DB sync.`);
              result.transactionHash = '0x_ALREADY_COMPLETED';
            } else if (isPoolNotFound) {
              logger.info(`ℹ️ RewardsService: No on-chain pool found (0x5add5543). Saving all claims as PENDING — DB-only mode.`);
              // Move validClaims → pendingClaims so they're saved as PENDING (walletStatus unchanged)
              pendingClaims.push(...validClaims);
              validClaims.length = 0;
              result.transactionHash = undefined;
            } else {
              throw error;
            }
          }
        }
      }

      // 2. Database Updates (Synchronous Transaction)
      result.totalRewards = claimsToCreate.reduce((sum, claim) => sum + claim.finalAmount, 0);
      logger.info(`💾 RewardsService: Saving ${validClaims.length} CREDITED + ${pendingClaims.length} PENDING claims (Total: ${result.totalRewards} USDC)`);

      await prisma.$transaction(
        async (tx) => {
          // Save smart-account claims as CREDITED
          for (const claim of validClaims) {
            try {
              const { walletAddress, eoaAddress, ...dbClaim } = claim;
              const saved = await tx.rewardClaim.upsert({
                where: { poolId_userId_claimType: { poolId: dbClaim.poolId, userId: dbClaim.userId, claimType: dbClaim.claimType } },
                create: { ...dbClaim, status: ClaimStatus.CREDITED, walletStatus: WalletStatus.SMART_ACCOUNT, claimedAt: new Date(), transactionHash: result.transactionHash } as any,
                update: { status: ClaimStatus.CREDITED, walletStatus: WalletStatus.SMART_ACCOUNT, claimedAt: new Date(), transactionHash: result.transactionHash } as any,
              });
              logger.info(`✅ RewardsService: CREDITED claim saved: ${saved.id}`);
              result.claimsCreated++;
            } catch (error: any) {
              logger.error(`❌ RewardsService: Failed to save CREDITED claim for ${claim.userId}:`, error.message);
            }
          }

          // Save EOA/no-wallet claims as PENDING
          for (const claim of pendingClaims) {
            try {
              const { walletAddress, eoaAddress, ...dbClaim } = claim;
              const saved = await tx.rewardClaim.upsert({
                where: { poolId_userId_claimType: { poolId: dbClaim.poolId, userId: dbClaim.userId, claimType: dbClaim.claimType } },
                create: { ...dbClaim, status: ClaimStatus.PENDING } as any,
                update: { status: ClaimStatus.PENDING, walletStatus: dbClaim.walletStatus } as any,
              });
              logger.info(`✅ RewardsService: PENDING claim saved: ${saved.id}`);
              result.claimsCreated++;
            } catch (error: any) {
              logger.error(`❌ RewardsService: Failed to save PENDING claim for ${claim.userId}:`, error.message);
            }
          }

          await tx.eventRewardsPool.update({
            where: { id: pool.id },
            data: {
              participantCount: uniqueVoters.size,
              status: RewardsPoolStatus.COMPLETED,
              completedAt: new Date(),
              totalDisbursed: result.totalRewards
            },
          });

          // Increment totalEarnings for all recipients (both CREDITED and PENDING count toward lifetime earnings)
          for (const claim of claimsToCreate) {
            try {
              await tx.user.update({
                where: { id: claim.userId },
                data: {
                  totalEarnings: { increment: claim.finalAmount },
                  totalRewardsClaimed: { increment: 1 }
                }
              });
            } catch (error: any) {
              logger.error(`❌ RewardsService: Failed to increment earnings for ${claim.userId}:`, error);
            }
          }
        },
        { timeout: 60000, maxWait: 10000 }
      );

      logger.info(`✅ RewardsService: Database sync complete. ${result.claimsCreated} claims saved.`);

      // 3. Notifications (Post-DB success)
      for (const notif of notificationQueue) {
        try {
          await NotificationService.createNotification({
            userId: notif.userId,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            metadata: { eventId: event.id }
          });
        } catch (e) {
          logger.error(`⚠️ RewardsService: Failed to send notification to user ${notif.userId}:`, e);
        }
      }

      result.success = true;
    } catch (error: any) {
      logger.error("❌ RewardsService: Process Event Rewards Failed:", error);
      result.errors.push(`Processing failed: ${error.message}`);
    }

    return result;
  }

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

    const BlockchainService = (await import('../lib/blockchain.js')).BlockchainService;
    const NotificationService = (await import('./notificationService.js')).NotificationService;

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
        logger.error(`❌ RewardsService.claimPendingRewards: Failed for event ${eventId}:`, error.message);
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

    // Update claim status and increment user's totalEarnings in a transaction
    const [updatedClaim] = await prisma.$transaction([
      prisma.rewardClaim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.CLAIMED,
          claimedAt: new Date(),
        },
      }),
      // Increment user's totalEarnings
      prisma.user.update({
        where: { id: userId },
        data: {
          totalEarnings: {
            increment: claim.finalAmount,
          },
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
        const { BlockchainService } = await import('../lib/blockchain.js');
        onChainBalance = await BlockchainService.getBrandRefundBalance(brand.walletAddress);
      } catch (e) {
        logger.warn('Failed to fetch on-chain refund balance:', e);
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

      return { ...this.formatPoolInfo(p), onChainEventId: e.onChainEventId, eventTitle: e.title, eventStatus: e.status, refundBreakdown };
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
