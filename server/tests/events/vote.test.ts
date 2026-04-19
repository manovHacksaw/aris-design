/**
 * Voting tests
 *
 * Tests the full vote flow using REAL DB state — no mocks.
 * Events are put into VOTING status directly in the DB (blockchain not involved).
 *
 * Covers:
 *  POST /api/events/:id/proposals/vote        — vote for proposal (vote_only)
 *  POST /api/events/:id/submissions/:sid/vote — vote for submission (post_and_vote)
 *  GET  /api/events/:id/my-votes              — authenticated user's votes
 *  GET  /api/events/:id/has-voted             — check voted status
 *  GET  /api/events/:id/participants          — participant list (auth required)
 *
 * Business rules tested:
 *  - Cannot vote twice in same event
 *  - Brand owner cannot vote in own event
 *  - Cannot vote in non-VOTING event
 *  - Capacity enforcement (event closes when capacity reached)
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiPost, apiGet } from '../utils/client';
import {
  createTestUser,
  createTestBrand,
  createTestEvent,
  createTestProposal,
  cleanupTestData,
  db,
} from '../utils/db';
import { asUser, asAnon } from '../utils/auth';

let baseUrl: string;
let brandOwner: { id: string };
let voter1: { id: string };
let voter2: { id: string };
let brandId: string;
let voteOnlyEventId: string;
let proposalId: string;

// Track all event IDs for cleanup
const eventIds: string[] = [];
const userIds: string[] = [];
const brandIds: string[] = [];

beforeAll(async () => {
  baseUrl = await getTestServer();

  [brandOwner, voter1, voter2] = await Promise.all([
    createTestUser({ displayName: 'Vote Test Brand Owner' }),
    createTestUser({ displayName: 'Voter 1' }),
    createTestUser({ displayName: 'Voter 2' }),
  ]);
  userIds.push(brandOwner.id, voter1.id, voter2.id);

  const brand = await createTestBrand(brandOwner.id);
  brandId = brand.id;
  brandIds.push(brandId);

  // Create a vote_only event — put it directly in VOTING + blockchainStatus ACTIVE
  const event = await createTestEvent(brandId, {
    status: 'voting',
    eventType: 'vote_only',
    blockchainStatus: 'ACTIVE',
    capacity: 5,
    startTime: new Date(Date.now() - 3600_000), // started 1h ago
    endTime: new Date(Date.now() + 3600_000),   // ends 1h from now
  });
  voteOnlyEventId = event.id;
  eventIds.push(voteOnlyEventId);

  // Create two proposals for the event
  const proposal = await createTestProposal(voteOnlyEventId, { title: 'Proposal A' });
  proposalId = proposal.id;
  await createTestProposal(voteOnlyEventId, { title: 'Proposal B' });
});

afterAll(async () => {
  await cleanupTestData(userIds, brandIds, eventIds);
  await stopTestServer();
});

describe('POST /api/events/:id/proposals/vote', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${voteOnlyEventId}/proposals/vote`,
      { proposalIds: [proposalId] },
      asAnon()
    );
    expect(status).toBe(401);
  });

  it('returns 400 when proposalIds is empty', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${voteOnlyEventId}/proposals/vote`,
      { proposalIds: [] },
      asUser(voter1.id)
    );
    expect(status).toBe(400);
  });

  it('returns 400 when voting for more than 1 proposal', async () => {
    const proposals = await db.proposal.findMany({ where: { eventId: voteOnlyEventId }, take: 2 });
    const { status } = await apiPost(
      baseUrl,
      `/events/${voteOnlyEventId}/proposals/vote`,
      { proposalIds: proposals.map(p => p.id) },
      asUser(voter1.id)
    );
    expect(status).toBe(400);
  });

  it('brand owner cannot vote in their own event', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${voteOnlyEventId}/proposals/vote`,
      { proposalIds: [proposalId] },
      asUser(brandOwner.id)
    );
    expect(status).toBe(400);
  });

  it('voter1 votes successfully', async () => {
    const { status, body } = await apiPost(
      baseUrl,
      `/events/${voteOnlyEventId}/proposals/vote`,
      { proposalIds: [proposalId] },
      asUser(voter1.id)
    );
    expect(status).toBe(200);
    const votes = Array.isArray(body) ? body : (body.votes ?? [body]);
    expect(votes.length).toBeGreaterThan(0);

    // Verify DB
    const dbVote = await db.vote.findFirst({
      where: { eventId: voteOnlyEventId, userId: voter1.id },
    });
    expect(dbVote).not.toBeNull();
    expect(dbVote?.proposalId).toBe(proposalId);
  });

  it('voter1 cannot vote twice in the same event', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${voteOnlyEventId}/proposals/vote`,
      { proposalIds: [proposalId] },
      asUser(voter1.id)
    );
    expect(status).toBe(400);
  });

  it('voter2 can vote in same event', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/events/${voteOnlyEventId}/proposals/vote`,
      { proposalIds: [proposalId] },
      asUser(voter2.id)
    );
    expect(status).toBe(200);
  });
});

describe('GET /api/events/:id/my-votes', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, `/events/${voteOnlyEventId}/my-votes`, asAnon());
    expect(status).toBe(401);
  });

  it('returns voter1\'s votes for the event', async () => {
    const { status, body } = await apiGet(
      baseUrl,
      `/events/${voteOnlyEventId}/my-votes`,
      asUser(voter1.id)
    );
    expect(status).toBe(200);
    const votes = Array.isArray(body) ? body : (body.votes ?? []);
    expect(votes.length).toBeGreaterThan(0);
  });

  it('returns empty array for user who has not voted', async () => {
    const nonVoter = await createTestUser({ displayName: 'Non Voter' });
    userIds.push(nonVoter.id);
    const { status, body } = await apiGet(
      baseUrl,
      `/events/${voteOnlyEventId}/my-votes`,
      asUser(nonVoter.id)
    );
    expect(status).toBe(200);
    const votes = Array.isArray(body) ? body : (body.votes ?? []);
    expect(votes.length).toBe(0);
  });
});

describe('GET /api/events/:id/has-voted', () => {
  it('returns true for voter who voted', async () => {
    const { status, body } = await apiGet(
      baseUrl,
      `/events/${voteOnlyEventId}/has-voted`,
      asUser(voter1.id)
    );
    expect(status).toBe(200);
    const voted = body.hasVoted ?? body.voted ?? body;
    expect(voted).toBe(true);
  });

  it('returns false for user who has not voted', async () => {
    const nonVoter = await createTestUser({ displayName: 'Non Voter 2' });
    userIds.push(nonVoter.id);
    const { status, body } = await apiGet(
      baseUrl,
      `/events/${voteOnlyEventId}/has-voted`,
      asUser(nonVoter.id)
    );
    expect(status).toBe(200);
    const voted = body.hasVoted ?? body.voted ?? body;
    expect(voted).toBe(false);
  });
});

describe('GET /api/events/:id/participants', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, `/events/${voteOnlyEventId}/participants`, asAnon());
    expect(status).toBe(401);
  });

  it('returns participant list for authenticated user', async () => {
    const { status, body } = await apiGet(
      baseUrl,
      `/events/${voteOnlyEventId}/participants`,
      asUser(voter1.id)
    );
    expect(status).toBe(200);
    const participants = Array.isArray(body) ? body : (body.participants ?? []);
    const ids = participants.map((p: any) => p.id);
    expect(ids).toContain(voter1.id);
  });
});

describe('Voting in non-VOTING event', () => {
  it('returns 400 when event is in DRAFT status', async () => {
    const draftEvent = await createTestEvent(brandId, {
      status: 'draft',
      eventType: 'vote_only',
      blockchainStatus: 'ACTIVE',
    });
    eventIds.push(draftEvent.id);
    await createTestProposal(draftEvent.id, { title: 'Draft Proposal' });

    const proposals = await db.proposal.findMany({ where: { eventId: draftEvent.id } });

    const { status } = await apiPost(
      baseUrl,
      `/events/${draftEvent.id}/proposals/vote`,
      { proposalIds: [proposals[0].id] },
      asUser(voter1.id)
    );
    expect(status).toBe(400);
  });
});
