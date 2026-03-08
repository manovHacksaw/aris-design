import { PrismaClient, ClaimStatus } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS || '0x2Ece3CBE5734B92cb9E51DB47c904e33DB83157B';
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';

// User email to sync
const USER_EMAIL = 'manovmandal@gmail.com';

// Smart Account address for this user (from error logs)
const SMART_ACCOUNT_ADDRESS = '0x977Dc738c29F9a6378B58557A91dc6C9EC0bd62F';

const claimTypeToNumber: Record<string, number> = {
  'BASE_VOTER': 0,
  'TOP_VOTER': 1,
  'CREATOR': 2,
  'LEADERBOARD': 3
};

async function main() {
  console.log('=== Syncing Claims for', USER_EMAIL, '===\n');
  console.log('Smart Account Address:', SMART_ACCOUNT_ADDRESS);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    REWARDS_VAULT_ADDRESS,
    [
      'function hasClaimed(bytes32 eventId, address user, uint8 claimType) view returns (bool)',
      'function nonces(address) view returns (uint256)'
    ],
    provider
  );

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL }
  });

  if (!user) {
    console.log('User not found:', USER_EMAIL);
    return;
  }

  console.log('User found:', user.id, user.username);
  console.log('DB Wallet Address:', user.walletAddress);

  // Get current nonce
  const currentNonce = await contract.nonces(SMART_ACCOUNT_ADDRESS);
  console.log('On-chain nonce:', currentNonce.toString());

  // Get all claims for this user
  const claims = await prisma.rewardClaim.findMany({
    where: { userId: user.id },
    include: {
      pool: {
        include: {
          event: { select: { title: true } }
        }
      }
    }
  });

  console.log(`\nFound ${claims.length} claims for this user\n`);

  let synced = 0;
  let alreadyCorrect = 0;
  let errors = 0;

  for (const claim of claims) {
    const pool = claim.pool;
    const eventTitle = pool.event.title;
    const claimTypeNum = claimTypeToNumber[claim.claimType];

    console.log(`\n--- ${eventTitle} | ${claim.claimType} ---`);
    console.log(`  DB Status: ${claim.status}`);
    console.log(`  Amount: $${claim.finalAmount}`);
    console.log(`  OnChain EventId: ${pool.onChainEventId}`);

    try {
      // Check on-chain status
      const onChainClaimed = await contract.hasClaimed(
        pool.onChainEventId,
        SMART_ACCOUNT_ADDRESS,
        claimTypeNum
      );

      console.log(`  On-chain claimed: ${onChainClaimed}`);

      // Determine if we need to sync
      if (onChainClaimed && claim.status !== ClaimStatus.CLAIMED) {
        console.log(`  → MISMATCH: DB shows ${claim.status} but already claimed on-chain`);
        console.log(`  → Updating DB to CLAIMED...`);

        await prisma.rewardClaim.update({
          where: { id: claim.id },
          data: {
            status: ClaimStatus.CLAIMED,
            claimedAt: new Date()
          }
        });

        synced++;
        console.log(`  ✅ Synced to CLAIMED`);
      } else if (!onChainClaimed && claim.status === ClaimStatus.CLAIMED) {
        console.log(`  ⚠️ WARNING: DB shows CLAIMED but NOT claimed on-chain!`);
        console.log(`  → Resetting to PENDING for re-claim...`);

        await prisma.rewardClaim.update({
          where: { id: claim.id },
          data: {
            status: ClaimStatus.PENDING,
            signature: null,
            signatureExpiry: null,
            transactionHash: null,
            claimedAt: null
          }
        });

        synced++;
        console.log(`  ✅ Reset to PENDING`);
      } else if (!onChainClaimed && (claim.status === ClaimStatus.SIGNED || claim.status === ClaimStatus.PENDING)) {
        console.log(`  → Status is ${claim.status}, not claimed on-chain - CORRECT (can be claimed)`);

        // Reset SIGNED to PENDING to get a fresh signature with correct nonce
        if (claim.status === ClaimStatus.SIGNED) {
          console.log(`  → Resetting SIGNED to PENDING for fresh signature...`);
          await prisma.rewardClaim.update({
            where: { id: claim.id },
            data: {
              status: ClaimStatus.PENDING,
              signature: null,
              signatureExpiry: null
            }
          });
          synced++;
          console.log(`  ✅ Reset to PENDING`);
        } else {
          alreadyCorrect++;
        }
      } else {
        console.log(`  ✓ Already in sync`);
        alreadyCorrect++;
      }
    } catch (error) {
      console.log(`  ❌ Error checking on-chain status:`, error);
      errors++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total claims: ${claims.length}`);
  console.log(`Synced/Updated: ${synced}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Errors: ${errors}`);

  // Show remaining claimable
  const pendingClaims = await prisma.rewardClaim.findMany({
    where: {
      userId: user.id,
      status: ClaimStatus.PENDING
    },
    include: {
      pool: {
        include: { event: { select: { title: true } } }
      }
    }
  });

  if (pendingClaims.length > 0) {
    const totalClaimable = pendingClaims.reduce((sum, c) => sum + c.finalAmount, 0);
    console.log(`\n=== Claimable Rewards ===`);
    console.log(`Total: $${totalClaimable.toFixed(2)} USDC`);
    for (const c of pendingClaims) {
      console.log(`  - ${c.pool.event.title}: ${c.claimType} = $${c.finalAmount.toFixed(2)}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
