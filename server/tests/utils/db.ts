/**
 * Test database utilities
 *
 * Provides a Prisma client that connects to the TEST database,
 * plus helper functions for seeding and cleaning up test data.
 *
 * All test entities are stamped with TEST_RUN_ID so multiple
 * concurrent test runs never collide, and cleanup is exact.
 */

import { PrismaClient, UserRole } from '@prisma/client';

// ── Prisma client using TEST_DATABASE_URL ────────────────────────────────────
export const db = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }, // .env.test overrides this to the test DB
  },
  log: [], // silence query logs in tests
});

// ── Unique marker for this test run ─────────────────────────────────────────
export const TEST_RUN_ID = `t${Date.now()}`;

// ── Unique generators ────────────────────────────────────────────────────────
let _seq = 0;
function seq() { return ++_seq; }

export function testEmail(label = 'user') {
  return `${TEST_RUN_ID}_${label}_${seq()}@test.invalid`;
}
export function testUsername(label = 'user') {
  return `${TEST_RUN_ID}_${label}_${seq()}`.slice(0, 30);
}
export function testPrivyId() {
  return `privy_${TEST_RUN_ID}_${seq()}`;
}

// ── Seed helpers ─────────────────────────────────────────────────────────────

export interface TestUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  walletAddress: string | null;
}

export async function createTestUser(overrides: Partial<{
  email: string;
  username: string;
  privyId: string;
  role: UserRole;
  walletAddress: string;
  eoaAddress: string;
  displayName: string;
}> = {}): Promise<TestUser> {
  const user = await db.user.create({
    data: {
      email: overrides.email ?? testEmail(),
      username: overrides.username ?? testUsername(),
      privyId: overrides.privyId ?? testPrivyId(),
      displayName: overrides.displayName ?? 'Test User',
      role: overrides.role ?? UserRole.USER,
      walletAddress: overrides.walletAddress ?? null,
      eoaAddress: overrides.eoaAddress ?? null,
      emailVerified: true,
      phoneVerified: true,
    },
    select: { id: true, email: true, username: true, role: true, walletAddress: true },
  });
  return user as TestUser;
}

export async function createTestAdmin(overrides: Partial<{
  email: string;
  username: string;
}> = {}): Promise<TestUser> {
  // Admin email must be in ALLOWED_ADMIN_EMAILS for the middleware to accept it.
  // Use the email from test env when testing JWT-based admin auth.
  const adminEmail = process.env.ALLOWED_ADMIN_EMAILS?.split(',')[0]?.trim()
    ?? `admin_${TEST_RUN_ID}@test.invalid`;

  return createTestUser({
    email: overrides.email ?? adminEmail,
    username: overrides.username ?? testUsername('admin'),
    role: UserRole.USER, // role in DB doesn't grant admin — email allowlist does
  });
}

export interface TestBrand {
  id: string;
  name: string;
  ownerId: string;
}

export async function createTestBrand(ownerId: string, overrides: Partial<{
  name: string;
  isVerified: boolean;
  isActive: boolean;
}> = {}): Promise<TestBrand> {
  const brand = await db.brand.create({
    data: {
      name: overrides.name ?? `TestBrand_${TEST_RUN_ID}_${seq()}`,
      categories: ['test'],
      ownerId,
      isVerified: overrides.isVerified ?? true,
      isActive: overrides.isActive ?? true,
    },
    select: { id: true, name: true, ownerId: true },
  });
  return brand as TestBrand;
}

export interface TestEvent {
  id: string;
  brandId: string;
  status: string;
  eventType: string;
}

export async function createTestEvent(
  brandId: string,
  overrides: Partial<{
    title: string;
    status: string;
    eventType: 'vote_only' | 'post_and_vote';
    capacity: number;
    blockchainStatus: string;
    startTime: Date;
    endTime: Date;
    baseReward: number;
    topReward: number;
  }> = {}
): Promise<TestEvent> {
  const now = new Date();
  const start = overrides.startTime ?? new Date(now.getTime() + 60_000);
  const end = overrides.endTime ?? new Date(now.getTime() + 2 * 3600_000);

  const event = await db.event.create({
    data: {
      title: overrides.title ?? `Test Event ${TEST_RUN_ID}_${seq()}`,
      brandId,
      status: (overrides.status as any) ?? 'draft',
      eventType: overrides.eventType ?? 'vote_only',
      startTime: start,
      endTime: end,
      capacity: overrides.capacity ?? 10,
      blockchainStatus: (overrides.blockchainStatus as any) ?? 'PENDING',
      baseReward: overrides.baseReward ?? 0.03,
      topReward: overrides.topReward ?? 0.5,
    },
    select: { id: true, brandId: true, status: true, eventType: true },
  });
  return event as TestEvent;
}

export async function createTestProposal(eventId: string, overrides: Partial<{
  title: string;
  content: string;
  type: 'TEXT' | 'IMAGE';
}> = {}) {
  return db.proposal.create({
    data: {
      eventId,
      title: overrides.title ?? `Proposal ${seq()}`,
      content: overrides.content ?? 'Test proposal content',
      type: (overrides.type as any) ?? 'TEXT',
    },
    select: { id: true, eventId: true, title: true },
  });
}

export async function createTestRewardsPool(eventId: string) {
  return db.eventRewardsPool.create({
    data: {
      eventId,
      maxParticipants: 10,
      basePoolUsdc: 0.3,
      topPoolUsdc: 0.5,
      leaderboardPoolUsdc: 0,
      platformFeeUsdc: 0.15,
      creatorPoolUsdc: 0,
      status: 'ACTIVE',
    },
    select: { id: true, eventId: true, status: true },
  });
}

// ── Cleanup helpers ───────────────────────────────────────────────────────────

/**
 * Delete all test data created by this run, in FK-safe order.
 * Call from afterAll() in every test file that seeds data.
 */
export async function cleanupTestData(userIds: string[] = [], brandIds: string[] = [], eventIds: string[] = []) {
  // Delete in FK-dependency order (deepest children first)
  if (eventIds.length) {
    await db.rewardClaim.deleteMany({ where: { pool: { eventId: { in: eventIds } } } });
    await db.eventRewardsPool.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.vote.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.submission.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.proposal.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.eventAnalytics.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.eventInteraction.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.event.deleteMany({ where: { id: { in: eventIds } } });
  }
  if (brandIds.length) {
    await db.brandLevelSnapshot.deleteMany({ where: { brandId: { in: brandIds } } });
    await db.brandApplication.deleteMany({ where: { contactEmail: { contains: TEST_RUN_ID } } });
    await db.brand.deleteMany({ where: { id: { in: brandIds } } });
  }
  if (userIds.length) {
    await db.notification.deleteMany({ where: { userId: { in: userIds } } });
    await db.xpTransaction.deleteMany({ where: { userId: { in: userIds } } });
    await db.userFollowers.deleteMany({
      where: { OR: [{ followerId: { in: userIds } }, { followingId: { in: userIds } }] },
    });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

/**
 * Convenience: delete all records with email/name containing TEST_RUN_ID.
 * Use as a catch-all sweep at the end of a test suite.
 */
export async function sweepTestRunData() {
  const users = await db.user.findMany({
    where: { email: { contains: TEST_RUN_ID } },
    select: { id: true },
  });
  const brands = await db.brand.findMany({
    where: { name: { contains: TEST_RUN_ID } },
    select: { id: true },
  });
  const events = await db.event.findMany({
    where: { title: { contains: TEST_RUN_ID } },
    select: { id: true },
  });

  await cleanupTestData(
    users.map((u) => u.id),
    brands.map((b) => b.id),
    events.map((e) => e.id)
  );
}
