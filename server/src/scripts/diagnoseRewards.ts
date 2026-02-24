/**
 * Diagnose reward issues for all users
 * Shows which users have rewards and whether they can claim
 */

import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';

const prisma = new PrismaClient();

const REWARDS_VAULT = '0x9a30294499b8784b80096b6C6Dd87456972eCA70';
const RPC_URL = 'https://rpc-amoy.polygon.technology';

const client = createPublicClient({
  chain: {
    id: 80002,
    name: 'Polygon Amoy',
    nativeCurrency: { decimals: 18, name: 'MATIC', symbol: 'MATIC' },
    rpcUrls: { default: { http: [RPC_URL] } },
  } as any,
  transport: http(RPC_URL),
});

const ABI = [{
  inputs: [{ name: 'user', type: 'address' }],
  name: 'getAccumulatedRewards',
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
}] as const;

interface UserRewardStatus {
  username: string;
  dbWallet: string | null;
  dbClaimable: number;
  onChainBalance: number;
  status: 'OK' | 'NO_WALLET' | 'ZERO_ONCHAIN' | 'MISMATCH';
  note: string;
}

async function getOnChainBalance(address: string): Promise<number> {
  try {
    const balance = await client.readContract({
      address: REWARDS_VAULT,
      abi: ABI,
      functionName: 'getAccumulatedRewards',
      args: [address as `0x${string}`],
    });
    return Number(balance) / 1e6;
  } catch {
    return 0;
  }
}

async function diagnose() {
  console.log('='.repeat(70));
  console.log('REWARDS DIAGNOSTIC REPORT');
  console.log('='.repeat(70));
  console.log('');

  // Get all users with pending/claimable rewards
  const usersWithRewards = await prisma.user.findMany({
    where: {
      rewardClaims: {
        some: {
          status: { in: ['PENDING', 'SIGNED', 'CREDITED'] },
        },
      },
    },
    include: {
      rewardClaims: {
        where: {
          status: { in: ['PENDING', 'SIGNED', 'CREDITED'] },
        },
      },
    },
  });

  console.log(`Found ${usersWithRewards.length} users with claimable rewards\n`);

  const results: UserRewardStatus[] = [];

  for (const user of usersWithRewards) {
    const dbClaimable = user.rewardClaims.reduce((sum, c) => sum + c.finalAmount, 0);
    let onChainBalance = 0;
    let status: UserRewardStatus['status'] = 'OK';
    let note = '';

    if (!user.walletAddress) {
      status = 'NO_WALLET';
      note = 'No wallet address in database';
    } else {
      onChainBalance = await getOnChainBalance(user.walletAddress);

      if (onChainBalance === 0 && dbClaimable > 0) {
        status = 'ZERO_ONCHAIN';
        note = 'DB shows rewards but on-chain balance is 0 (likely EOA/SmartAccount mismatch)';
      } else if (Math.abs(onChainBalance - dbClaimable) > 0.01) {
        status = 'MISMATCH';
        note = `On-chain (${onChainBalance.toFixed(2)}) != DB (${dbClaimable.toFixed(2)})`;
      } else {
        note = 'Ready to claim';
      }
    }

    results.push({
      username: user.username || user.email || user.id.slice(0, 8),
      dbWallet: user.walletAddress,
      dbClaimable,
      onChainBalance,
      status,
      note,
    });
  }

  // Print results
  console.log('USER REWARD STATUS:');
  console.log('-'.repeat(70));

  const issues: UserRewardStatus[] = [];
  const ok: UserRewardStatus[] = [];

  for (const r of results) {
    const statusIcon = r.status === 'OK' ? '✅' : '❌';
    console.log(`${statusIcon} ${r.username}`);
    console.log(`   Wallet: ${r.dbWallet || 'NOT SET'}`);
    console.log(`   DB Claimable: $${r.dbClaimable.toFixed(2)}`);
    console.log(`   On-Chain: $${r.onChainBalance.toFixed(2)}`);
    console.log(`   Status: ${r.status} - ${r.note}`);
    console.log('');

    if (r.status === 'OK') {
      ok.push(r);
    } else {
      issues.push(r);
    }
  }

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total users with rewards: ${results.length}`);
  console.log(`✅ OK (can claim): ${ok.length}`);
  console.log(`❌ Issues: ${issues.length}`);
  console.log('');

  if (issues.length > 0) {
    console.log('USERS WITH ISSUES:');
    for (const r of issues) {
      console.log(`- ${r.username}: ${r.status}`);
    }
    console.log('');
    console.log('TO FIX:');
    console.log('1. Have users log out and log back in to sync their smart account address');
    console.log('2. After login, run: npx tsx src/scripts/processRewards.ts <eventId>');
    console.log('3. Or manually: npx tsx src/scripts/updateUserWallet.ts <username> <smartAccountAddr>');
  }

  await prisma.$disconnect();
}

diagnose().catch(console.error);
