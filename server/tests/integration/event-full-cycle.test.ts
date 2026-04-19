/**
 * Full event lifecycle integration test
 *
 * Simulates the complete user journey end-to-end:
 *
 *   1. Brand owner creates event via API
 *   2. Brand owner adds proposals via API
 *   3. Event is put into VOTING state directly (bypasses blockchain + publish flow)
 *   4. Multiple users vote via API
 *   5. Capacity is reached → auto-completion is triggered
 *   6. Event transitions to COMPLETED + rankings computed
 *   7. Reward pool exists and processEventRewards creates PENDING claims
 *   8. Users can query their claimable rewards
 *
 * All users have no wallet → no blockchain calls → 100% repeatable.
 *
 * This test is intentionally sequential (not parallelised) to simulate
 * a real user flow and catch ordering-dependent bugs.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiPost, apiGet } from '../utils/client';
import {
  createTestUser,
  createTestBrand,
  cleanupTestData,
  db,
} from '../utils/db';
import { asUser } from '../utils/auth';
import { RewardsDistributionService } from '../../src/services/rewards/RewardsDistributionService';

let baseUrl: string;
let eventId: string;
let proposalAId: string;
let proposalBId: string;

const brandOwner = { id: '' };
const voters: Array<{ id: string }> = [];
let brandId: string;
const CAPACITY = 3;

beforeAll(async () => {
  baseUrl = await getTestServer();

  // Seed brand owner + voters
  const owner = await createTestUser({ displayName: 'Cycle Brand Owner' });
  brandOwner.id = owner.id;

  for (let i = 0; i < CAPACITY; i++) {
    const v = await createTestUser({ displayName: `Cycle Voter ${i + 1}` });
    voters.push(v);
  }

  const brand = await createTestBrand(brandOwner.id);
  brandId = brand.id;
});

afterAll(async () => {
  const userIds = [brandOwner.id, ...voters.map(v => v.id)];
  await cleanupTestData(userIds, [brandId], eventId ? [eventId] : []);
  await stopTestServer();
});

describe('Step 1: Create event as brand owner', () => {
  it('creates a vote_only event in DRAFT status', async () => {
    const { status, body } = await apiPost(baseUrl, '/events', {
      title: 'Full Cycle Test Event',
      eventType: 'vote_only',
      startTime: new Date(Date.now() + 60_000).toISOString(),
      endTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
      capacity: CAPACITY,
      baseReward: 0.03,
      topReward: 0.5,
    }, asUser(brandOwner.id));

    expect(status).toBe(201);
    expect(body.event.status).toBe('draft');
    eventId = body.event.id;
  });
});

describe('Step 2: Add proposals', () => {
  it('creates proposal A', async () => {
    const { status, body } = await apiPost(
      baseUrl,
      `/events/${eventId}/proposals`,
      { title: 'Option A', content: 'First option', type: 'TEXT' },
      asUser(brandOwner.id)
    );
    expect(status).toBe(201);
    proposalAId = body.proposal?.id ?? body.id;
  });

  it('creates proposal B', async () => {
    const { status, body } = await apiPost(
      baseUrl,
      `/events/${eventId}/proposals`,
      { title: 'Option B', content: 'Second option', type: 'TEXT' },
      asUser(brandOwner.id)
    );
    expect(status).toBe(201);
    proposalBId = body.proposal?.id ?? body.id;
  });
});

describe('Step 3: Force event into VOTING state (simulating blockchain confirmation)', () => {
  it('puts event in VOTING status with ACTIVE blockchain status via DB', async () => {
    // Bypass blockchain + publish flow by updating the DB directly
    // This is intentional test infrastructure — production code never does this
    await db.event.update({
      where: { id: eventId },
      data: {
        status: 'voting',
        blockchainStatus: 'ACTIVE',
        startTime: new Date(Date.now() - 3600_000),
        endTime: new Date(Date.now() + 3600_000),
      },
    });

    // Create the rewards pool (normally created by updateBlockchainStatus endpoint)
    await db.eventRewardsPool.create({
      data: {
        eventId,
        maxParticipants: CAPACITY,
        basePoolUsdc: 0.03 * CAPACITY,
        topPoolUsdc: 0.5,
        leaderboardPoolUsdc: 0,
        platformFeeUsdc: 0.015 * CAPACITY,
        creatorPoolUsdc: 0,
        status: 'ACTIVE',
      },
    });

    const dbEvent = await db.event.findUnique({ where: { id: eventId }, select: { status: true, blockchainStatus: true } });
    expect(dbEvent?.status).toBe('voting');
    expect(dbEvent?.blockchainStatus).toBe('ACTIVE');
  });
});

describe('Step 4: Users vote (fills capacity)', () => {
  it('voter[0] votes for proposal A', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${eventId}/proposals/vote`,
      { proposalIds: [proposalAId] },
      asUser(voters[0].id)
    );
    expect(status).toBe(200);
  });

  it('voter[1] votes for proposal A', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${eventId}/proposals/vote`,
      { proposalIds: [proposalAId] },
      asUser(voters[1].id)
    );
    expect(status).toBe(200);
  });

  it('voter[2] votes and fills capacity → auto-close fires', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${eventId}/proposals/vote`,
      { proposalIds: [proposalBId] },
      asUser(voters[2].id)
    );
    expect(status).toBe(200);

    // Give the async auto-close a moment to complete
    await new Promise(r => setTimeout(r, 500));
  });
});

describe('Step 5: Verify event completed + rankings computed', () => {
  it('event status is COMPLETED', async () => {
    const dbEvent = await db.event.findUnique({
      where: { id: eventId },
      select: { status: true },
    });
    expect(dbEvent?.status).toBe('completed');
  });

  it('proposal A has finalRank = 1 (most votes)', async () => {
    const propA = await db.proposal.findUnique({
      where: { id: proposalAId },
      select: { finalRank: true, voteCount: true },
    });
    expect(propA?.finalRank).toBe(1);
    expect(propA?.voteCount).toBe(2);
  });

  it('proposal B has finalRank = 2', async () => {
    const propB = await db.proposal.findUnique({
      where: { id: proposalBId },
      select: { finalRank: true, voteCount: true },
    });
    expect(propB?.finalRank).toBe(2);
    expect(propB?.voteCount).toBe(1);
  });
});

describe('Step 6: Reward distribution', () => {
  it('manually processes rewards (fire-and-forget already called; this ensures completion)', async () => {
    // processEventRewards may already have run via auto-close → idempotent call is safe
    await RewardsDistributionService.processEventRewards(eventId);
  });

  it('pool is COMPLETED after distribution', async () => {
    const pool = await db.eventRewardsPool.findUnique({
      where: { eventId },
      select: { status: true, participantCount: true },
    });
    expect(pool?.status).toBe('COMPLETED');
    expect(pool?.participantCount).toBe(CAPACITY);
  });

  it('all voters have PENDING BASE_VOTER claims', async () => {
    const pool = await db.eventRewardsPool.findUnique({ where: { eventId }, select: { id: true } });
    for (const voter of voters) {
      const claim = await db.rewardClaim.findFirst({
        where: { poolId: pool!.id, userId: voter.id, claimType: 'BASE_VOTER' },
        select: { status: true, finalAmount: true },
      });
      expect(claim).not.toBeNull();
      expect(claim?.status).toBe('PENDING');
      expect(claim!.finalAmount).toBeGreaterThan(0);
    }
  });

  it('TOP_VOTER claims exist for proposal A voters (position 1)', async () => {
    const pool = await db.eventRewardsPool.findUnique({ where: { eventId }, select: { id: true } });
    const topClaims = await db.rewardClaim.findMany({
      where: { poolId: pool!.id, claimType: 'TOP_VOTER' },
    });
    expect(topClaims.length).toBeGreaterThan(0);
    // voter[0] and voter[1] voted for propA (rank 1) → should each have a TOP_VOTER claim
    const topClaimUserIds = topClaims.map(c => c.userId);
    expect(topClaimUserIds).toContain(voters[0].id);
    expect(topClaimUserIds).toContain(voters[1].id);
  });
});

describe('Step 7: User can query their rewards via API', () => {
  it('voter can see their claimable rewards', async () => {
    const { status, body } = await apiGet(baseUrl, '/rewards/user/claimable', asUser(voters[0].id));
    expect(status).toBe(200);
    const rewards = Array.isArray(body) ? body : (body.rewards ?? body.claimable ?? []);
    const ids = rewards.map((r: any) => r.eventId);
    expect(ids).toContain(eventId);
  });

  it('voter totalEarnings is non-zero after distribution', async () => {
    const user = await db.user.findUnique({
      where: { id: voters[0].id },
      select: { totalEarnings: true },
    });
    expect(user?.totalEarnings).toBeGreaterThan(0);
  });
});

describe('Step 8: Edge cases on completed event', () => {
  it('new voter cannot vote in completed event', async () => {
    const lateVoter = await createTestUser({ displayName: 'Late Voter' });
    const { status } = await apiPost(
      baseUrl,
      `/events/${eventId}/proposals/vote`,
      { proposalIds: [proposalAId] },
      asUser(lateVoter.id)
    );
    expect(status).toBe(400);
    await db.user.delete({ where: { id: lateVoter.id } });
  });

  it('existing voter cannot vote again in completed event', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${eventId}/proposals/vote`,
      { proposalIds: [proposalAId] },
      asUser(voters[0].id)
    );
    expect(status).toBe(400);
  });

  it('completed event is visible publicly', async () => {
    const { status, body } = await apiGet(baseUrl, `/events/${eventId}`);
    expect(status).toBe(200);
    const event = body.event ?? body;
    expect(event.status).toBe('completed');
  });
});
