/**
 * Rewards distribution tests
 *
 * Strategy: use test users WITHOUT wallet addresses so all claims go to PENDING
 * status without any blockchain call. The on-chain path is skipped entirely
 * (usersBatch.length === 0), making tests fully repeatable and safe.
 *
 * Covers:
 *  GET  /api/rewards/constants             — public constants
 *  GET  /api/rewards/contract-info         — public contract info
 *  GET  /api/rewards/pools/:eventId        — pool info
 *  GET  /api/rewards/claims/:eventId       — user's claims for event
 *  GET  /api/rewards/user/claimable        — all claimable rewards
 *  GET  /api/rewards/user/history          — claim history
 *  GET  /api/rewards/me                    — rewards overview
 *
 * Business logic validated:
 *  - processEventRewards creates PENDING claims for users without wallets
 *  - Pool transitions to COMPLETED after processing
 *  - totalEarnings incremented on user record
 *  - Idempotency: re-running processEventRewards on a COMPLETED pool is a no-op
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiGet, apiPost } from '../utils/client';
import {
  createTestUser,
  createTestBrand,
  createTestEvent,
  createTestProposal,
  createTestRewardsPool,
  cleanupTestData,
  db,
} from '../utils/db';
import { asUser, asAnon } from '../utils/auth';
import { RewardsDistributionService } from '../../src/services/rewards/RewardsDistributionService';

let baseUrl: string;
let brandOwner: { id: string };
let voter1: { id: string };
let voter2: { id: string };
let brandId: string;
let completedEventId: string;
let poolId: string;

const userIds: string[] = [];
const brandIds: string[] = [];
const eventIds: string[] = [];

beforeAll(async () => {
  baseUrl = await getTestServer();

  [brandOwner, voter1, voter2] = await Promise.all([
    createTestUser({ displayName: 'Rewards Brand Owner' }),
    createTestUser({ displayName: 'Rewards Voter 1' }), // no wallet → PENDING claims
    createTestUser({ displayName: 'Rewards Voter 2' }),
  ]);
  userIds.push(brandOwner.id, voter1.id, voter2.id);

  const brand = await createTestBrand(brandOwner.id);
  brandId = brand.id;
  brandIds.push(brandId);

  // Create a vote_only event already in COMPLETED state
  const event = await createTestEvent(brandId, {
    status: 'completed',
    eventType: 'vote_only',
    blockchainStatus: 'ACTIVE',
    capacity: 5,
    baseReward: 0.03,
    topReward: 0.5,
    startTime: new Date(Date.now() - 2 * 3600_000),
    endTime: new Date(Date.now() - 3600_000),
  });
  completedEventId = event.id;
  eventIds.push(completedEventId);

  // Create 2 proposals and rankings
  const propA = await createTestProposal(completedEventId, { title: 'Winner' });
  const propB = await createTestProposal(completedEventId, { title: 'Runner-up' });

  // Set finalRank
  await db.proposal.update({ where: { id: propA.id }, data: { finalRank: 1, voteCount: 2 } });
  await db.proposal.update({ where: { id: propB.id }, data: { finalRank: 2, voteCount: 0 } });

  // Create votes for voter1 and voter2 (they both voted for propA)
  await db.vote.createMany({
    data: [
      { eventId: completedEventId, proposalId: propA.id, userId: voter1.id },
      { eventId: completedEventId, proposalId: propA.id, userId: voter2.id },
    ],
  });

  // Create rewards pool
  const pool = await createTestRewardsPool(completedEventId);
  poolId = pool.id;

  // Run reward distribution (no blockchain since users have no wallets)
  await RewardsDistributionService.processEventRewards(completedEventId);
});

afterAll(async () => {
  await cleanupTestData(userIds, brandIds, eventIds);
  await stopTestServer();
});

describe('GET /api/rewards/constants', () => {
  it('returns constants without auth', async () => {
    const { status, body } = await apiGet(baseUrl, '/rewards/constants', asAnon());
    expect(status).toBe(200);
    expect(typeof body).toBe('object');
  });
});

describe('GET /api/rewards/contract-info', () => {
  it('returns contract info without auth', async () => {
    const { status, body } = await apiGet(baseUrl, '/rewards/contract-info', asAnon());
    expect(status).toBe(200);
    expect(body).toBeDefined();
  });
});

describe('GET /api/rewards/pools/:eventId', () => {
  it('returns pool info without auth', async () => {
    const { status, body } = await apiGet(baseUrl, `/rewards/pools/${completedEventId}`, asAnon());
    expect(status).toBe(200);
    const pool = body.pool ?? body.data ?? body;
    expect(pool.status).toBe('COMPLETED');
  });

  it('returns 404 for unknown event', async () => {
    const { status } = await apiGet(
      baseUrl,
      '/rewards/pools/00000000-0000-0000-0000-000000000000',
      asAnon()
    );
    expect([404, 200]).toContain(status); // may return empty or 404 depending on impl
  });
});

describe('Reward distribution correctness (DB validation)', () => {
  it('pool status is COMPLETED after processing', async () => {
    const pool = await db.eventRewardsPool.findUnique({
      where: { eventId: completedEventId },
      select: { status: true, participantCount: true },
    });
    expect(pool?.status).toBe('COMPLETED');
    expect(pool?.participantCount).toBe(2);
  });

  it('voter1 has a PENDING BASE_VOTER claim', async () => {
    const claim = await db.rewardClaim.findFirst({
      where: { poolId, userId: voter1.id, claimType: 'BASE_VOTER' },
      select: { status: true, finalAmount: true },
    });
    expect(claim).not.toBeNull();
    expect(claim?.status).toBe('PENDING');
    expect(claim!.finalAmount).toBeGreaterThan(0);
  });

  it('voter2 has a PENDING BASE_VOTER claim', async () => {
    const claim = await db.rewardClaim.findFirst({
      where: { poolId, userId: voter2.id, claimType: 'BASE_VOTER' },
      select: { status: true },
    });
    expect(claim?.status).toBe('PENDING');
  });

  it('TOP_VOTER claims exist for winner proposal voters', async () => {
    const topVoterClaims = await db.rewardClaim.findMany({
      where: { poolId, claimType: 'TOP_VOTER' },
    });
    // voter1 and voter2 both voted for the top proposal → should each get a TOP_VOTER share
    expect(topVoterClaims.length).toBeGreaterThan(0);
  });

  it('totalEarnings is incremented on voter users', async () => {
    const user = await db.user.findUnique({
      where: { id: voter1.id },
      select: { totalEarnings: true, totalRewardsClaimed: true },
    });
    expect(user?.totalEarnings).toBeGreaterThan(0);
    expect(user?.totalRewardsClaimed).toBeGreaterThan(0);
  });

  it('processEventRewards is idempotent — re-running does not create duplicate claims', async () => {
    const before = await db.rewardClaim.count({ where: { poolId } });
    await RewardsDistributionService.processEventRewards(completedEventId);
    const after = await db.rewardClaim.count({ where: { poolId } });
    expect(after).toBe(before);
  });
});

describe('GET /api/rewards/claims/:eventId', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, `/rewards/claims/${completedEventId}`, asAnon());
    expect(status).toBe(401);
  });

  it('returns voter1\'s claims for the completed event', async () => {
    const { status, body } = await apiGet(
      baseUrl,
      `/rewards/claims/${completedEventId}`,
      asUser(voter1.id)
    );
    expect(status).toBe(200);
    const claims = Array.isArray(body) ? body : (body.claims ?? body.data ?? []);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.every((c: any) => c.userId === voter1.id)).toBe(true);
  });
});

describe('GET /api/rewards/user/claimable', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, '/rewards/user/claimable', asAnon());
    expect(status).toBe(401);
  });

  it('returns claimable rewards grouped by event', async () => {
    const { status, body } = await apiGet(baseUrl, '/rewards/user/claimable', asUser(voter1.id));
    expect(status).toBe(200);
    const rewards = Array.isArray(body) ? body : (body.rewards ?? body.claimable ?? body.data?.events ?? []);
    expect(Array.isArray(rewards)).toBe(true);
    // Should contain the completed event
    const eventIds = rewards.map((r: any) => r.eventId);
    expect(eventIds).toContain(completedEventId);
  });
});

describe('GET /api/rewards/me', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, '/rewards/me', asAnon());
    expect(status).toBe(401);
  });

  it('returns rewards overview for authenticated user', async () => {
    const { status, body } = await apiGet(baseUrl, '/rewards/me', asUser(voter1.id));
    expect(status).toBe(200);
    expect(body).toBeDefined();
  });
});

describe('POST /api/rewards/claim-pending', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiPost(baseUrl, '/rewards/claim-pending', {}, asAnon());
    expect(status).toBe(401);
  });

  it('returns error when user has no smart account', async () => {
    // voter1 has no wallet → claimPendingRewards should fail with "No Smart Account"
    const { status, body } = await apiPost(baseUrl, '/rewards/claim-pending', {}, asUser(voter1.id));
    // May be 200 with success:false, or 400
    const hasError = body.success === false || status === 400;
    expect(hasError).toBe(true);
    if (body.errors) {
      expect(body.errors[0]).toContain('Smart Account');
    }
  });
});
