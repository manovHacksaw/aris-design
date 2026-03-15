import { PrismaClient, ClaimStatus } from '@prisma/client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS || '0x9a30294499b8784b80096b6C6Dd87456972eCA70';
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';

async function creditChocoPieRewards() {
  console.log('='.repeat(60));
  console.log('CREDITING REWARDS FOR CHOCO_PIE USER');
  console.log('='.repeat(60));

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.BACKEND_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Private key not configured');
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Get choco_pie user
  const user = await prisma.user.findFirst({
    where: { username: 'choco_pie' }
  });

  if (!user) {
    console.log('User choco_pie not found');
    return;
  }

  console.log('\nUser:', user.username, user.email);
  console.log('Smart Account:', user.walletAddress);

  // Get pending claims for this user
  const claims = await prisma.rewardClaim.findMany({
    where: { 
      userId: user.id,
      status: { in: ['PENDING', 'SIGNED'] }
    },
    include: {
      pool: {
        include: { event: true }
      }
    }
  });

  console.log(`\nFound ${claims.length} pending claims`);

  if (claims.length === 0) {
    console.log('No pending claims to process');
    return;
  }

  // Setup contract
  const contract = new ethers.Contract(
    REWARDS_VAULT_ADDRESS,
    [
      'function creditRewards(bytes32 eventId, address user, uint256 amount)',
      'function getAccumulatedRewards(address user) view returns (uint256)',
    ],
    wallet
  );

  // Check current balance
  const balanceBefore = await contract.getAccumulatedRewards(user.walletAddress);
  console.log(`\nCurrent accumulated balance: $${Number(balanceBefore) / 1e6} USDC`);

  // Group claims by event pool
  const claimsByPool = new Map<string, typeof claims>();
  for (const claim of claims) {
    const poolId = claim.poolId;
    if (!claimsByPool.has(poolId)) {
      claimsByPool.set(poolId, []);
    }
    claimsByPool.get(poolId)!.push(claim);
  }

  // Process each pool's claims
  for (const [poolId, poolClaims] of claimsByPool) {
    const pool = poolClaims[0].pool;
    const onChainEventId = pool.onChainEventId;

    if (!onChainEventId) {
      console.log(`\n⚠️  Pool ${poolId} has no on-chain event ID, skipping`);
      continue;
    }

    const totalAmount = poolClaims.reduce((sum, c) => sum + c.finalAmount, 0);
    const amountInUsdc = BigInt(Math.round(totalAmount * 1_000_000));

    console.log(`\n--- Event: ${pool.event.title} ---`);
    console.log(`On-chain Event ID: ${onChainEventId}`);
    console.log(`Claims: ${poolClaims.map(c => `${c.claimType}=$${c.finalAmount}`).join(', ')}`);
    console.log(`Total: $${totalAmount} USDC`);

    try {
      console.log('Sending creditRewards transaction...');
      const tx = await contract.creditRewards(
        onChainEventId,
        user.walletAddress,
        amountInUsdc
      );
      console.log(`TX: ${tx.hash}`);
      await tx.wait();
      console.log('Transaction confirmed!');

      // Update claim status
      for (const claim of poolClaims) {
        await prisma.rewardClaim.update({
          where: { id: claim.id },
          data: { status: 'SIGNED' as ClaimStatus }
        });
      }
      console.log('Updated claim status to SIGNED');

    } catch (error: any) {
      console.error(`Failed: ${error.message}`);
    }
  }

  // Check new balance
  const balanceAfter = await contract.getAccumulatedRewards(user.walletAddress);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Final accumulated balance: $${Number(balanceAfter) / 1e6} USDC`);
  console.log(`${'='.repeat(60)}`);

  console.log('\n✅ Done! Choco_pie can now claim rewards in the frontend.');

  await prisma.$disconnect();
}

creditChocoPieRewards().catch(console.error);
