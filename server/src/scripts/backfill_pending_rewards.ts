/**
 * Backfill PENDING RewardClaim records for past event winners who had EOA or no-wallet
 * at the time of reward distribution and therefore received no DB record.
 *
 * Run once: npx ts-node --esm src/scripts/backfill_pending_rewards.ts
 * Or via package.json script: npx tsx src/scripts/backfill_pending_rewards.ts
 */

import { prisma } from '../lib/prisma.js';
import { ClaimType, ClaimStatus, WalletStatus } from '@prisma/client';
import { REWARDS_CONSTANTS } from '../types/rewards.js';

const { BASE_REWARD_VOTE_ONLY, USDC_DECIMALS, FIRST_PLACE_BPS, SECOND_PLACE_BPS, THIRD_PLACE_BPS, BPS_DENOMINATOR, BASE_REWARD_POST_VOTE } = REWARDS_CONSTANTS;

function resolveWalletStatus(walletAddress: string | null, eoaAddress: string | null): WalletStatus {
  const hasValidFormat = walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
  if (hasValidFormat && walletAddress !== eoaAddress) return WalletStatus.SMART_ACCOUNT;
  if (hasValidFormat && walletAddress === eoaAddress) return WalletStatus.EOA_PENDING;
  return WalletStatus.NO_WALLET;
}

async function main() {
  console.log('🔄 Starting PENDING reward backfill...');

  // Find all completed pools
  const completedPools = await prisma.eventRewardsPool.findMany({
    where: { status: 'COMPLETED' },
    include: {
      event: {
        include: {
          votes: {
            include: {
              user: { select: { id: true, walletAddress: true, eoaAddress: true, role: true } },
            },
          },
          submissions: {
            where: { status: 'active' },
            include: {
              user: { select: { id: true, walletAddress: true, eoaAddress: true } },
              _count: { select: { votes: true } },
            },
            orderBy: { finalRank: 'asc' },
          },
        },
      },
    },
  });

  console.log(`📋 Found ${completedPools.length} completed pools to process.`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const pool of completedPools) {
    const event = pool.event;
    console.log(`\n🎯 Processing pool for event: "${event.title}" (${event.id})`);

    // Collect all expected claims for this event (mirrors processEventRewards logic)
    const expectedClaims: Array<{
      poolId: string;
      userId: string;
      claimType: ClaimType;
      baseAmount: number;
      multiplier: number;
      finalAmount: number;
      walletStatus: WalletStatus;
    }> = [];

    // Base voter rewards — cap at pool.maxParticipants, USER role only
    const uniqueVoters = new Map<string, { walletAddress: string | null; eoaAddress: string | null }>();
    for (const vote of event.votes) {
      if (vote.user.role !== 'USER') continue;
      if (!uniqueVoters.has(vote.userId)) {
        if (uniqueVoters.size >= pool.maxParticipants) break;
        uniqueVoters.set(vote.userId, { walletAddress: vote.user.walletAddress, eoaAddress: vote.user.eoaAddress });
      }
    }

    for (const [userId, voter] of uniqueVoters) {
      const baseAmount = BASE_REWARD_VOTE_ONLY / Math.pow(10, USDC_DECIMALS);
      expectedClaims.push({
        poolId: pool.id,
        userId,
        claimType: ClaimType.BASE_VOTER,
        baseAmount,
        multiplier: 1.0,
        finalAmount: baseAmount,
        walletStatus: resolveWalletStatus(voter.walletAddress, voter.eoaAddress),
      });
    }

    if (event.eventType === 'post_and_vote') {
      // Creator rewards
      for (const submission of event.submissions) {
        const baseAmount = (BASE_REWARD_POST_VOTE / Math.pow(10, USDC_DECIMALS)) * submission._count.votes;
        expectedClaims.push({
          poolId: pool.id,
          userId: submission.userId,
          claimType: ClaimType.CREATOR,
          baseAmount,
          multiplier: 1.0,
          finalAmount: baseAmount,
          walletStatus: resolveWalletStatus(submission.user.walletAddress, submission.user.eoaAddress),
        });
      }

      // Leaderboard rewards (top 3 submissions)
      const topCreators = event.submissions.slice(0, 3);
      const leaderboardPercentages = [FIRST_PLACE_BPS, SECOND_PLACE_BPS, THIRD_PLACE_BPS];
      for (let i = 0; i < topCreators.length; i++) {
        const creator = topCreators[i];
        const baseAmount = ((pool.leaderboardPoolUsdc ?? 0) * leaderboardPercentages[i]) / BPS_DENOMINATOR;
        expectedClaims.push({
          poolId: pool.id,
          userId: creator.userId,
          claimType: ClaimType.LEADERBOARD,
          baseAmount,
          multiplier: 1.0,
          finalAmount: baseAmount,
          walletStatus: resolveWalletStatus(creator.user.walletAddress, creator.user.eoaAddress),
        });
      }
    }

    // For each expected claim that doesn't exist in DB, create a PENDING record
    for (const claim of expectedClaims) {
      // Only backfill for non-smart-account wallets (smart accounts were already handled)
      if (claim.walletStatus === WalletStatus.SMART_ACCOUNT) {
        totalSkipped++;
        continue;
      }

      const existing = await prisma.rewardClaim.findUnique({
        where: {
          poolId_userId_claimType: {
            poolId: claim.poolId,
            userId: claim.userId,
            claimType: claim.claimType,
          },
        },
      });

      if (existing) {
        // Already exists — update walletStatus if it's missing
        if (!(existing as any).walletStatus || (existing as any).walletStatus === 'NO_WALLET') {
          await prisma.rewardClaim.update({
            where: { id: existing.id },
            data: { walletStatus: claim.walletStatus },
          });
          console.log(`  ↻ Updated walletStatus for existing claim ${existing.id}`);
        }
        totalSkipped++;
        continue;
      }

      try {
        await prisma.rewardClaim.create({
          data: {
            poolId: claim.poolId,
            userId: claim.userId,
            claimType: claim.claimType,
            baseAmount: claim.baseAmount,
            multiplier: claim.multiplier,
            finalAmount: claim.finalAmount,
            status: ClaimStatus.PENDING,
            walletStatus: claim.walletStatus,
          },
        });
        console.log(`  ✅ Created PENDING claim for user ${claim.userId} (${claim.claimType}, $${claim.finalAmount.toFixed(4)})`);
        totalCreated++;
      } catch (error: any) {
        console.error(`  ❌ Failed to create claim for user ${claim.userId}:`, error.message);
      }
    }
  }

  console.log(`\n🎉 Backfill complete.`);
  console.log(`   Created: ${totalCreated} new PENDING claims`);
  console.log(`   Skipped: ${totalSkipped} (already existed or were smart-account claims)`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error during backfill:', err);
  process.exit(1);
});
