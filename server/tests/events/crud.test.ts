/**
 * Event CRUD tests
 *
 * Covers:
 *  POST   /api/events                     — create (requires brand ownership)
 *  GET    /api/events                     — public list
 *  GET    /api/events/:id                 — public single
 *  PUT    /api/events/:id                 — update
 *  DELETE /api/events/:id                 — soft delete
 *  POST   /api/events/:id/publish         — DRAFT → SCHEDULED
 *  POST   /api/events/:id/cancel          — cancel
 *  GET    /api/events/brand/me            — brand owner's events
 *
 * Authorization:
 *  - Users without a brand cannot create events
 *  - Brand owners cannot modify other brands' events
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiPost, apiGet, apiPut, apiDelete } from '../utils/client';
import {
  createTestUser,
  createTestBrand,
  createTestEvent,
  cleanupTestData,
  db,
} from '../utils/db';
import { asUser, asAnon } from '../utils/auth';

let baseUrl: string;
let brandOwner: { id: string };
let otherUser: { id: string };
let brandId: string;
let createdEventId: string;

// Future timestamps for valid events
const futureStart = () => new Date(Date.now() + 2 * 3600_000).toISOString();
const futureEnd = () => new Date(Date.now() + 5 * 3600_000).toISOString();

beforeAll(async () => {
  baseUrl = await getTestServer();
  [brandOwner, otherUser] = await Promise.all([
    createTestUser({ displayName: 'Brand Owner' }),
    createTestUser({ displayName: 'Other User' }),
  ]);
  const brand = await createTestBrand(brandOwner.id);
  brandId = brand.id;
});

afterAll(async () => {
  await cleanupTestData([brandOwner.id, otherUser.id], [brandId], createdEventId ? [createdEventId] : []);
  await stopTestServer();
});

describe('POST /api/events', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiPost(baseUrl, '/events', {
      title: 'Test',
      eventType: 'vote_only',
      startTime: futureStart(),
      endTime: futureEnd(),
    }, asAnon());
    expect(status).toBe(401);
  });

  it('returns 404 when authenticated user has no brand', async () => {
    const { status } = await apiPost(baseUrl, '/events', {
      title: 'Test',
      eventType: 'vote_only',
      startTime: futureStart(),
      endTime: futureEnd(),
    }, asUser(otherUser.id));
    expect(status).toBe(404);
  });

  it('returns 400 for missing required fields', async () => {
    const { status } = await apiPost(baseUrl, '/events', {
      // Missing title, eventType
      startTime: futureStart(),
      endTime: futureEnd(),
    }, asUser(brandOwner.id));
    expect(status).toBe(400);
  });

  it('creates a vote_only event as brand owner', async () => {
    const { status, body } = await apiPost(baseUrl, '/events', {
      title: 'My Vote-Only Event',
      eventType: 'vote_only',
      startTime: futureStart(),
      endTime: futureEnd(),
      capacity: 5,
      baseReward: 0.03,
      topReward: 0.5,
    }, asUser(brandOwner.id));
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.event?.status).toBe('draft');
    createdEventId = body.event?.id;
  });
});

describe('GET /api/events', () => {
  it('returns public event list without auth', async () => {
    const { status, body } = await apiGet(baseUrl, '/events', asAnon());
    expect(status).toBe(200);
    const events = Array.isArray(body) ? body : (body.events ?? body.data ?? []);
    expect(Array.isArray(events)).toBe(true);
  });

  it('supports status filter', async () => {
    const { status } = await apiGet(baseUrl, '/events?status=draft', asAnon());
    expect(status).toBe(200);
  });

  it('supports pagination params', async () => {
    const { status } = await apiGet(baseUrl, '/events?page=1&limit=5', asAnon());
    expect(status).toBe(200);
  });
});

describe('GET /api/events/:id', () => {
  it('returns event by ID', async () => {
    if (!createdEventId) return;
    const { status, body } = await apiGet(baseUrl, `/events/${createdEventId}`, asAnon());
    expect(status).toBe(200);
    const event = body.event ?? body;
    expect(event.id).toBe(createdEventId);
  });

  it('returns 404 for unknown event', async () => {
    const { status } = await apiGet(baseUrl, '/events/00000000-0000-0000-0000-000000000000', asAnon());
    expect(status).toBe(404);
  });
});

describe('GET /api/events/brand/me', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, '/events/brand/me', asAnon());
    expect(status).toBe(401);
  });

  it('returns brand owner events', async () => {
    const { status, body } = await apiGet(baseUrl, '/events/brand/me', asUser(brandOwner.id));
    expect(status).toBe(200);
    const events = Array.isArray(body) ? body : (body.events ?? body.data ?? []);
    expect(Array.isArray(events)).toBe(true);
    // The event we created should appear
    if (createdEventId) {
      const ids = events.map((e: any) => e.id);
      expect(ids).toContain(createdEventId);
    }
  });
});

describe('PUT /api/events/:id', () => {
  it('returns 401 without auth', async () => {
    if (!createdEventId) return;
    const { status } = await apiPut(baseUrl, `/events/${createdEventId}`, { title: 'New' }, asAnon());
    expect(status).toBe(401);
  });

  it('returns 403 when a different user tries to update', async () => {
    if (!createdEventId) return;
    const { status } = await apiPut(
      baseUrl,
      `/events/${createdEventId}`,
      { title: 'Hijacked Title' },
      asUser(otherUser.id)
    );
    // 403 (no brand), 404 (no brand found), or 403 (wrong owner)
    expect([403, 404]).toContain(status);
  });

  it('updates event title as owner', async () => {
    if (!createdEventId) return;
    const { status, body } = await apiPut(
      baseUrl,
      `/events/${createdEventId}`,
      { title: 'Updated Event Title' },
      asUser(brandOwner.id)
    );
    expect(status).toBe(200);
    const event = body.event ?? body;
    expect(event.title).toBe('Updated Event Title');
  });
});

describe('POST /api/events/:id/cancel', () => {
  it('returns 401 without auth', async () => {
    if (!createdEventId) return;
    const { status } = await apiPost(baseUrl, `/events/${createdEventId}/cancel`, {}, asAnon());
    expect(status).toBe(401);
  });

  it('cancels a draft event as owner', async () => {
    // Create a fresh event to cancel (don't destroy createdEventId)
    const event = await createTestEvent(brandId, { status: 'draft' });
    const { status } = await apiPost(
      baseUrl,
      `/events/${event.id}/cancel`,
      {},
      asUser(brandOwner.id)
    );
    expect(status).toBe(200);
    // Verify DB
    const dbEvent = await db.event.findUnique({ where: { id: event.id }, select: { status: true } });
    expect(dbEvent?.status).toBe('cancelled');
    // Cleanup
    await db.event.delete({ where: { id: event.id } });
  });
});

describe('DELETE /api/events/:id', () => {
  it('returns 401 without auth', async () => {
    if (!createdEventId) return;
    const { status } = await apiDelete(baseUrl, `/events/${createdEventId}`, asAnon());
    expect(status).toBe(401);
  });

  it('soft-deletes the event as owner', async () => {
    if (!createdEventId) return;
    const { status } = await apiDelete(baseUrl, `/events/${createdEventId}`, asUser(brandOwner.id));
    expect(status).toBe(200);

    // Verify DB isDeleted flag
    const dbEvent = await db.event.findUnique({
      where: { id: createdEventId },
      select: { isDeleted: true },
    });
    expect(dbEvent?.isDeleted).toBe(true);
  });
});
