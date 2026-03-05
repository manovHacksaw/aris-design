import { PrismaClient, RewardsPoolStatus } from '@prisma/client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS || '0x9a30294499b8784b80096b6C6Dd87456972eCA70';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(REWARDS_VAULT_ADDRESS, [
    'function getRemainingPool(bytes32) view returns (uint256)',
    'function getPoolInfo(bytes32) view returns (tuple(uint8 state, uint8 eventType, address brandAddress, uint256 maxParticipants, uint256 basePool, uint256 topPool, uint256 platformFeePool, uint256 creatorPool, uint256 totalDisbursed, uint256 participantCount, uint256 refundAmount, bool refundClaimed))',
  ], provider);

  const pools = await prisma.eventRewardsPool.findMany({
    where: {
      status: { in: [RewardsPoolStatus.ACTIVE, RewardsPoolStatus.FINALIZED] }
    },
    include: { event: true }
  });

  console.log('='.repeat(60));
  console.log('ALL POOLS WITH REMAINING BALANCE');
  console.log('='.repeat(60));

  let totalRemaining = 0;

  for (const pool of pools) {
    const onChainId = pool.onChainEventId;
    if (!onChainId) continue;

    try {
      const remaining = await contract.getRemainingPool(onChainId);
      const remainingUsdc = Number(remaining) / 1e6;

      if (remainingUsdc > 0) {
        const poolInfo = await contract.getPoolInfo(onChainId);
        totalRemaining += remainingUsdc;

        console.log('\nEvent:', pool.event.title);
        console.log('  DB Status:', pool.status);
        console.log('  On-chain State:', poolInfo.state === 1n ? 'Active' : poolInfo.state === 2n ? 'Finalized' : 'Other');
        console.log('  Remaining: $' + remainingUsdc.toFixed(4) + ' USDC');
        console.log('  On-chain Event ID:', onChainId);
      }
    } catch (e: any) {
      // Skip errors (pool might not exist on-chain)
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TOTAL REMAINING ACROSS ALL POOLS: $' + totalRemaining.toFixed(4) + ' USDC');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(console.error);
