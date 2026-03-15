/**
 * retryRewards.ts — Re-run processEventRewards for a completed event
 * whose rewards failed due to blockchain timeout / dropped tx.
 *
 * Usage:
 *   EVENT_ID=xxx bun run src/scripts/retryRewards.ts
 */
import { RewardsService } from '../services/rewardsService.js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();
const EVENT_ID = process.env.EVENT_ID ?? '128d25c8-35c4-429d-a0e8-39159d718c8a';

const event = await prisma.event.findUnique({ where: { id: EVENT_ID }, select: { status: true, title: true } });
const pool  = await prisma.eventRewardsPool.findUnique({ where: { eventId: EVENT_ID }, select: { status: true, id: true } });

console.log(`\nEvent  : ${event?.title}`);
console.log(`Status : ${event?.status}`);
console.log(`Pool   : ${pool?.status ?? 'NOT FOUND'}\n`);

if (event?.status !== 'completed') {
  console.error('Event is not completed. Cannot process rewards.');
  process.exit(1);
}
if (!pool) {
  console.error('No rewards pool found.');
  process.exit(1);
}

// Reset pool to ACTIVE so processEventRewards doesn't skip
if (pool.status === 'FINALIZED') {
  console.log('Pool already FINALIZED — skipping retry.');
  process.exit(0);
}

console.log('Calling RewardsService.processEventRewards()...\n');

try {
  const result = await RewardsService.processEventRewards(EVENT_ID);
  console.log('\n── Result ──────────────────────────────────');
  console.log('Success      :', result.success);
  console.log('Claims created:', result.claimsCreated);
  console.log('Total rewards :', `$${result.totalRewards.toFixed(4)}`);
  if (result.errors.length > 0) {
    console.log('Errors        :', result.errors);
  }
} catch (err: any) {
  console.error('\n✗ processEventRewards threw:', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
