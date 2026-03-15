import { PrismaClient, ClaimStatus } from '@prisma/client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS || '0x9a30294499b8784b80096b6C6Dd87456972eCA70';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(REWARDS_VAULT_ADDRESS, [
    'function getPoolInfo(bytes32) view returns (tuple(uint8 state, uint8 eventType, address brandAddress, uint256 maxParticipants, uint256 basePool, uint256 topPool, uint256 platformFeePool, uint256 creatorPool, uint256 totalDisbursed, uint256 participantCount, uint256 refundAmount, bool refundClaimed))',
    'function getRemainingPool(bytes32) view returns (uint256)',
    'function getAccumulatedRewards(address) view returns (uint256)',
  ], provider);

  // Get latest TITLE event
  const event = await prisma.event.findFirst({
    where: { title: 'TITLE' },
    orderBy: { createdAt: 'desc' },
    include: { rewardsPool: true }
  });

  if (!event || !event.rewardsPool) {
    console.log('Event not found');
    await prisma.$disconnect();
    return;
  }

  console.log('='.repeat(60));
  console.log('POOL STATUS FOR:', event.title);
  console.log('='.repeat(60));
  console.log('Event ID:', event.id);
  console.log('On-chain Event ID:', event.rewardsPool.onChainEventId);

  // Check on-chain pool info
  const poolInfo = await contract.getPoolInfo(event.rewardsPool.onChainEventId);
  console.log('\nON-CHAIN POOL INFO:');
  console.log('  State:', poolInfo.state.toString(), poolInfo.state === 0n ? '(NotCreated)' : poolInfo.state === 1n ? '(Active)' : poolInfo.state === 2n ? '(Finalized)' : '(Cancelled)');
  console.log('  Max Participants:', Number(poolInfo.maxParticipants));
  console.log('  Base Pool: $' + (Number(poolInfo.basePool) / 1e6).toFixed(4));
  console.log('  Top Pool: $' + (Number(poolInfo.topPool) / 1e6).toFixed(4));
  console.log('  Total Disbursed: $' + (Number(poolInfo.totalDisbursed) / 1e6).toFixed(4));
  console.log('  Participant Count:', Number(poolInfo.participantCount));

  const remaining = await contract.getRemainingPool(event.rewardsPool.onChainEventId);
  console.log('  Remaining: $' + (Number(remaining) / 1e6).toFixed(4));

  // Get all users with pending claims for this event
  const pendingClaims = await prisma.rewardClaim.findMany({
    where: {
      poolId: event.rewardsPool.id,
      status: { in: [ClaimStatus.PENDING, ClaimStatus.SIGNED, ClaimStatus.CREDITED] }
    },
    include: {
      user: { select: { id: true, username: true, email: true, walletAddress: true } }
    }
  });

  console.log('\nUSERS WITH UNCLAIMED REWARDS:');
  for (const claim of pendingClaims) {
    const wallet = claim.user.walletAddress || '0x0000000000000000000000000000000000000000';
    const onChainBal = await contract.getAccumulatedRewards(wallet);
    console.log('  ' + (claim.user.username || claim.user.email));
    console.log('    Smart Account:', claim.user.walletAddress);
    console.log('    Claim:', claim.claimType, '$' + claim.finalAmount.toFixed(4), claim.status);
    console.log('    On-chain balance: $' + (Number(onChainBal) / 1e6).toFixed(4));
  }

  // Get all users who voted on this event
  const votes = await prisma.vote.findMany({
    where: { eventId: event.id },
    include: {
      user: { select: { id: true, username: true, email: true, walletAddress: true } }
    },
    distinct: ['userId']
  });

  console.log('\nALL VOTERS ON-CHAIN BALANCES:');
  for (const vote of votes) {
    const wallet = vote.user.walletAddress || '0x0000000000000000000000000000000000000000';
    const bal = await contract.getAccumulatedRewards(wallet);
    console.log('  ' + (vote.user.username || vote.user.email) + ': $' + (Number(bal) / 1e6).toFixed(4) + ' on-chain (Smart Account: ' + vote.user.walletAddress + ')');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
