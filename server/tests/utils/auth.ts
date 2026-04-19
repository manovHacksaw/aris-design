/**
 * Auth header factories for tests.
 *
 * authenticatedUser(id)  → X-Test-User-Id header (test bypass in authMiddleware)
 * adminKey()             → X-Admin-Key header (static key from ADMIN_KEY env var)
 * adminUser(id)          → both headers combined (admin email user + key fallback)
 */

/** Headers that authenticate as a specific user ID (requires NODE_ENV=test bypass) */
export function asUser(userId: string): Record<string, string> {
  return { 'X-Test-User-Id': userId };
}

/** Headers that authenticate via the static admin key */
export function asAdminKey(): Record<string, string> {
  const key = process.env.ADMIN_KEY;
  if (!key) throw new Error('ADMIN_KEY not set in test environment');
  return { 'X-Admin-Key': key };
}

/**
 * Headers for an admin user: injects user ID (so authenticateJWT passes)
 * AND includes the static admin key (so authenticateAdmin passes via key fallback).
 * If your ALLOWED_ADMIN_EMAILS includes the test user's email, omit the key header.
 */
export function asAdminUser(userId: string): Record<string, string> {
  return { ...asUser(userId), ...asAdminKey() };
}

/** No auth headers — used for unauthenticated request assertions */
export function asAnon(): Record<string, string> {
  return {};
}
