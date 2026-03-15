import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const REWARDS_VAULT_ABI = [
  'function getPoolInfo(bytes32 eventId) view returns (tuple(uint8 state, uint8 eventType, address brandAddress, uint256 maxParticipants, uint256 basePool, uint256 topPool, uint256 platformFeePool, uint256 creatorPool, uint256 totalDisbursed, uint256 participantCount))',
  'function hasClaimed(bytes32 eventId, address user, uint8 claimType) view returns (bool)',
  'function getRemainingPool(bytes32 eventId) view returns (uint256)',
];

async function checkNikeEvents() {
  const rpcUrl = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
  const contractAddress = process.env.REWARDS_VAULT_ADDRESS || '0x2Ece3CBE5734B92cb9E51DB47c904e33DB83157B';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, REWARDS_VAULT_ABI, provider);

  console.log('=== CHECKING NIKE BRAND EVENTS ON-CHAIN ===\n');
  console.log('Contract:', contractAddress);
  console.log('Network:', rpcUrl);
  console.log('');

  // Get Nike brand
  const nikeBrand = await prisma.brand.findFirst({
    where: { name: { contains: 'Nike', mode: 'insensitive' } },
  });

  if (!nikeBrand) {
    console.log('Nike brand not found');
    return;
  }

  console.log('Nike Brand ID:', nikeBrand.id);
  console.log('');

  // Get all events with pools
  const eventsWithPools = await prisma.event.findMany({
    where: { brandId: nikeBrand.id },
    include: {
      rewardsPool: true,
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${eventsWithPools.length} events for Nike\n`);

  for (const event of eventsWithPools) {
    console.log('━'.repeat(60));
    console.log(`Event: ${event.title}`);
    console.log(`  DB Event ID: ${event.id}`);
    console.log(`  Status: ${event.status}`);
    console.log(`  Type: ${event.eventType}`);
    console.log(`  Votes: ${event._count.votes}`);

    if (!event.rewardsPool) {
      console.log('  Has Pool: NO (no USDC rewards)');
      console.log('');
      continue;
    }

    const pool = event.rewardsPool;
    console.log(`  Has Pool: YES`);
    console.log(`  Pool Status: ${pool.status}`);
    console.log(`  On-Chain Event ID: ${pool.onChainEventId}`);
    console.log(`  Transaction Hash: ${pool.transactionHash || 'None'}`);

    // Check on-chain state
    try {
      const poolInfo = await contract.getPoolInfo(pool.onChainEventId);
      const remaining = await contract.getRemainingPool(pool.onChainEventId);

      const stateNames = ['NOT_CREATED', 'ACTIVE', 'FINALIZED', 'CANCELLED'];
      console.log(`  ON-CHAIN STATE:`);
      console.log(`    State: ${stateNames[poolInfo.state] || poolInfo.state}`);
      console.log(`    Brand Address: ${poolInfo.brandAddress}`);
      console.log(`    Max Participants: ${poolInfo.maxParticipants.toString()}`);
      console.log(`    Base Pool: ${ethers.formatUnits(poolInfo.basePool, 6)} USDC`);
      console.log(`    Top Pool: ${ethers.formatUnits(poolInfo.topPool, 6)} USDC`);
      console.log(`    Total Disbursed: ${ethers.formatUnits(poolInfo.totalDisbursed, 6)} USDC`);
      console.log(`    Remaining: ${ethers.formatUnits(remaining, 6)} USDC`);
      console.log(`    Participant Count: ${poolInfo.participantCount.toString()}`);

      // Verify pool exists
      if (poolInfo.state === 0n) {
        console.log(`    ⚠️  WARNING: Pool does NOT exist on-chain!`);
      } else if (poolInfo.state === 1n) {
        console.log(`    ✓ Pool is ACTIVE on-chain`);
      } else if (poolInfo.state === 2n) {
        console.log(`    ✓ Pool is FINALIZED on-chain`);
      }
    } catch (e: any) {
      console.log(`    ERROR checking on-chain: ${e.message}`);
    }

    // Check claims
    const claims = await prisma.rewardClaim.findMany({
      where: { poolId: pool.id },
      include: { user: { select: { email: true, walletAddress: true } } },
    });

    console.log(`  Claims: ${claims.length}`);
    for (const claim of claims) {
      console.log(`    - ${claim.user.email}: ${claim.claimType} = $${claim.finalAmount} (${claim.status})`);
    }

    console.log('');
  }

  await prisma.$disconnect();
}

checkNikeEvents().catch(console.error);
