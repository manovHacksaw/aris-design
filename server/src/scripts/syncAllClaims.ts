import { PrismaClient, ClaimStatus, ClaimType } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

// Smart Account addresses mapped from EOA (these are deterministically derived)
// For now, we'll need to manually map or compute these
// In production, you'd store the Smart Account address in the User model

const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS || '0x2Ece3CBE5734B92cb9E51DB47c904e33DB83157B';
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';

const claimTypeToNumber: Record<string, number> = {
  'BASE_VOTER': 0,
  'TOP_VOTER': 1,
  'CREATOR': 2,
  'LEADERBOARD': 3
};

async function main() {
  console.log('=== Syncing All Claims with On-Chain Status ===\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    REWARDS_VAULT_ADDRESS,
    [
      'function hasClaimed(bytes32 eventId, address user, uint8 claimType) view returns (bool)',
      'function nonces(address) view returns (uint256)'
    ],
    provider
  );

  // Get all pools
  const pools = await prisma.eventRewardsPool.findMany({
    where: { status: { in: ['ACTIVE', 'FINALIZED'] } },
    include: {
      event: { select: { title: true } }
    }
  });

  console.log(`Found ${pools.length} active/finalized pools\n`);

  let totalSynced = 0;
  let totalSkipped = 0;

  for (const pool of pools) {
    console.log(`\n--- Pool: ${pool.event.title} ---`);
    console.log(`Event ID: ${pool.eventId}`);
    console.log(`OnChain Event ID: ${pool.onChainEventId}`);

    // Get all claims for this pool
    const claims = await prisma.rewardClaim.findMany({
      where: { poolId: pool.id },
      include: {
        user: { select: { id: true, username: true, walletAddress: true } }
      }
    });

    console.log(`Claims: ${claims.length}`);

    for (const claim of claims) {
      const claimTypeNum = claimTypeToNumber[claim.claimType];

      // Skip if no wallet address
      if (!claim.user?.walletAddress) {
        console.log(`  [SKIP] ${claim.user?.username || 'Unknown'} - No wallet address`);
        totalSkipped++;
        continue;
      }

      // Check if claim has a transaction hash - if so, verify the transaction
      if (claim.transactionHash) {
        try {
          const receipt = await provider.getTransactionReceipt(claim.transactionHash);
          if (receipt && receipt.status === 1) {
            // Transaction succeeded
            if (claim.status !== ClaimStatus.CLAIMED) {
              console.log(`  [SYNC] ${claim.user.username} ${claim.claimType}: TX succeeded, updating to CLAIMED`);
              await prisma.rewardClaim.update({
                where: { id: claim.id },
                data: { status: ClaimStatus.CLAIMED, claimedAt: new Date() }
              });
              totalSynced++;
            }
          }
        } catch (e) {
          // Transaction not found or error, continue
        }
      }

      // For PENDING or SIGNED claims, check on-chain status using hasClaimed
      if (claim.status === ClaimStatus.PENDING || claim.status === ClaimStatus.SIGNED) {
        try {
          const alreadyClaimed = await contract.hasClaimed(
            pool.onChainEventId,
            claim.user.walletAddress,
            claimTypeNum
          );

          if (alreadyClaimed) {
            console.log(`  [SYNC] ${claim.user.username} ${claim.claimType}: Already claimed on-chain, updating DB`);
            await prisma.rewardClaim.update({
              where: { id: claim.id },
              data: {
                status: ClaimStatus.CLAIMED,
                claimedAt: new Date(),
                transactionHash: claim.transactionHash || 'SYNCED_FROM_CHAIN'
              }
            });

            // Update pool disbursed amount if not already counted
            await prisma.eventRewardsPool.update({
              where: { id: pool.id },
              data: {
                totalDisbursed: {
                  increment: claim.finalAmount,
                },
              },
            });

            totalSynced++;
          } else {
            console.log(`  [INFO] ${claim.user.username} ${claim.claimType}: ${claim.status} | ${claim.finalAmount} USDC`);
          }
        } catch (e: any) {
          console.log(`  [ERROR] ${claim.user.username} ${claim.claimType}: Failed to check on-chain status - ${e.message}`);
        }
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Synced: ${totalSynced}`);
  console.log(`Skipped: ${totalSkipped}`);

  // Show all pending/signed claims that users can still claim
  console.log(`\n=== Claimable Rewards Summary ===`);

  const pendingClaims = await prisma.rewardClaim.findMany({
    where: {
      status: { in: [ClaimStatus.PENDING, ClaimStatus.SIGNED] }
    },
    include: {
      user: { select: { username: true, walletAddress: true } },
      pool: {
        include: {
          event: { select: { title: true } }
        }
      }
    },
    orderBy: [
      { pool: { eventId: 'asc' } },
      { userId: 'asc' }
    ]
  });

  let currentEvent = '';
  let totalClaimable = 0;

  for (const claim of pendingClaims) {
    if (claim.pool.event.title !== currentEvent) {
      currentEvent = claim.pool.event.title;
      console.log(`\n📌 ${currentEvent}`);
    }
    console.log(`   ${claim.user?.username || 'Unknown'}: ${claim.claimType} = ${claim.finalAmount} USDC (${claim.status})`);
    totalClaimable += claim.finalAmount;
  }

  console.log(`\n💰 Total Claimable: ${totalClaimable.toFixed(2)} USDC`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
