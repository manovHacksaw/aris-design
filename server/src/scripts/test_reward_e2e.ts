/**
 * test_reward_e2e.ts
 *
 * End-to-end test:
 *   1. Creates a vote_only event for Wai Wai (brand1)
 *   2. Casts votes for every USER-role account (mix of smart + EOA wallets)
 *   3. Completes the event and directly awaits processEventRewards()
 *   4. Prints a verification table showing CREDITED vs PENDING per user
 *
 * Run from /server:
 *   npx tsx src/scripts/test_reward_e2e.ts
 */

import { PrismaClient, WalletStatus } from '@prisma/client';
import { RewardsService } from '../services/rewardsService.js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const BRAND_NAME = 'Wai Wai';
// Pool: enough for all users. BASE_REWARD_VOTE_ONLY = $0.03 each
// topPool = $2.00, sufficient for a winner payout
const MAX_PARTICIPANTS = 25;
const BASE_POOL_USDC   = 0.03 * MAX_PARTICIPANTS; // $0.75
const TOP_POOL_USDC    = 2.00;
const PLATFORM_FEE_USDC = 0.015 * MAX_PARTICIPANTS; // $0.375

function divider(label = '') {
  const line = '─'.repeat(65);
  console.log(label ? `\n${line}\n  ${label}\n${line}` : `\n${line}`);
}

// ── Step 1: Create event + pool ──────────────────────────────────────────────

async function createEvent() {
  divider('STEP 1 — Create Vote-Only Event for ' + BRAND_NAME);

  const brand = await prisma.brand.findFirst({
    where: { name: { contains: BRAND_NAME, mode: 'insensitive' }, ownerId: { not: null } },
    select: { id: true, name: true, ownerId: true },
  });
  if (!brand) throw new Error(`Brand "${BRAND_NAME}" with an owner not found`);
  console.log(`  Brand : ${brand.name} (${brand.id})`);

  const now = new Date();
  const startTime = new Date(now.getTime() - 60_000);          // started 1 min ago
  const endTime   = new Date(now.getTime() + 30 * 60_000);     // ends in 30 min

  const event = await prisma.event.create({
    data: {
      title: `[E2E Test] Reward Flow — ${now.toISOString().slice(0, 16)}`,
      description: 'Automated reward distribution end-to-end test.',
      category: 'Testing',
      eventType: 'vote_only',
      status: 'voting',
      startTime,
      endTime,
      capacity: MAX_PARTICIPANTS,
      baseReward: 0.03,
      topReward: TOP_POOL_USDC,
      brandId: brand.id,
      proposals: {
        create: [
          { type: 'IMAGE', title: 'Option Alpha', content: 'Vote for Alpha', order: 1 },
          { type: 'IMAGE', title: 'Option Beta',  content: 'Vote for Beta',  order: 2 },
        ],
      },
    },
    include: { proposals: true },
  });

  // EventAnalytics row is often required by transitionToCompleted
  await prisma.eventAnalytics.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id },
    update: {},
  });

  const pool = await prisma.eventRewardsPool.create({
    data: {
      eventId: event.id,
      maxParticipants: MAX_PARTICIPANTS,
      basePoolUsdc: BASE_POOL_USDC,
      topPoolUsdc: TOP_POOL_USDC,
      platformFeeUsdc: PLATFORM_FEE_USDC,
      creatorPoolUsdc: 0,
      leaderboardPoolUsdc: 0,
      status: 'ACTIVE',
    },
  });

  console.log(`  Event : ${event.id}`);
  console.log(`  Pool  : ${pool.id}`);
  console.log(`  Proposals:`);
  event.proposals.forEach((p, i) => console.log(`    [${i}] ${p.title} (${p.id.slice(0, 8)}...)`));

  return { event, pool };
}

// ── Step 2: Cast votes ───────────────────────────────────────────────────────

async function castVotes(eventId: string, winnerProposalId: string) {
  divider('STEP 2 — Cast Votes (all USER-role accounts)');

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, username: true, walletAddress: true, eoaAddress: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`  ${users.length} users found\n`);

  let voted = 0;
  let skipped = 0;

  for (const user of users) {
    const existing = await prisma.vote.findFirst({ where: { eventId, userId: user.id } });
    if (existing) {
      console.log(`  ⚠  @${user.username} already voted — skipping`);
      skipped++;
      continue;
    }

    // Classify wallet type for display
    const isSmartAccount = user.walletAddress && user.eoaAddress &&
      user.walletAddress.toLowerCase() !== user.eoaAddress.toLowerCase();
    const isEoa = user.walletAddress && user.eoaAddress &&
      user.walletAddress.toLowerCase() === user.eoaAddress.toLowerCase();
    const walletTag = isSmartAccount ? '🟢 smart' : isEoa ? '🟡 eoa' : '🔴 none ';

    await prisma.$transaction([
      prisma.vote.create({ data: { eventId, userId: user.id, proposalId: winnerProposalId } }),
      prisma.proposal.update({ where: { id: winnerProposalId }, data: { voteCount: { increment: 1 } } }),
      prisma.user.update({ where: { id: user.id }, data: { totalVotes: { increment: 1 } } }),
      prisma.eventAnalytics.update({ where: { eventId }, data: { totalVotes: { increment: 1 }, uniqueParticipants: { increment: 1 } } }),
    ]);

    console.log(`  ${walletTag}  @${(user.username ?? 'unknown').padEnd(24)}  wallet: ${user.walletAddress?.slice(0, 10) ?? 'none'}...`);
    voted++;
  }

  console.log(`\n  Voted: ${voted} | Skipped: ${skipped}`);
  return voted;
}

// ── Step 3: Complete event + directly await processEventRewards ───────────────

async function completeAndProcess(eventId: string) {
  divider('STEP 3 — Complete Event + Process Rewards (awaited)');

  // Compute rankings (required before completing)
  const { EventService } = await import('../services/eventService.js');
  await (EventService as any).computeRankings(eventId);

  await prisma.event.update({ where: { id: eventId }, data: { status: 'completed' } });
  console.log('  Event marked as completed.');

  console.log('  Running RewardsService.processEventRewards()...');
  const result = await RewardsService.processEventRewards(eventId);
  console.log(`\n  Result:`);
  console.log(`    success       : ${result.success}`);
  console.log(`    claimsCreated : ${result.claimsCreated}`);
  console.log(`    totalRewards  : $${result.totalRewards.toFixed(4)}`);
  if (result.transactionHash) console.log(`    txHash        : ${result.transactionHash}`);
  if (result.errors.length) console.log(`    errors        : ${result.errors.join(', ')}`);

  return result;
}

// ── Step 4: Verification report ──────────────────────────────────────────────

async function verify(eventId: string) {
  divider('STEP 4 — Verification Report');

  const claims = await prisma.rewardClaim.findMany({
    where: { pool: { eventId } },
    include: { user: { select: { username: true, walletAddress: true, eoaAddress: true } } },
    orderBy: [{ claimType: 'asc' }, { finalAmount: 'desc' }],
  });

  const pool = await prisma.eventRewardsPool.findUnique({ where: { eventId } });

  console.log(`\n  Pool status  : ${pool?.status}`);
  console.log(`  Total claims : ${claims.length}`);

  const credited = claims.filter(c => c.status === 'CREDITED');
  const pending  = claims.filter(c => c.status === 'PENDING');
  console.log(`  CREDITED     : ${credited.length}`);
  console.log(`  PENDING      : ${pending.length}`);

  if (claims.length === 0) {
    console.log('\n  ⚠  No claims found — rewards may have failed. Check server logs.');
    return;
  }

  console.log(`\n  ${'User'.padEnd(26)} ${'Type'.padEnd(14)} ${'Amount'.padStart(8)}  ${'Status'.padEnd(10)}  ${'WalletStatus'}`);
  console.log(`  ${'─'.repeat(26)} ${'─'.repeat(14)} ${'─'.repeat(8)}  ${'─'.repeat(10)}  ${'─'.repeat(14)}`);

  for (const c of claims) {
    const username = (c.user.username ?? '?').padEnd(26);
    const type     = c.claimType.padEnd(14);
    const amount   = `$${c.finalAmount.toFixed(4)}`.padStart(8);
    const status   = c.status.padEnd(10);
    const ws       = (c as any).walletStatus ?? '—';
    const icon     = c.status === 'CREDITED' ? '✅' : c.status === 'PENDING' ? '⏳' : '❓';
    console.log(`  ${username} ${type} ${amount}  ${status}  ${icon} ${ws}`);
  }

  const totalCredited = credited.reduce((s, c) => s + c.finalAmount, 0);
  const totalPending  = pending.reduce((s, c) => s + c.finalAmount, 0);

  console.log(`\n  Total CREDITED : $${totalCredited.toFixed(4)}`);
  console.log(`  Total PENDING  : $${totalPending.toFixed(4)}`);
  console.log(`  Grand total    : $${(totalCredited + totalPending).toFixed(4)}`);

  // Sanity check: every voter should have exactly one BASE_VOTER claim
  const voterIds = (await prisma.vote.findMany({ where: { eventId }, select: { userId: true } })).map(v => v.userId);
  const uniqueVoterIds = [...new Set(voterIds)];
  const baseVoterClaims = claims.filter(c => c.claimType === 'BASE_VOTER');
  const missingVoters = uniqueVoterIds.filter(uid => !baseVoterClaims.some(c => c.userId === uid));

  if (missingVoters.length > 0) {
    console.log(`\n  ⚠  ${missingVoters.length} voters have no BASE_VOTER claim (hit maxParticipants cap)`);
  } else {
    console.log(`\n  ✅  All ${uniqueVoterIds.length} voters have a BASE_VOTER claim`);
  }

  divider('NEXT STEPS — Frontend Verification');
  console.log(`
  1. Log in as a user showing CREDITED status
     → Go to /wallet — should see "Claimable Rewards" with this event

  2. Log in as a user showing PENDING / EOA_PENDING status
     → Go to /wallet — should see "Pending Rewards" banner
     → If they have initialised a Smart Account, "Claim" button should appear

  3. Check dashboard /dashboard
     → Earnings card should now show non-zero (includes PENDING)
     → Top 3 Finishes card replaces old "Brands" card

  Event ID for further inspection:
    ${eventId}
`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  divider('REWARD DISTRIBUTION — E2E TEST');

  try {
    const { event, pool } = await createEvent();
    const winnerProposal = event.proposals[0]; // "Option Alpha" wins

    await castVotes(event.id, winnerProposal.id);
    await completeAndProcess(event.id);
    await verify(event.id);
  } catch (err: any) {
    console.error('\n✗ FATAL:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
