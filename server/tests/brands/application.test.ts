/**
 * Brand application tests
 *
 * Covers:
 *  POST /api/brand-application/register    — public, no auth
 *  GET  /api/brand-application/status      — lookup by email
 *  GET  /api/admin/applications            — admin only
 *  PUT  /api/admin/applications/:id/reject — admin action
 *
 * Business rules tested:
 *  - Duplicate pending application for same email → 409
 *  - Missing required fields → 400
 *  - Non-admin cannot access admin application list → 403
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getTestServer, stopTestServer } from '../setup';
import { apiPost, apiGet, apiPut } from '../utils/client';
import { createTestAdmin, cleanupTestData, db, TEST_RUN_ID } from '../utils/db';
import { asAnon, asAdminUser } from '../utils/auth';

let baseUrl: string;
let adminUser: { id: string };
let createdApplicationId: string;

// Stable test email so duplicate detection is tested
const TEST_APP_EMAIL = `brand_app_${TEST_RUN_ID}@apply.invalid`;

// Valid minimal application body
function validApplicationBody(overrides: Record<string, any> = {}) {
  return {
    brandName: `TestBrand_${TEST_RUN_ID}`,
    companyName: 'Test Company Ltd',
    contactEmail: TEST_APP_EMAIL,
    contactPersonName: 'Jane Tester',
    contactRole: 'CEO',
    categories: ['fashion'],
    platformUsageReason: 'Integration testing',
    agreementAuthorized: true,
    agreementAccurate: true,
    documents: [
      { documentType: 'GST_CERTIFICATE', fileName: 'gst.pdf', fileData: 'cid_gst', fileUrl: null },
      { documentType: 'INCORPORATION_LETTER', fileName: 'inc.pdf', fileData: 'cid_inc', fileUrl: null },
      { documentType: 'PAN_CARD', fileName: 'pan.pdf', fileData: 'cid_pan', fileUrl: null },
      { documentType: 'TRADE_LICENSE', fileName: 'trade.pdf', fileData: 'cid_trade', fileUrl: null },
    ],
    ...overrides,
  };
}

beforeAll(async () => {
  baseUrl = await getTestServer();
  adminUser = await createTestAdmin();
});

afterAll(async () => {
  // Clean up application rows
  await db.brandApplication.deleteMany({ where: { contactEmail: TEST_APP_EMAIL } });
  await cleanupTestData([adminUser.id]);
  await stopTestServer();
});

describe('POST /api/brand-application/register', () => {
  it('returns 400 when brandName is missing', async () => {
    const body = validApplicationBody();
    delete (body as any).brandName;
    const { status } = await apiPost(baseUrl, '/brand-application/register', body, asAnon());
    expect(status).toBe(400);
  });

  it('returns 400 when categories array is empty', async () => {
    const { status } = await apiPost(
      baseUrl,
      '/brand-application/register',
      validApplicationBody({ categories: [] }),
      asAnon()
    );
    expect(status).toBe(400);
  });

  it('returns 400 when fewer than 4 documents are provided', async () => {
    const { status } = await apiPost(
      baseUrl,
      '/brand-application/register',
      validApplicationBody({ documents: [{ documentType: 'GST_CERTIFICATE', fileName: 'gst.pdf', fileData: 'cid_gst', fileUrl: null }] }),
      asAnon()
    );
    expect(status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const { status } = await apiPost(
      baseUrl,
      '/brand-application/register',
      validApplicationBody({ contactEmail: 'not-an-email' }),
      asAnon()
    );
    expect(status).toBe(400);
  });

  it('creates application successfully', async () => {
    const { status, body } = await apiPost(
      baseUrl,
      '/brand-application/register',
      validApplicationBody(),
      asAnon()
    );
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.applicationId).toBeDefined();
    createdApplicationId = body.applicationId;
  });

  it('returns 409 for duplicate pending email', async () => {
    const { status } = await apiPost(
      baseUrl,
      '/brand-application/register',
      validApplicationBody(),
      asAnon()
    );
    expect(status).toBe(409);
  });
});

describe('GET /api/brand-application/status', () => {
  it('returns application status by email', async () => {
    const { status, body } = await apiGet(
      baseUrl,
      `/brand-application/status?email=${TEST_APP_EMAIL}`,
      asAnon()
    );
    expect(status).toBe(200);
    const appStatus = body.status ?? body.application?.status;
    expect(appStatus).toBe('PENDING');
  });

  it('returns 404 for unknown email', async () => {
    const { status } = await apiGet(
      baseUrl,
      '/brand-application/status?email=unknown_nobody_xyz@nowhere.invalid',
      asAnon()
    );
    expect(status).toBe(404);
  });
});

describe('GET /api/admin/applications', () => {
  it('returns 401 without auth header', async () => {
    const { status } = await apiGet(baseUrl, '/admin/applications', asAnon());
    expect(status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    // Create a regular user (not in admin email list)
    const { createTestUser } = await import('../utils/db');
    const regularUser = await createTestUser({ displayName: 'Regular Joe' });
    const { status } = await apiGet(baseUrl, '/admin/applications', {
      'X-Test-User-Id': regularUser.id,
    });
    expect(status).toBe(403);
    // Cleanup inline
    await db.user.delete({ where: { id: regularUser.id } });
  });

  it('returns application list for admin', async () => {
    const { status, body } = await apiGet(baseUrl, '/admin/applications', asAdminUser(adminUser.id));
    expect(status).toBe(200);
    const list = Array.isArray(body) ? body : (body.applications ?? body.data ?? []);
    expect(Array.isArray(list)).toBe(true);
  });
});

describe('PUT /api/admin/applications/:id/reject', () => {
  it('returns 403 for non-admin', async () => {
    const regularUser = await (await import('../utils/db')).createTestUser();
    const { status } = await apiPut(
      baseUrl,
      `/admin/applications/${createdApplicationId}/reject`,
      { reason: 'Test rejection' },
      { 'X-Test-User-Id': regularUser.id }
    );
    expect(status).toBe(403);
    await db.user.delete({ where: { id: regularUser.id } });
  });

  it('rejects an application as admin', async () => {
    const { status, body } = await apiPut(
      baseUrl,
      `/admin/applications/${createdApplicationId}/reject`,
      { reason: 'Rejected in automated test' },
      asAdminUser(adminUser.id)
    );
    expect(status).toBe(200);
    const appStatus = body.status ?? body.application?.status;
    expect(appStatus).toBe('REJECTED');

    // Verify DB state
    const app = await db.brandApplication.findUnique({ where: { id: createdApplicationId } });
    expect(app?.status).toBe('REJECTED');
  });
});
