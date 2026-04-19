import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma.js';
import { ClaimType, ClaimStatus, WalletStatus, RewardsPoolStatus } from '@prisma/client';
import {
  REWARDS_CONSTANTS,
  ProcessEventRewardsResult,
} from '../../types/rewards.js';

export class RewardsDistributionService {


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

      if (pool.status === RewardsPoolStatus.COMPLETED) {
        logger.info(`ℹ️ RewardsService: Pool for event ${eventId} is already COMPLETED. Skipping.`);
        result.success = true;
        return result;
      }

      if (pool.status !== RewardsPoolStatus.ACTIVE) {
        logger.info(`ℹ️ RewardsService: Pool for event ${eventId} is ${pool.status}. Proceeding with caution.`);
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
      const BlockchainService = (await import('../../lib/blockchain.js')).BlockchainService;
      const NotificationService = (await import('../social/notificationService.js')).NotificationService;

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
          const chainId = parseInt(process.env.CHAIN_ID || '80002');
          const polygonAmoy = defineChain({ id: chainId, name: 'Polygon Amoy', nativeCurrency: { decimals: 18, name: 'MATIC', symbol: 'MATIC' }, rpcUrls: { default: { http: [process.env.RPC_URL || 'https://rpc-amoy.polygon.technology'] } }, testnet: true });
          const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(process.env.RPC_URL || 'https://rpc-amoy.polygon.technology') });
          const onChainEventId = (await import('../../lib/blockchain.js')).eventIdToBytes32(eventId);
          const vaultAddress = process.env.REWARDS_VAULT_ADDRESS || '0x34C5A617e32c84BC9A54c862723FA5538f42F221';

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
          logger.warn(e, "⚠️ RewardsService: Failed to check on-chain status, proceeding with distribution:");
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
            logger.error(error, '❌ RewardsService: Blockchain distribution failed:');
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
            const { walletAddress, eoaAddress, ...dbClaim } = claim;
            const saved = await tx.rewardClaim.upsert({
              where: { poolId_userId_claimType: { poolId: dbClaim.poolId, userId: dbClaim.userId, claimType: dbClaim.claimType } },
              create: { ...dbClaim, status: ClaimStatus.CREDITED, walletStatus: WalletStatus.SMART_ACCOUNT, claimedAt: new Date(), transactionHash: result.transactionHash } as any,
              update: { status: ClaimStatus.CREDITED, walletStatus: WalletStatus.SMART_ACCOUNT, claimedAt: new Date(), transactionHash: result.transactionHash } as any,
            });
            logger.info(`✅ RewardsService: CREDITED claim saved: ${saved.id}`);
            result.claimsCreated++;
          }

          // Save EOA/no-wallet claims as PENDING
          for (const claim of pendingClaims) {
            const { walletAddress, eoaAddress, ...dbClaim } = claim;
            const saved = await tx.rewardClaim.upsert({
              where: { poolId_userId_claimType: { poolId: dbClaim.poolId, userId: dbClaim.userId, claimType: dbClaim.claimType } },
              create: { ...dbClaim, status: ClaimStatus.PENDING } as any,
              update: { status: ClaimStatus.PENDING, walletStatus: dbClaim.walletStatus } as any,
            });
            logger.info(`✅ RewardsService: PENDING claim saved: ${saved.id}`);
            result.claimsCreated++;
          }

          await tx.eventRewardsPool.update({
            where: { id: pool.id },
            data: {
              participantCount: uniqueVoters.size,
              status: RewardsPoolStatus.COMPLETED,
              completedAt: new Date(),
              totalDisbursed: result.totalRewards,
              processingAttempts: 0, // Reset attempts on success
            },
          });

          // Increment totalEarnings for all recipients (both CREDITED and PENDING count toward lifetime earnings)
          for (const claim of claimsToCreate) {
            await tx.user.update({
              where: { id: claim.userId },
              data: {
                totalEarnings: { increment: claim.finalAmount },
                totalRewardsClaimed: { increment: 1 }
              }
            });
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
          logger.error(e, `⚠️ RewardsService: Failed to send notification to user ${notif.userId}:`);
        }
      }

      result.success = true;
    } catch (error: any) {
      logger.error(error, "❌ RewardsService: Process Event Rewards Failed:");
      result.errors.push(`Processing failed: ${error.message}`);
    }

    return result;
  }
}
