import { PrismaClient } from '@prisma/client';
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
  ], provider);

  // Get events with pools
  const pools = await prisma.eventRewardsPool.findMany({
    where: { status: 'ACTIVE' },
    include: { event: true }
  });

  console.log('Events with Active Pools:\n');

  for (const pool of pools) {
    const onChainId = pool.onChainEventId;
    if (!onChainId) continue;

    try {
      const remaining = await contract.getRemainingPool(onChainId);
      const remainingUsdc = Number(remaining) / 1e6;

      // Check if choco_pie already voted
      const existingVote = await prisma.vote.findFirst({
        where: {
          eventId: pool.eventId,
          user: { username: 'choco_pie' }
        }
      });

      console.log(pool.event.title);
      console.log('  Event ID:', pool.eventId);
      console.log('  Remaining: $' + remainingUsdc.toFixed(4) + ' USDC');
      console.log('  Status:', pool.event.status);
      console.log('  Choco voted:', existingVote ? 'YES' : 'NO');
      console.log('');
    } catch (e: any) {
      console.log(pool.event.title + ': Error - ' + e.message);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
