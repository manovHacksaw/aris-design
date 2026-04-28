/**
 * User profile tests
 *
 * Covers:
 *  GET  /api/users/me             — requires auth
 *  PATCH /api/users/profile       — update profile fields
 *  GET  /api/users/:id            — public user lookup
 *  GET  /api/users/username/:u    — lookup by username
 *  GET  /api/users/check-username — availability check
 *  GET  /api/users/me/stats       — authenticated stats
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiGet, apiPatch } from '../utils/client';
import { createTestUser, cleanupTestData, db } from '../utils/db';
import { asUser, asAnon } from '../utils/auth';

let baseUrl: string;
let userId: string;
let username: string;

beforeAll(async () => {
  baseUrl = await getTestServer();
  const user = await createTestUser({ displayName: 'Profile Test User' });
  userId = user.id;
  username = user.username;
});

afterAll(async () => {
  await cleanupTestData([userId]);
  await stopTestServer();
});

describe('GET /api/users/me', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, '/users/me', asAnon());
    expect(status).toBe(401);
  });

  it('returns current user for authenticated call', async () => {
    const { status, body } = await apiGet(baseUrl, '/users/me', asUser(userId));
    expect(status).toBe(200);
    expect(body.id ?? body.user?.id).toBe(userId);
  });
});

describe('GET /api/users/me/stats', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, '/users/me/stats', asAnon());
    expect(status).toBe(401);
  });

  it('returns stats object for authenticated user', async () => {
    const { status, body } = await apiGet(baseUrl, '/users/me/stats', asUser(userId));
    expect(status).toBe(200);
    // Stats should include numeric fields
    expect(typeof (body.totalVotes ?? body.stats?.votes ?? body.stats?.votesCast)).toBe('number');
  });
});

describe('GET /api/users/:id', () => {
  it('returns user by ID without auth', async () => {
    const { status, body } = await apiGet(baseUrl, `/users/${userId}`, asAnon());
    expect(status).toBe(200);
    expect(body.id ?? body.user?.id).toBe(userId);
  });

  it('returns 404 for non-existent user ID', async () => {
    const { status } = await apiGet(baseUrl, '/users/00000000-0000-0000-0000-000000000000', asAnon());
    expect(status).toBe(404);
  });
});

describe('GET /api/users/username/:username', () => {
  it('returns user by username', async () => {
    const { status, body } = await apiGet(baseUrl, `/users/username/${username}`, asAnon());
    expect(status).toBe(200);
    const returnedUsername = body.username ?? body.user?.username;
    expect(returnedUsername).toBe(username);
  });

  it('returns 404 for unknown username', async () => {
    const { status } = await apiGet(baseUrl, '/users/username/definitely_no_such_user_xyz123', asAnon());
    expect(status).toBe(404);
  });
});

describe('GET /api/users/check-username', () => {
  it('reports existing username as taken', async () => {
    const { status, body } = await apiGet(
      baseUrl,
      `/users/check-username?username=${username}`,
      asAnon()
    );
    expect(status).toBe(200);
    expect(body.available).toBe(false);
  });

  it('reports non-existent username as available', async () => {
    const { status, body } = await apiGet(
      baseUrl,
      '/users/check-username?username=definitely_unused_xyz_999',
      asAnon()
    );
    expect(status).toBe(200);
    expect(body.available).toBe(true);
  });
});

describe('PATCH /api/users/profile', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiPatch(baseUrl, '/users/profile', { displayName: 'New Name' }, asAnon());
    expect(status).toBe(401);
  });

  it('updates display name for authenticated user', async () => {
    const newName = 'Updated Display Name';
    const { status, body } = await apiPatch(
      baseUrl,
      '/users/profile',
      { displayName: newName },
      asUser(userId)
    );
    expect(status).toBe(200);
    const returnedName = body.displayName ?? body.user?.displayName;
    expect(returnedName).toBe(newName);

    // Verify DB was updated
    const dbUser = await db.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    expect(dbUser?.displayName).toBe(newName);
  });

  it('updates bio field', async () => {
    const bio = 'Test bio content for profile test';
    const { status, body } = await apiPatch(
      baseUrl,
      '/users/profile',
      { bio },
      asUser(userId)
    );
    expect(status).toBe(200);
    const returnedBio = body.bio ?? body.user?.bio;
    expect(returnedBio).toBe(bio);
  });
});

describe('GET /api/users (list)', () => {
  it('returns a list of users without auth', async () => {
    const { status, body } = await apiGet(baseUrl, '/users', asAnon());
    expect(status).toBe(200);
    // Should be an array or paginated response
    const users = Array.isArray(body) ? body : (body.users ?? body.data ?? []);
    expect(Array.isArray(users)).toBe(true);
  });
});
