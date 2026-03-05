import { PrismaClient, ClaimStatus, ClaimType } from '@prisma/client';
import { ethers } from 'ethers';
import { VoteService } from '../services/voteService.js';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS || '0x9a30294499b8784b80096b6C6Dd87456972eCA70';

async function main() {
  console.log('='.repeat(60));
  console.log('VOTE AND REWARD CHOCO_PIE USER');
  console.log('='.repeat(60));

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.BACKEND_SIGNER_PRIVATE_KEY;
  if (!privateKey) throw new Error('Private key not configured');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Get choco_pie user
  const user = await prisma.user.findFirst({
    where: { username: 'choco_pie' }
  });

  if (!user || !user.walletAddress) {
    console.log('User choco_pie not found or has no wallet');
    return;
  }

  console.log('\nUser:', user.username, user.email);
  console.log('Smart Account:', user.walletAddress);

  // Get Best Sneaker Design 2026 event
  const event = await prisma.event.findFirst({
    where: {
      title: 'Best Sneaker Design 2026',
      rewardsPool: { isNot: null }
    },
    include: {
      proposals: true,
      rewardsPool: true
    }
  });

  if (!event || !event.rewardsPool) {
    console.log('Event not found');
    return;
  }

  console.log('\nEvent:', event.title);
  console.log('Event ID:', event.id);
  console.log('On-chain Event ID:', event.rewardsPool.onChainEventId);

  // Check if already voted
  const existingVote = await prisma.vote.findFirst({
    where: { eventId: event.id, userId: user.id }
  });

  if (existingVote) {
    console.log('\nChoco_pie already voted on this event');
  } else {
    // Vote for random proposals
    console.log('\n--- Casting Vote ---');
    const proposalIds = event.proposals.slice(0, 2).map(p => p.id);
    console.log('Voting for proposals:', proposalIds);

    try {
      await VoteService.voteForProposals(event.id, user.id, { proposalIds });
      console.log('Vote successful!');
    } catch (e: any) {
      console.log('Vote failed:', e.message);
      // Continue anyway to try crediting any existing rewards
    }
  }

  // Calculate reward amounts
  const baseReward = 0.03; // BASE_REWARD_VOTE_ONLY
  const topReward = event.rewardsPool.topPoolUsdc / event.capacity; // Proportional share of top pool
  const totalReward = baseReward + topReward;

  console.log('\n--- Creating Reward Claims ---');
  console.log('Base Reward: $' + baseReward.toFixed(4));
  console.log('Top Reward: $' + topReward.toFixed(4));
  console.log('Total: $' + totalReward.toFixed(4));

  // Check for existing claims
  const existingClaims = await prisma.rewardClaim.findMany({
    where: {
      userId: user.id,
      poolId: event.rewardsPool.id
    }
  });

  if (existingClaims.length > 0) {
    console.log('\nExisting claims found:', existingClaims.length);
    existingClaims.forEach(c => {
      console.log('  -', c.claimType, '$' + c.finalAmount.toFixed(4), c.status);
    });
  } else {
    // Create reward claims
    const baseClaim = await prisma.rewardClaim.create({
      data: {
        userId: user.id,
        poolId: event.rewardsPool.id,
        claimType: ClaimType.BASE_VOTER,
        baseAmount: baseReward,
        multiplier: 1,
        finalAmount: baseReward,
        status: ClaimStatus.PENDING,
      }
    });
    console.log('Created BASE_VOTER claim:', baseClaim.id);

    const topClaim = await prisma.rewardClaim.create({
      data: {
        userId: user.id,
        poolId: event.rewardsPool.id,
        claimType: ClaimType.TOP_VOTER,
        baseAmount: topReward,
        multiplier: 1,
        finalAmount: topReward,
        status: ClaimStatus.PENDING,
      }
    });
    console.log('Created TOP_VOTER claim:', topClaim.id);
  }

  // Credit rewards on-chain
  console.log('\n--- Crediting Rewards On-Chain ---');

  const contract = new ethers.Contract(
    REWARDS_VAULT_ADDRESS,
    [
      'function creditRewards(bytes32 eventId, address user, uint256 amount)',
      'function getAccumulatedRewards(address user) view returns (uint256)',
      'function getRemainingPool(bytes32 eventId) view returns (uint256)',
    ],
    wallet
  );

  // Check remaining pool
  const remaining = await contract.getRemainingPool(event.rewardsPool.onChainEventId);
  console.log('Remaining pool: $' + (Number(remaining) / 1e6).toFixed(4));

  // Check balance before
  const balanceBefore = await contract.getAccumulatedRewards(user.walletAddress);
  console.log('Balance before: $' + (Number(balanceBefore) / 1e6).toFixed(4));

  // Credit the rewards
  const amountInUsdc = BigInt(Math.round(totalReward * 1_000_000));
  console.log('\nCrediting $' + totalReward.toFixed(4) + ' USDC to Smart Account:', user.walletAddress);

  try {
    const tx = await contract.creditRewards(
      event.rewardsPool.onChainEventId,
      user.walletAddress,
      amountInUsdc
    );
    console.log('TX Hash:', tx.hash);
    await tx.wait();
    console.log('Transaction confirmed!');

    // Update claim status
    await prisma.rewardClaim.updateMany({
      where: {
        userId: user.id,
        poolId: event.rewardsPool.id,
        status: ClaimStatus.PENDING
      },
      data: { status: ClaimStatus.SIGNED }
    });
    console.log('Updated claims to SIGNED');

  } catch (e: any) {
    console.error('Credit failed:', e.message);
  }

  // Check balance after
  const balanceAfter = await contract.getAccumulatedRewards(user.walletAddress);
  console.log('\n' + '='.repeat(60));
  console.log('FINAL BALANCE FOR CHOCO_PIE');
  console.log('='.repeat(60));
  console.log('Smart Account:', user.walletAddress);
  console.log('Accumulated Balance: $' + (Number(balanceAfter) / 1e6).toFixed(4) + ' USDC');
  console.log('\nChoco_pie can now claim rewards in the frontend!');

  await prisma.$disconnect();
}

main().catch(console.error);
