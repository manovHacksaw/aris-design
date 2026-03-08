/**
 * testEventCycle.ts
 *
 * Full end-to-end cycle test script for a post_and_vote event.
 *
 * WORKFLOW
 * ─────────────────────────────────────────────────────────────────────────
 *  1. [FRONTEND] You create + publish the event in the brand UI.
 *  2. [SCRIPT]   Run this script with the event ID and voter usernames.
 *              It will:
 *              a) Force the event into voting status (sets timestamps)
 *              b) Create realistic submissions from submitter users
 *              c) Cast votes from voter users
 *              d) Trigger EventService.transitionToCompleted() which:
 *                 - Computes rankings
 *                 - Calls processEventRewards() (on-chain + DB claims)
 *  3. [FRONTEND] Log in as the winning user and claim from /wallet.
 *
 * USAGE
 * ─────────────────────────────────────────────────────────────────────────
 *  1. Edit the CONFIG block below.
 *  2. From server/ directory:
 *       bun run src/scripts/testEventCycle.ts
 *
 * PREREQUISITES
 * ─────────────────────────────────────────────────────────────────────────
 *  - All test users must be registered & onboarded (have walletAddress set)
 *  - The event must exist in the DB with status 'draft' or 'scheduled'
 *  - Server .env must have BACKEND_SIGNER_PRIVATE_KEY + REWARDS_VAULT_ADDRESS
 */

import { PrismaClient } from '@prisma/client';
import { EventService } from '../services/eventService.js';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — edit these before running
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // The event ID from your brand dashboard URL: /brand/events/<EVENT_ID>
  EVENT_ID: 'PASTE_YOUR_EVENT_ID_HERE',

  // Users who will submit posts (username must exist in DB)
  // These become creators — they receive CREATOR + LEADERBOARD rewards
  submitters: [
    { username: 'user1', imageCid: 'QmTestCid1111111111111111111111111111111111111' },
    { username: 'user2', imageCid: 'QmTestCid2222222222222222222222222222222222222' },
  ],

  // Users who will vote (username must exist in DB, must NOT be a submitter)
  // They receive BASE_VOTER + potentially TOP_VOTER rewards
  voters: [
    'user3',
    'user4',
    'user5',
  ],

  // Vote distribution: map voter username → submitter username they vote for
  // Leave empty to auto-distribute (all voters vote for submitters[0])
  voteMap: {} as Record<string, string>,
  // Example: { 'user3': 'user1', 'user4': 'user1', 'user5': 'user2' }
};

// ─────────────────────────────────────────────────────────────────────────────

function divider(label = '') {
  const line = '─'.repeat(60);
  console.log(label ? `\n${line}\n  ${label}\n${line}` : line);
}

function checkmark(msg: string) { console.log(`  ✓  ${msg}`); }
function warn(msg: string)      { console.log(`  ⚠  ${msg}`); }
function fail(msg: string)      { console.log(`  ✗  ${msg}`); }

// ─────────────────────────────────────────────────────────────────────────────

async function resolveUsers(usernames: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>(); // username → userId
  for (const username of usernames) {
    const user = await prisma.user.findFirst({
      where: { username },
      select: { id: true, username: true, walletAddress: true, role: true },
    });
    if (!user) {
      fail(`User '${username}' not found in DB — skipping`);
      continue;
    }
    if (!user.walletAddress) {
      warn(`User '${username}' has no walletAddress — they won't receive on-chain rewards`);
    }
    if (user.role === 'BRAND_OWNER') {
      warn(`User '${username}' is a BRAND_OWNER — cannot submit or vote`);
      continue;
    }
    map.set(username, user.id);
    checkmark(`Resolved ${username} → ${user.id.slice(0, 8)}... wallet: ${user.walletAddress ? '✓' : 'MISSING'}`);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────

async function step1_validateEvent() {
  divider('STEP 1 — Validate Event');

  const event = await prisma.event.findUnique({
    where: { id: CONFIG.EVENT_ID },
    include: {
      rewardsPool: true,
      eventAnalytics: true,
      brand: { select: { id: true, name: true } },
    },
  });

  if (!event) {
    throw new Error(`Event '${CONFIG.EVENT_ID}' not found. Create it from the brand UI first.`);
  }

  console.log(`\n  Event    : ${event.title}`);
  console.log(`  Type     : ${event.eventType}`);
  console.log(`  Status   : ${event.status}`);
  console.log(`  Capacity : ${event.capacity ?? 'unset'}`);
  console.log(`  Brand    : ${event.brand.name}`);

  if (event.eventType !== 'post_and_vote') {
    throw new Error(`This script is written for post_and_vote events. Got: ${event.eventType}`);
  }
  if (['completed', 'cancelled'].includes(event.status)) {
    throw new Error(`Event is already in terminal state '${event.status}'. Create a new one.`);
  }
  if (!event.rewardsPool) {
    warn('EventRewardsPool not found (blockchain tx likely pending/failed). Auto-creating pool for testing...');

    const maxParticipants = event.capacity || 0;
    const basePoolUsdc = ((event as any).baseReward || 0) * maxParticipants;
    const topPoolUsdc = (event as any).topReward || 0;
    const leaderboardPoolUsdc = (event as any).leaderboardPool || (topPoolUsdc / 2);
    const platformFeeUsdc = maxParticipants * 0.02; // post_and_vote rate
    const creatorPoolUsdc = maxParticipants * 0.05;

    await prisma.$transaction([
      prisma.eventRewardsPool.create({
        data: {
          eventId: event.id,
          maxParticipants,
          basePoolUsdc,
          topPoolUsdc,
          leaderboardPoolUsdc,
          platformFeeUsdc,
          creatorPoolUsdc,
          status: 'ACTIVE',
        },
      }),
      prisma.event.update({
        where: { id: event.id },
        data: { blockchainStatus: 'ACTIVE' },
      }),
    ]);

    // Re-fetch with pool
    const refreshed = await prisma.event.findUnique({
      where: { id: CONFIG.EVENT_ID },
      include: { rewardsPool: true, eventAnalytics: true, brand: { select: { id: true, name: true } } },
    });
    checkmark(`Pool auto-created (test mode). blockchainStatus set to ACTIVE.`);
    console.log(`  Base pool : $${refreshed!.rewardsPool!.basePoolUsdc}`);
    console.log(`  Top pool  : $${refreshed!.rewardsPool!.topPoolUsdc}`);
    console.log(`  Leaderboard pool: $${refreshed!.rewardsPool!.leaderboardPoolUsdc}`);
    return refreshed!;
  }

  checkmark(`Event valid. Pool status: ${event.rewardsPool.status}`);
  console.log(`  Base pool : $${event.rewardsPool.basePoolUsdc}`);
  console.log(`  Top pool  : $${event.rewardsPool.topPoolUsdc}`);
  console.log(`  Leaderboard pool: $${event.rewardsPool.leaderboardPoolUsdc}`);

  return event;
}

// ─────────────────────────────────────────────────────────────────────────────

async function step2_forceToVoting(eventId: string) {
  divider('STEP 2 — Force Event to VOTING Status');

  const now = Date.now();
  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'voting',
      startTime: new Date(now - 3 * 60 * 60 * 1000),      // Started 3h ago
      postingStart: new Date(now - 3 * 60 * 60 * 1000),   // Posting started 3h ago
      postingEnd: new Date(now - 1 * 60 * 60 * 1000),     // Posting ended 1h ago
      endTime: new Date(now + 24 * 60 * 60 * 1000),       // Ends in 24h (we'll force complete)
      allowSubmissions: false,
      allowVoting: true,
    },
  });

  checkmark('Event status set to voting');
  checkmark('Timestamps adjusted: posting was 3h-1h ago, voting ends in 24h');
}

// ─────────────────────────────────────────────────────────────────────────────

async function step3_createSubmissions(
  eventId: string,
  submitterMap: Map<string, string>
): Promise<Map<string, string>> {
  divider('STEP 3 — Create Submissions');

  const submissionMap = new Map<string, string>(); // userId → submissionId

  for (const { username, imageCid } of CONFIG.submitters) {
    const userId = submitterMap.get(username);
    if (!userId) {
      warn(`Skipping submission for '${username}' — user not resolved`);
      continue;
    }

    // Check if submission already exists
    const existing = await prisma.submission.findFirst({
      where: { eventId, userId },
    });

    if (existing) {
      warn(`User '${username}' already has submission ${existing.id.slice(0, 8)}... — reusing`);
      submissionMap.set(userId, existing.id);
      continue;
    }

    // Validate CID format (Qm... or bafy...)
    if (!imageCid.startsWith('Qm') && !imageCid.startsWith('bafy')) {
      warn(`CID '${imageCid}' may not be a valid IPFS CID — submitting anyway for test`);
    }

    const submission = await prisma.submission.create({
      data: {
        eventId,
        userId,
        imageCid,
        caption: `Test submission by ${username}`,
        status: 'active',
        voteCount: 0,
      },
    });

    // Create SubmissionStats (mirrors submissionService.createSubmission)
    await prisma.submissionStats.upsert({
      where: { submissionId: submission.id },
      create: { submissionId: submission.id, views: 0, votes: 0 },
      update: {},
    });

    // Increment EventAnalytics
    await prisma.eventAnalytics.update({
      where: { eventId },
      data: { totalSubmissions: { increment: 1 } },
    });

    // Increment user's totalSubmissions
    await prisma.user.update({
      where: { id: userId },
      data: { totalSubmissions: { increment: 1 } },
    });

    submissionMap.set(userId, submission.id);
    checkmark(`Created submission for '${username}' → ${submission.id.slice(0, 8)}...`);
  }

  if (submissionMap.size === 0) {
    throw new Error('No submissions created. Check submitter usernames in CONFIG.');
  }

  return submissionMap;
}

// ─────────────────────────────────────────────────────────────────────────────

async function step4_castVotes(
  eventId: string,
  voterMap: Map<string, string>,
  submitterMap: Map<string, string>,
  submissionMap: Map<string, string>  // userId → submissionId
) {
  divider('STEP 4 — Cast Votes');

  // Build the target submission for each voter
  // Default: everyone votes for the first submitter's submission
  const firstSubmitterUsername = CONFIG.submitters[0]?.username;
  const firstSubmitterId = submitterMap.get(firstSubmitterUsername ?? '');
  const defaultTargetSubmissionId = firstSubmitterId
    ? submissionMap.get(firstSubmitterId)
    : null;

  for (const [voterUsername, voterId] of voterMap.entries()) {
    // Determine target submission
    let targetUsername = CONFIG.voteMap[voterUsername] ?? firstSubmitterUsername;
    let targetUserId = submitterMap.get(targetUsername ?? '');
    let targetSubmissionId = targetUserId ? submissionMap.get(targetUserId) : defaultTargetSubmissionId;

    if (!targetSubmissionId) {
      warn(`No valid submission target for voter '${voterUsername}' — skipping`);
      continue;
    }

    // Safety check: voters cannot vote for themselves
    if (voterId === targetUserId) {
      warn(`'${voterUsername}' is trying to vote for their own submission — skipping`);
      continue;
    }

    // Check if already voted in this event
    const existingVote = await prisma.vote.findFirst({
      where: { eventId, userId: voterId },
    });

    if (existingVote) {
      warn(`'${voterUsername}' already voted in this event — skipping`);
      continue;
    }

    // Create vote
    await prisma.vote.create({
      data: {
        eventId,
        userId: voterId,
        submissionId: targetSubmissionId,
      },
    });

    // Update submission.voteCount
    await prisma.submission.update({
      where: { id: targetSubmissionId },
      data: { voteCount: { increment: 1 } },
    });

    // Update submission stats
    await prisma.submissionStats.update({
      where: { submissionId: targetSubmissionId },
      data: { votes: { increment: 1 } },
    });

    // Update user totalVotes
    await prisma.user.update({
      where: { id: voterId },
      data: { totalVotes: { increment: 1 } },
    });

    // Update event analytics
    await prisma.eventAnalytics.update({
      where: { eventId },
      data: {
        totalVotes: { increment: 1 },
        uniqueParticipants: { increment: 1 },
      },
    });

    checkmark(`'${voterUsername}' voted for submission by '${targetUsername}'`);
  }

  // Print vote summary
  const voteSummary = await prisma.submission.findMany({
    where: { eventId },
    select: { id: true, voteCount: true, user: { select: { username: true } } },
    orderBy: { voteCount: 'desc' },
  });

  console.log('\n  Vote Tally:');
  for (const s of voteSummary) {
    console.log(`    @${s.user.username}: ${s.voteCount} vote(s)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function step5_completeAndProcessRewards(eventId: string) {
  divider('STEP 5 — Complete Event + Process Rewards');

  console.log('\n  Calling EventService.transitionToCompleted()...');
  console.log('  This will:');
  console.log('    → Compute submission rankings (finalRank)');
  console.log('    → Update event status to "completed"');
  console.log('    → Call RewardsService.processEventRewards()');
  console.log('    → Distribute on-chain via creditRewardsBatch()');
  console.log('    → Create RewardClaim records (status: credited)');
  console.log('    → Send reward notifications to users\n');

  try {
    const completedEvent = await EventService.transitionToCompleted(eventId);
    checkmark(`Event transitioned to: ${completedEvent.status}`);
  } catch (err: any) {
    fail(`transitionToCompleted failed: ${err.message}`);
    console.error(err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function step6_printClaimSummary(eventId: string) {
  divider('STEP 6 — Claim Summary');

  const claims = await prisma.rewardClaim.findMany({
    where: { pool: { eventId } },
    include: { user: { select: { username: true, walletAddress: true } } },
    orderBy: [{ user: { username: 'asc' } }, { claimType: 'asc' }],
  });

  if (claims.length === 0) {
    warn('No RewardClaim records found. Check server logs for processEventRewards errors.');
    return;
  }

  console.log(`\n  ${claims.length} claim record(s) created:\n`);

  let totalDisbursed = 0;
  const byUser = new Map<string, typeof claims>();

  for (const c of claims) {
    const key = c.user.username ?? c.userId;
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(c);
    totalDisbursed += c.finalAmount;
  }

  for (const [username, userClaims] of byUser.entries()) {
    const total = userClaims.reduce((s, c) => s + c.finalAmount, 0);
    console.log(`  @${username} — total: $${total.toFixed(4)}`);
    for (const c of userClaims) {
      const icon = c.status === 'credited' ? '✓' : c.status === 'claimed' ? '✓✓' : '?';
      console.log(`    ${icon} ${c.claimType.padEnd(15)} $${c.finalAmount.toFixed(4)}  [${c.status}]`);
    }
  }

  console.log(`\n  Total disbursed : $${totalDisbursed.toFixed(4)}`);

  divider('NEXT STEP — Claim from UI');
  console.log(`
  1. Open the browser: http://localhost:3000
  2. Log in as one of the users listed above who has CREDITED claims.
  3. Navigate to /wallet
  4. You should see "Claimable Rewards" section with the breakdown above.
  5. Click "Claim $X USDC" to trigger the on-chain claim flow.
  6. Verify: confetti fires, USDC balance increases, all claims flip to 'claimed' in DB.

  View event results:
    http://localhost:3000/events/${eventId}

  Brand event manage page:
    http://localhost:3000/brand/events/${eventId}
`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  divider('ARIS — Full Event Cycle Test Script');
  console.log(`  Event ID : ${CONFIG.EVENT_ID}`);
  console.log(`  Submitters: ${CONFIG.submitters.map(s => s.username).join(', ')}`);
  console.log(`  Voters    : ${CONFIG.voters.join(', ')}`);

  if (CONFIG.EVENT_ID === 'PASTE_YOUR_EVENT_ID_HERE') {
    fail('You forgot to set EVENT_ID in the CONFIG block at the top of this file.');
    process.exit(1);
  }

  try {
    // STEP 1: Validate event exists and has a reward pool
    const event = await step1_validateEvent();

    // STEP 2: Force event into voting status
    if (!['voting', 'completed'].includes(event.status)) {
      await step2_forceToVoting(CONFIG.EVENT_ID);
    } else if (event.status === 'voting') {
      warn('Event already in voting status — skipping status transition');
    }

    // STEP 3: Resolve submitter user accounts
    divider('Resolving User Accounts');
    console.log('\n  Submitters:');
    const submitterUsernames = CONFIG.submitters.map(s => s.username);
    const submitterMap = await resolveUsers(submitterUsernames);

    console.log('\n  Voters:');
    const voterMap = await resolveUsers(CONFIG.voters);

    // STEP 4: Create submissions
    const submissionMap = await step3_createSubmissions(CONFIG.EVENT_ID, submitterMap);

    // STEP 5: Cast votes
    await step4_castVotes(CONFIG.EVENT_ID, voterMap, submitterMap, submissionMap);

    // STEP 6: Complete event + process rewards (on-chain + DB)
    await step5_completeAndProcessRewards(CONFIG.EVENT_ID);

    // STEP 7: Print claim summary and next steps
    await step6_printClaimSummary(CONFIG.EVENT_ID);

  } catch (err: any) {
    divider('FATAL ERROR');
    fail(err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
