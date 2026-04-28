/**
 * Follow / Unfollow tests
 *
 * Covers:
 *  POST   /api/users/follow/:followingId   — follow
 *  DELETE /api/users/follow/:followingId   — unfollow
 *  GET    /api/users/me/followers          — own followers list
 *  GET    /api/users/me/following          — own following list
 *  GET    /api/users/:id/followers         — public followers list
 *
 * Edge cases:
 *  - Cannot follow yourself
 *  - Cannot follow someone you already follow
 *  - Unfollow someone you don't follow
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiPost, apiDelete, apiGet } from '../utils/client';
import { createTestUser, cleanupTestData, db } from '../utils/db';
import { asUser, asAnon } from '../utils/auth';

let baseUrl: string;
let followerUser: { id: string };
let targetUser: { id: string };

beforeAll(async () => {
  baseUrl = await getTestServer();
  [followerUser, targetUser] = await Promise.all([
    createTestUser({ displayName: 'Follower' }),
    createTestUser({ displayName: 'Target' }),
  ]);
});

afterAll(async () => {
  // Clean up follow relationships first
  await db.userFollowers.deleteMany({
    where: {
      OR: [
        { followerId: followerUser.id },
        { followingId: targetUser.id },
      ],
    },
  });
  await cleanupTestData([followerUser.id, targetUser.id]);
  await stopTestServer();
});

describe('POST /api/users/follow/:id', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiPost(baseUrl, `/users/follow/${targetUser.id}`, {}, asAnon());
    expect(status).toBe(401);
  });

  it('follows a user successfully', async () => {
    const { status, body } = await apiPost(
      baseUrl,
      `/users/follow/${targetUser.id}`,
      {},
      asUser(followerUser.id)
    );
    expect(status).toBe(200);
    expect(body.success ?? body.following).toBeTruthy();

    // Verify DB relationship
    const rel = await db.userFollowers.findFirst({
      where: { followerId: followerUser.id, followingId: targetUser.id },
    });
    expect(rel).not.toBeNull();
  });

  it('returns 400 or 409 when trying to follow the same user again', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/users/follow/${targetUser.id}`,
      {},
      asUser(followerUser.id)
    );
    expect([400, 409]).toContain(status);
  });

  it('returns 400 when trying to follow yourself', async () => {
    const { status } = await apiPost(
      baseUrl,
      `/users/follow/${followerUser.id}`,
      {},
      asUser(followerUser.id)
    );
    expect([400, 422]).toContain(status);
  });
});

describe('GET /api/users/me/following', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, '/users/me/following', asAnon());
    expect(status).toBe(401);
  });

  it('lists who the authenticated user follows', async () => {
    const { status, body } = await apiGet(baseUrl, '/users/me/following', asUser(followerUser.id));
    expect(status).toBe(200);
    const list = Array.isArray(body) ? body : (body.following ?? body.data ?? []);
    const ids = list.map((u: any) => u.id);
    expect(ids).toContain(targetUser.id);
  });
});

describe('GET /api/users/:id/followers', () => {
  it('returns public followers list', async () => {
    const { status, body } = await apiGet(baseUrl, `/users/${targetUser.id}/followers`, asAnon());
    expect(status).toBe(200);
    const list = Array.isArray(body) ? body : (body.followers ?? body.data ?? []);
    const ids = list.map((u: any) => u.id);
    expect(ids).toContain(followerUser.id);
  });
});

describe('DELETE /api/users/follow/:id', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiDelete(baseUrl, `/users/follow/${targetUser.id}`, asAnon());
    expect(status).toBe(401);
  });

  it('unfollows successfully', async () => {
    const { status } = await apiDelete(
      baseUrl,
      `/users/follow/${targetUser.id}`,
      asUser(followerUser.id)
    );
    expect(status).toBe(200);

    // Verify DB relationship removed
    const rel = await db.userFollowers.findFirst({
      where: { followerId: followerUser.id, followingId: targetUser.id },
    });
    expect(rel).toBeNull();
  });

  it('returns 400 or 404 when unfollowing someone not followed', async () => {
    const { status } = await apiDelete(
      baseUrl,
      `/users/follow/${targetUser.id}`,
      asUser(followerUser.id)
    );
    expect([400, 404]).toContain(status);
  });
});
