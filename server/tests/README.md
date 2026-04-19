# ARIS Integration Test Suite

Real integration tests — no mocks, real database, real Express server.

---

## Setup (one-time)

### 1. Create a test database

```sql
-- In psql or your DB tool:
CREATE DATABASE aris_test;
```

### 2. Create the test env file

```bash
cp tests/.env.test.example tests/.env.test
```

Edit `tests/.env.test` and set:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://<user>:<pass>@localhost:5432/aris_test` |
| `DIRECT_URL` | same as DATABASE_URL |
| `PRIVY_APP_ID` | your Privy **test** app ID |
| `PRIVY_APP_SECRET` | your Privy **test** app secret |
| `ADMIN_KEY` | any string, e.g. `test_admin_key` |
| `ALLOWED_ADMIN_EMAILS` | `testadmin@test.com` (or whatever email your admin test user gets) |
| `ARCJET_KEY` | `ajkey_test_dummy` (Arcjet fails-open for unknown keys) |

### 3. Push schema to test database

```bash
DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/aris_test" \
DIRECT_URL="postgresql://<user>:<pass>@localhost:5432/aris_test" \
  bun prisma db push
```

Or use the convenience script:
```bash
TEST_DATABASE_URL="postgresql://..." bun run test:db:push
```

---

## Running Tests

```bash
# Full suite
NODE_ENV=test DATABASE_URL="<test-db-url>" DIRECT_URL="<test-db-url>" \
  ADMIN_KEY=test_admin_key ARCJET_KEY=ajkey_dummy \
  bun test tests/**/*.test.ts --timeout 30000

# Individual suites
bun run test:auth-suite
bun run test:users
bun run test:events
bun run test:rewards
bun run test:admin
bun run test:integration   # 60s timeout — runs the full lifecycle

# Watch mode (during development)
bun run test:watch
```

> **Tip**: Put all values in `tests/.env.test` and load them with:
> ```bash
> set -a && source tests/.env.test && set +a && bun run test
> ```

---

## Architecture

```
tests/
├── setup.ts               # Starts Express on a random port; export getTestServer()
├── utils/
│   ├── db.ts              # Test Prisma client + seed helpers + cleanup
│   ├── client.ts          # fetch wrappers (apiGet, apiPost, ...)
│   └── auth.ts            # Header factories (asUser, asAdminKey, asAdminUser)
├── auth/
│   └── privy-login.test.ts
├── users/
│   ├── profile.test.ts
│   └── follow.test.ts
├── brands/
│   └── application.test.ts
├── events/
│   ├── crud.test.ts
│   └── vote.test.ts
├── rewards/
│   └── distribution.test.ts
├── admin/
│   └── dashboard.test.ts
├── notifications/
│   └── notifications.test.ts
└── integration/
    └── event-full-cycle.test.ts   ← full E2E: create → vote → rewards
```

---

## How Auth Works in Tests

The `authenticateJWT` middleware has a **test-only bypass** (guarded by `NODE_ENV === 'test'`):

- Send header `X-Test-User-Id: <userId>` instead of a real Privy JWT
- The middleware looks up the user by ID in the test DB and attaches to `req.user`
- **Never active in production** — the `NODE_ENV=test` guard prevents it

For admin routes (which require both `authenticateJWT` + `authenticateAdmin`):
- Use `asAdminUser(userId)` which sends both `X-Test-User-Id` and `X-Admin-Key`
- The admin key satisfies `authenticateAdmin` via the static key fallback

---

## Data Isolation

Every test run generates a unique `TEST_RUN_ID` (timestamp-based).
All test data includes this ID in emails, usernames, and brand names.

- Tests never touch real production data
- `cleanupTestData()` in each `afterAll` deletes only data from the current run
- `sweepTestRunData()` is available as a catch-all cleanup if a test crashes mid-run

---

## Blockchain

No blockchain calls are made in this suite.

Tests use users **without wallet addresses** (`walletAddress: null`).
In `processEventRewards`, users with no wallet go directly to `PENDING` claims — the
`usersBatch` array stays empty and the `BlockchainService.distributeRewardsBatch` call
is never reached.

To test the on-chain path (e.g., `claimPendingRewards` with a real smart account),
you would need a funded testnet wallet. Set `BACKEND_SIGNER_PRIVATE_KEY` and
`PIMLICO_API_KEY` in `tests/.env.test` and write a separate `tests/rewards/on-chain.test.ts`.

---

## Safety Checklist

- [x] Uses a separate test database (`aris_test`)
- [x] All test data namespaced with `TEST_RUN_ID`
- [x] Cleanup in `afterAll` on every test file
- [x] No production credentials required
- [x] No blockchain writes
- [x] Repeatable: safe to run multiple times
- [x] `NODE_ENV=test` auth bypass is production-safe (dead code in prod)
