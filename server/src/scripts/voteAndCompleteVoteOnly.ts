/**
 * voteAndCompleteVoteOnly.ts
 * Votes all available users on a vote_only event, completes it,
 * and monitors on-chain reward settlement.
 */

import { PrismaClient } from '@prisma/client';
import { EventService } from '../services/eventService.js';
import { createPublicClient, http, formatUnits } from 'viem';
import { polygonAmoy } from 'viem/chains';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const EVENT_ID    = '128d25c8-35c4-429d-a0e8-39159d718c8a';
// Vote distribution — all voters go to "shoe" (first proposal) to make it the winner
// Change index 0 → 1 for "goat" if you want the other to win
const WINNER_PROPOSAL_IDX = 0;

const REWARDS_VAULT = (process.env.REWARDS_VAULT_ADDRESS ?? '0x34C5A617e32c84BC9A54c862723FA5538f42F221') as `0x${string}`;
const USDC_ADDRESS  = (process.env.TEST_USDC_ADDRESS    ?? '0x61d11C622Bd98A71aD9361833379A2066Ad29CCa') as `0x${string}`;

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.RPC_URL ?? 'https://rpc-amoy.polygon.technology'),
});

const BALANCE_ABI = [{
  name: 'balanceOf', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ type: 'uint256' }],
}] as const;

function divider(label = '') {
  const line = '─'.repeat(60);
  console.log(label ? `\n${line}\n  ${label}\n${line}` : line);
}

// ─── Step 1: Cast votes ───────────────────────────────────────────────────────

async function castVotes() {
  divider('STEP 1 — Cast Votes');

  const proposals = await prisma.proposal.findMany({
    where: { eventId: EVENT_ID },
    orderBy: { createdAt: 'asc' },
  });

  if (proposals.length === 0) throw new Error('No proposals found for this event.');

  const winnerProposal = proposals[WINNER_PROPOSAL_IDX];
  console.log(`\n  Proposals:`);
  proposals.forEach((p, i) => console.log(`    [${i}] ${p.title} (${p.id.slice(0, 8)}...)`));
  console.log(`\n  Voting everyone for: "${winnerProposal.title}"\n`);

  const users = await prisma.user.findMany({
    where: { role: 'USER', walletAddress: { not: null } },
    select: { id: true, username: true, walletAddress: true },
  });

  let voted = 0;
  let skipped = 0;

  for (const user of users) {
    // Skip if already voted
    const existing = await prisma.vote.findFirst({ where: { eventId: EVENT_ID, userId: user.id } });
    if (existing) {
      console.log(`  ⚠  @${user.username} already voted — skipping`);
      skipped++;
      continue;
    }

    await prisma.$transaction([
      prisma.vote.create({
        data: { eventId: EVENT_ID, userId: user.id, proposalId: winnerProposal.id },
      }),
      prisma.proposal.update({
        where: { id: winnerProposal.id },
        data: { voteCount: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { totalVotes: { increment: 1 } },
      }),
      prisma.eventAnalytics.update({
        where: { eventId: EVENT_ID },
        data: { totalVotes: { increment: 1 }, uniqueParticipants: { increment: 1 } },
      }),
    ]);

    console.log(`  ✓  @${user.username} voted for "${winnerProposal.title}"`);
    voted++;
  }

  const event = await prisma.event.findUnique({ where: { id: EVENT_ID }, select: { capacity: true } });
  console.log(`\n  Votes cast: ${voted} | Skipped: ${skipped} | Capacity: ${event?.capacity ?? '?'}`);
  return winnerProposal;
}

// ─── Step 2: Complete event ───────────────────────────────────────────────────

async function completeEvent() {
  divider('STEP 2 — Complete Event + Process Rewards');

  console.log('\n  Calling EventService.transitionToCompleted()...');
  const completed = await EventService.transitionToCompleted(EVENT_ID);
  console.log(`  ✓  Event status: ${completed.status}`);
  console.log('\n  RewardsService.processEventRewards() is running async...');
  console.log('  Waiting 8s for on-chain tx to submit...\n');
  await new Promise(r => setTimeout(r, 8000));
}

// ─── Step 3: Monitor settlement ──────────────────────────────────────────────

async function monitorSettlement() {
  divider('STEP 3 — Monitor On-Chain Settlement');

  const MAX_POLLS = 12;
  const INTERVAL  = 5000; // 5s

  for (let i = 1; i <= MAX_POLLS; i++) {
    const claims = await prisma.rewardClaim.findMany({
      where: { pool: { eventId: EVENT_ID } },
      include: { user: { select: { username: true, walletAddress: true } } },
      orderBy: { finalAmount: 'desc' },
    });

    const pool = await prisma.eventRewardsPool.findUnique({ where: { eventId: EVENT_ID } });

    if (claims.length === 0) {
      console.log(`  [${i}/${MAX_POLLS}] No claims yet — rewards still processing...`);
      await new Promise(r => setTimeout(r, INTERVAL));
      continue;
    }

    console.log(`\n  Poll ${i}/${MAX_POLLS} — Pool status: ${pool?.status}`);
    console.log(`  ${'─'.repeat(55)}`);

    for (const c of claims) {
      const wallet = c.user.walletAddress ? c.user.walletAddress.slice(0, 10) + '...' : 'NO WALLET';
      const statusIcon = c.status === 'credited' ? '⏳ credited' : c.status === 'claimed' ? '✅ claimed' : `❓ ${c.status}`;
      const txShort = c.transactionHash ? c.transactionHash.slice(0, 20) + '...' : '—';
      console.log(`  @${(c.user.username ?? '?').padEnd(22)} $${c.finalAmount.toFixed(4).padStart(8)}  ${statusIcon}  tx: ${txShort}  wallet: ${wallet}`);
    }

    const totalDisbursed = claims.reduce((s, c) => s + c.finalAmount, 0);
    console.log(`\n  Total rewards : $${totalDisbursed.toFixed(4)}`);
    console.log(`  Pool disbursed: $${pool?.totalDisbursed?.toFixed(4) ?? '?'}`);

    // Check on-chain vault balance
    try {
      const vaultBalance = await publicClient.readContract({
        address: USDC_ADDRESS, abi: BALANCE_ABI, functionName: 'balanceOf', args: [REWARDS_VAULT],
      });
      console.log(`  Vault USDC    : ${formatUnits(vaultBalance, 6)}`);
    } catch {
      console.log('  Vault USDC    : (could not read)');
    }

    const allSettled = claims.every(c => ['credited', 'claimed'].includes(c.status));
    const anyTx      = claims.some(c => c.transactionHash);

    if (pool?.status === 'FINALIZED' && allSettled) {
      divider('SETTLEMENT COMPLETE');
      if (anyTx) {
        console.log('\n  On-chain batch tx detected on at least one claim.');
        const txHash = claims.find(c => c.transactionHash)?.transactionHash;
        if (txHash) console.log(`  https://amoy.polygonscan.com/tx/${txHash}`);
      } else {
        console.log('\n  Claims are CREDITED in DB but no on-chain tx hash recorded.');
        console.log('  This means the blockchain batch transfer either:');
        console.log('    a) Is still confirming (re-run inspect in 30s), or');
        console.log('    b) Fell back to Web2 credit mode.');
      }
      break;
    }

    if (i < MAX_POLLS) {
      console.log(`\n  Still settling... polling again in ${INTERVAL / 1000}s`);
      await new Promise(r => setTimeout(r, INTERVAL));
    } else {
      console.log('\n  Max polls reached. Run inspectEvent.ts to check final state.');
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  divider('VOTE-ONLY EVENT CYCLE — Testing Votes');
  try {
    await castVotes();
    await completeEvent();
    await monitorSettlement();

    divider('NEXT: Claim from UI');
    console.log(`
  1. Log in as any user listed above with "credited" status
  2. Go to /wallet
  3. You should see "Claimable Rewards" with this event
  4. Click Claim — watch the on-chain tx fire

  Inspect anytime:
    EVENT_ID=${EVENT_ID} bun run src/scripts/inspectEvent.ts
`);
  } catch (err: any) {
    console.error('\n✗ FATAL:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
