/**
 * Auth endpoint tests — POST /api/auth/privy-login
 *
 * These tests verify the HTTP layer and service behaviour WITHOUT a real
 * Privy token (which would require a live browser session and expires).
 *
 * What we test:
 *  - Missing privyToken → 400
 *  - Invalid/garbage privyToken → 401  (Privy rejects it)
 *  - Correct response shape on known errors
 *  - Logout endpoint works for authenticated + unauthenticated callers
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiPost, apiGet } from '../utils/client';
import { createTestUser, cleanupTestData } from '../utils/db';
import { asUser, asAnon } from '../utils/auth';

let baseUrl: string;
let testUserId: string;

beforeAll(async () => {
  baseUrl = await getTestServer();
  const user = await createTestUser({ displayName: 'Auth Test User' });
  testUserId = user.id;
});

afterAll(async () => {
  await cleanupTestData([testUserId]);
  await stopTestServer();
});

describe('POST /api/auth/privy-login', () => {
  it('returns 400 when privyToken is missing', async () => {
    const { status, body } = await apiPost(baseUrl, '/auth/privy-login', {});
    expect(status).toBe(400);
    expect(body.error).toContain('privyToken');
  });

  it('returns 400 when privyToken is empty string', async () => {
    const { status, body } = await apiPost(baseUrl, '/auth/privy-login', { privyToken: '' });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 401 when privyToken is a garbage value', async () => {
    const { status } = await apiPost(baseUrl, '/auth/privy-login', {
      privyToken: 'not.a.real.jwt.token',
    });
    // Privy rejects the token → 401
    expect(status).toBe(401);
  });

  it('rejects a structurally valid but fake JWT (401 or 500)', async () => {
    // A well-formed JWT signed with the wrong key.
    // authController maps "Invalid|expired" → 401, other Privy errors → 500.
    // Either means the token was rejected — both are acceptable.
    const fakeJwt =
      'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiJmYWtlX3VzZXIiLCJpYXQiOjE2MDAwMDAwMDB9.' +
      'ZmFrZXNpZ25hdHVyZWhlcmU';
    const { status } = await apiPost(baseUrl, '/auth/privy-login', { privyToken: fakeJwt });
    expect([401, 500]).toContain(status);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 for authenticated user', async () => {
    const { status, body } = await apiPost(baseUrl, '/auth/logout', {}, asUser(testUserId));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 200 for unauthenticated caller (logout is stateless)', async () => {
    // authenticateOptional — no auth header is fine
    const { status, body } = await apiPost(baseUrl, '/auth/logout', {}, asAnon());
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

describe('GET /api/health', () => {
  it('returns ok without any auth', async () => {
    const { status, body } = await apiGet(baseUrl, '/health', asAnon());
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
