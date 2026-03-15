/**
 * inspectEvent.ts
 *
 * Prints a full diagnostic snapshot of an event: status, submissions,
 * votes, reward pool, claims, and user wallet status.
 *
 * Usage:
 *   EVENT_ID=your-event-id bun run src/scripts/inspectEvent.ts
 *   — or set EVENT_ID inside the file below.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_ID = process.env.EVENT_ID ?? 'PASTE_EVENT_ID_HERE';

function divider(label: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${label}\n${'─'.repeat(60)}`);
}

async function main() {
  if (EVENT_ID === 'PASTE_EVENT_ID_HERE') {
    console.error('Set EVENT_ID env var or edit the file. Usage:\n  EVENT_ID=xxx bun run src/scripts/inspectEvent.ts');
    process.exit(1);
  }

  const event = await prisma.event.findUnique({
    where: { id: EVENT_ID },
    include: {
      brand: { select: { name: true } },
      submissions: {
        include: {
          user: { select: { username: true, walletAddress: true, role: true } },
          votes: { select: { userId: true } },
        },
        orderBy: { voteCount: 'desc' },
      },
      votes: {
        include: {
          user: { select: { username: true } },
          submission: { select: { id: true } },
        },
      },
      rewardsPool: {
        include: {
          claims: {
            include: { user: { select: { username: true, walletAddress: true } } },
            orderBy: [{ user: { username: 'asc' } }, { claimType: 'asc' }],
          },
        },
      },
      eventAnalytics: true,
    },
  });

  if (!event) {
    console.error(`Event '${EVENT_ID}' not found.`);
    process.exit(1);
  }

  divider('EVENT');
  console.log(`  Title    : ${event.title}`);
  console.log(`  ID       : ${event.id}`);
  console.log(`  Type     : ${event.eventType}`);
  console.log(`  Status   : ${event.status}`);
  console.log(`  Brand    : ${event.brand.name}`);
  console.log(`  Capacity : ${event.capacity ?? 'unset'}`);
  console.log(`  Start    : ${event.startTime?.toISOString()}`);
  console.log(`  End      : ${event.endTime?.toISOString()}`);
  if (event.eventType === 'post_and_vote') {
    console.log(`  Post Start: ${event.postingStart?.toISOString() ?? '—'}`);
    console.log(`  Post End  : ${event.postingEnd?.toISOString() ?? '—'}`);
  }

  divider('ANALYTICS');
  if (event.eventAnalytics) {
    const a = event.eventAnalytics;
    console.log(`  Total Submissions : ${a.totalSubmissions}`);
    console.log(`  Total Votes       : ${a.totalVotes}`);
    console.log(`  Unique Participants: ${a.uniqueParticipants}`);
    console.log(`  Total Views       : ${a.totalViews}`);
  } else {
    console.log('  No analytics record found.');
  }

  divider('SUBMISSIONS');
  if (event.submissions.length === 0) {
    console.log('  None.');
  }
  for (const sub of event.submissions) {
    const rank = sub.finalRank ? `  [Rank #${sub.finalRank}]` : '';
    const wallet = sub.user.walletAddress ? '✓ wallet' : '✗ NO WALLET';
    console.log(`  @${(sub.user.username ?? '?').padEnd(20)} votes: ${String(sub.voteCount).padStart(3)}${rank}  ${wallet}`);
    console.log(`    submission: ${sub.id}`);
    console.log(`    CID: ${sub.imageCid ?? '—'}`);
  }

  divider('VOTES');
  if (event.votes.length === 0) {
    console.log('  No votes yet.');
  }
  const votesBySubmission = new Map<string, string[]>();
  for (const v of event.votes) {
    const subId = v.submissionId ?? v.proposalId ?? 'unknown';
    if (!votesBySubmission.has(subId)) votesBySubmission.set(subId, []);
    votesBySubmission.get(subId)!.push(v.user.username ?? v.userId);
  }
  for (const [subId, voters] of votesBySubmission) {
    console.log(`  Submission ${subId.slice(0, 8)}...: voted by [${voters.join(', ')}]`);
  }

  divider('REWARDS POOL');
  if (!event.rewardsPool) {
    console.log('  No rewards pool found! Event may not have been created via the UI.');
  } else {
    const p = event.rewardsPool;
    console.log(`  Pool ID         : ${p.id}`);
    console.log(`  Status          : ${p.status}`);
    console.log(`  Base Pool       : $${p.basePoolUsdc}`);
    console.log(`  Top Pool        : $${p.topPoolUsdc}`);
    console.log(`  Creator Pool    : $${p.creatorPoolUsdc}`);
    console.log(`  Leaderboard Pool: $${p.leaderboardPoolUsdc}`);
    console.log(`  Total Disbursed : $${p.totalDisbursed}`);
    console.log(`  Participants    : ${p.participantCount}`);
    console.log(`  Completed At    : ${p.completedAt?.toISOString() ?? '—'}`);

    divider('CLAIMS');
    if (p.claims.length === 0) {
      console.log('  No claims yet. Event not completed or rewards not processed.');
    }
    const byUser = new Map<string, typeof p.claims>();
    for (const c of p.claims) {
      const key = c.user.username ?? c.userId;
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key)!.push(c);
    }
    for (const [username, claims] of byUser) {
      const total = claims.reduce((s, c) => s + c.finalAmount, 0);
      const wallet = claims[0]?.user.walletAddress ? '✓ wallet' : '✗ NO WALLET';
      console.log(`\n  @${username} — $${total.toFixed(4)} total  ${wallet}`);
      for (const c of claims) {
        const icons: Record<string, string> = { credited: '⏳', claimed: '✅', pending: '🔄' };
        const icon = icons[c.status] ?? '?';
        console.log(`    ${icon} ${c.claimType.padEnd(15)} $${c.finalAmount.toFixed(4)}  txHash: ${c.transactionHash?.slice(0, 20) ?? '—'}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  View event  : http://localhost:3000/events/${EVENT_ID}`);
  console.log(`  Brand manage: http://localhost:3000/brand/events/${EVENT_ID}`);
  console.log('═'.repeat(60) + '\n');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
