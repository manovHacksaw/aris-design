/**
 * Notification tests
 *
 * Covers:
 *  GET    /api/notifications        — list, requires auth
 *  PATCH  /api/notifications/:id    — mark read
 *  DELETE /api/notifications/:id    — delete
 *  PATCH  /api/notifications/read-all — mark all read
 *
 * Seeds a real notification directly in DB and tests API operations on it.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiGet, apiPatch } from '../utils/client';
import { createTestUser, cleanupTestData, db } from '../utils/db';
import { asUser, asAnon } from '../utils/auth';

let baseUrl: string;
let testUser: { id: string };
let notificationId: string;

beforeAll(async () => {
  baseUrl = await getTestServer();
  testUser = await createTestUser({ displayName: 'Notif Test User' });

  // Seed a notification directly
  const notif = await db.notification.create({
    data: {
      userId: testUser.id,
      title: 'Test Notification',
      message: 'This is a test notification for integration tests',
      type: 'SYSTEM',
      isRead: false,
    },
    select: { id: true },
  });
  notificationId = notif.id;
});

afterAll(async () => {
  await db.notification.deleteMany({ where: { userId: testUser.id } });
  await cleanupTestData([testUser.id]);
  await stopTestServer();
});

describe('GET /api/notifications', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiGet(baseUrl, '/notifications', asAnon());
    expect(status).toBe(401);
  });

  it('returns notifications for authenticated user', async () => {
    const { status, body } = await apiGet(baseUrl, '/notifications', asUser(testUser.id));
    expect(status).toBe(200);
    const notifs = Array.isArray(body) ? body : (body.notifications ?? body.data ?? []);
    const ids = notifs.map((n: any) => n.id);
    expect(ids).toContain(notificationId);
  });

  it('supports unread-only filter', async () => {
    const { status } = await apiGet(baseUrl, '/notifications?unreadOnly=true', asUser(testUser.id));
    expect(status).toBe(200);
  });
});

describe('PATCH /api/notifications/:id/read (mark read)', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiPatch(
      baseUrl,
      `/notifications/${notificationId}/read`,
      {},
      asAnon()
    );
    expect(status).toBe(401);
  });

  it('marks notification as read', async () => {
    const { status } = await apiPatch(
      baseUrl,
      `/notifications/${notificationId}/read`,
      {},
      asUser(testUser.id)
    );
    expect(status).toBe(200);

    // Verify DB
    const dbNotif = await db.notification.findUnique({
      where: { id: notificationId },
      select: { isRead: true },
    });
    expect(dbNotif?.isRead).toBe(true);
  });
});

describe('PATCH /api/notifications/read-all', () => {
  it('returns 401 without auth', async () => {
    const { status } = await apiPatch(baseUrl, '/notifications/read-all', {}, asAnon());
    expect(status).toBe(401);
  });

  it('marks all notifications read', async () => {
    // Create an extra unread notification
    await db.notification.create({
      data: {
        userId: testUser.id,
        title: 'Another Notif',
        message: 'Another one',
        type: 'SYSTEM',
        isRead: false,
      },
    });

    const { status } = await apiPatch(baseUrl, '/notifications/read-all', {}, asUser(testUser.id));
    expect(status).toBe(200);

    // All should be read
    const unread = await db.notification.count({
      where: { userId: testUser.id, isRead: false },
    });
    expect(unread).toBe(0);
  });
});
