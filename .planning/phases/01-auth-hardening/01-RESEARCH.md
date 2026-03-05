# Phase 1: Auth Hardening - Research

**Researched:** 2026-03-03
**Domain:** Privy v3 auth, Prisma schema migration, Next.js auth loading UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Store `eoaAddress` (Privy embedded wallet EOA) and `smartAccountAddress` (ERC-4337 smart account) as separate DB columns on the User model
- `walletAddress` field should hold the smart account address (this is what rewards use)
- Frontend must send `smartAccountAddress` from `useSmartWallets().client.account.address` to the backend `privyLogin` endpoint — not the EOA from `usePrivy().user.wallet.address`
- If smart account address is not yet available (wallet not yet deployed), store null and sync on next login — do not block auth
- Frontend uses the **custom JWT** returned by `POST /api/auth/privy-login` for all protected API calls (Authorization: Bearer header)
- `authenticateJWT` middleware verifies this custom JWT (via Privy's `verifyAuthToken` under the hood already works — keep this pattern)
- Privy's access token is used only to call `privyLogin` endpoint; custom JWT used thereafter
- Session creation in `privyLogin` stays — provides session tracking for analytics/streak
- Delete `AuthService.login()` (nonce/signature method) entirely — not needed, actively confusing
- Delete `AuthService.getNonce()` and `AuthService.verifySignature()` helpers
- Delete `server/src/utils/signatureVerification.ts` if only used by old auth path
- Keep `server/src/utils/jwt.ts` — still needed for custom JWT generation
- Keep `server/src/utils/provider.ts` only if used elsewhere; if auth-only, delete it
- Remove nonce-related routes from `authRoutes.ts`
- Keep `nonceStore` cleanup: just delete the whole in-memory store
- Auth loading state: show a full-page skeleton/spinner while `usePrivy().ready === false`
- After login: call `privyLogin` endpoint → await response → then redirect based on `user.role`
- `BRAND_OWNER` → `/brand/dashboard`, `USER` → `/`
- No intermediate state between Privy modal close and redirect — no flash of home page
- Role detection: use the role returned from the `privyLogin` response, not a separate API call
- If user is not onboarded (`isOnboarded === false`): redirect to `/signup/user` or `/signup/brand` based on role intent
- No wallet address, chain ID, or signing prompt visible anywhere in the login/auth flow
- SmartWalletsProvider stays in ClientProviders but is silent — no UI surfaces wallet info

### Claude's Discretion
- Exact loading skeleton design
- Error state copy for failed backend sync
- Whether to add `smartAccountAddress` as a new Prisma column or reuse `walletAddress`

### Deferred Ideas (OUT OF SCOPE)
- Email verification re-enabling (`ENABLE_VERIFICATION` flag exists) — v2, not Phase 1
- Session invalidation / multi-device logout — not blocking auth hardening
- Phone verification — exists in DB, not needed for Phase 1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User's `privyId` is stored as primary identifier in DB and used for all lookups | Already implemented in `privyLogin()` — verify no regressions from schema change |
| AUTH-02 | JWT is verified via Privy's public JWKS on all protected backend routes | `authenticateJWT` already calls `privy.verifyAuthToken()` — confirmed correct |
| AUTH-03 | Old nonce/signature auth logic is removed from backend middleware and routes | `AuthService.login()`, `getNonce()`, `verifySignature()`, `signatureVerification.ts`, `nonceStore` all must be deleted |
| AUTH-04 | Re-login with same Privy account does not create a duplicate user record | `privyLogin()` lookup-by-privyId is the guard — confirm no duplicate path after schema migration |
| AUTH-05 | Smart account address (not EOA) is stored in `user.walletAddress` and synced on every login | Requires: new `eoaAddress` column, `smartAccountAddress` sent from frontend `useSmartWallets()`, `privyLogin()` updated to accept and store it |
| AUTH-06 | Auth loading states are clean — no popup flicker, no race between role detection and redirect | `usePrivy().ready` gate + single-await pattern in `syncWithBackend` |
| AUTH-07 | After login, user is redirected based on role: `BRAND_OWNER` → `/brand/dashboard`, `USER` → `/` | Role is already returned in `privyLogin` response — redirect logic lives in `UserContext` or `AuthGuard` |
| AUTH-08 | No wallet UI complexity visible during auth — no addresses, no chain IDs | `WalletContext` already abstracts this; ensure no wallet data surfaces in login UI components |
</phase_requirements>

---

## Summary

The auth system is mostly correct today. `privyLogin()` in `authService.ts` already uses `privyId` as the primary lookup key, `authenticateJWT` already calls `privy.verifyAuthToken()`, and `authRoutes.ts` already only exposes `privy-login` and `logout`. The nonce/signature code (`AuthService.login()`, `getNonce()`, `verifySignature()`, `signatureVerification.ts`, `nonceStore`, `provider.ts`) still exists in `authService.ts` but is not wired to any route — it's dead code that needs surgical deletion.

The one genuine gap is wallet address handling. The DB has `walletAddress String? @unique` (no `eoaAddress` column), and the frontend currently sends `address` from `WalletContext` which is the smart account address (read from `useSmartWallets()`). However, `privyLogin()` on the backend receives this as `walletAddress` and stores it without distinction. The decision is to add `eoaAddress` as a new column and ensure `walletAddress` always holds the smart account address explicitly passed from the frontend.

The loading/redirect UX has a real race condition risk: `UserContext.syncWithBackend()` is triggered by wallet address changes, but the redirect after login currently happens before `syncWithBackend` completes. The fix is to await the `privyLogin` API response and redirect based on the returned `user.role` — not a separate call.

**Primary recommendation:** Make 4 targeted changes: (1) delete dead nonce code, (2) add `eoaAddress` Prisma column, (3) update `privyLogin()` to store both addresses correctly, (4) fix the frontend redirect to use the role from the `privyLogin` response.

---

## Standard Stack

### Core (already in use — no installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@privy-io/react-auth` | 3.14.1 | Privy login modal + `usePrivy()` + `useSmartWallets()` | Already installed; v3 API confirmed |
| `@privy-io/server-auth` | (installed) | `PrivyClient.verifyAuthToken()` on backend | Already used in `authMiddleware.ts` and `authController.ts` |
| `prisma` | (existing) | Schema migration for new `eoaAddress` column | Already the project ORM |
| `jsonwebtoken` / custom jwt.ts | (existing) | Custom JWT generation after login | `generateToken()` in `server/src/utils/jwt.ts` |

### No New Dependencies Required

All required libraries are already installed. This phase is purely code cleanup + schema migration + UX fix.

---

## Architecture Patterns

### Current Auth Flow (verified from code)

```
Frontend                            Backend
--------                            -------
usePrivy().ready === true
  → user logs in via Privy modal
  → useSmartWallets().client?.account?.address  ← smart account addr
  → WalletContext sets address
  → UserContext.syncWithBackend() triggers
      → getAccessToken()            → privyToken (Privy JWT)
      → POST /api/auth/privy-login
        { privyToken, walletAddress (smart acct), email, avatarUrl }
                                    → verifyAuthToken(privyToken)
                                    → AuthService.privyLogin()
                                        lookup by privyId
                                        upsert user
                                        create session
                                        generateToken() → custom JWT
                                    ← { token, user: { role, isOnboarded, ... } }
      → store custom JWT
      → redirect based on role
```

### Pattern 1: Idempotent Login (AUTH-04)

`privyLogin()` already implements this correctly:
1. Find by `privyId` — exact match, no duplicate
2. Fallback find by email — link `privyId`
3. Fallback find by `walletAddress` — link `privyId`
4. Create only if none found

**Verified from:** `server/src/services/authService.ts` lines 345–437

### Pattern 2: Smart Account Address Storage (AUTH-05)

**Current state:** `walletAddress` column holds whatever is passed from frontend. `WalletContext` already exposes `eoaAddress` (from `usePrivy().user.wallet.address`) and `address` (from `useSmartWallets().client.account.address`). The frontend passes `address` (smart account) to `authenticateWithPrivy()` in `UserContext.syncWithBackend()`.

**Gap:** DB has no `eoaAddress` column. When `privyLogin()` updates an existing user, it does not update `walletAddress` on re-login — only on creation or via the separate `updateWalletAPI()` call made after sync.

**Required change:**
```typescript
// Prisma schema — add to User model:
eoaAddress          String?   // Privy embedded wallet EOA (for reference)
// walletAddress stays — now explicitly = smart account address
```

```typescript
// authService.ts privyLogin() — update existing user block:
user = await prisma.user.update({
  where: { id: user.id },
  data: {
    lastLoginAt: new Date(),
    ...(eoaAddress ? { eoaAddress: eoaAddress.toLowerCase() } : {}),
    ...(smartAccountAddress ? { walletAddress: smartAccountAddress.toLowerCase() } : {}),
    ...(avatarUrl && !user.avatarUrl ? { avatarUrl } : {}),
  },
});
```

### Pattern 3: JWT Token Flow (AUTH-02)

**Verified:** `authenticateJWT` in `authMiddleware.ts` already:
- Reads `Authorization: Bearer <token>`
- Calls `privy.verifyAuthToken(token)`
- Looks up user by `privyId` from verified claims
- Attaches `req.user` with `{ id, address, email, role, walletAddress, privyId }`

**No changes needed to the middleware.** It is already correct.

**Note:** The comment in the middleware says "Privy JWT token" but the actual token sent is the **custom JWT** from `generateToken()`. The code works because `generateToken()` wraps the same `privyId` claims. However, the middleware uses `privy.verifyAuthToken()` which verifies Privy-issued JWTs — this means the custom JWT from `generateToken()` would **fail** Privy's verifier.

**CRITICAL DISCOVERY:** There is a mismatch. `authenticateJWT` calls `privy.verifyAuthToken(token)` — this only works for Privy-issued tokens, not the custom JWT from `generateToken()`. But `CONTEXT.md` says "Frontend uses the custom JWT returned by `privyLogin` for all protected API calls." If the middleware verifies with Privy, the custom JWT would be rejected.

Looking more carefully at `authController.ts`: `privyLogin` endpoint verifies the Privy token and returns a custom JWT. Protected routes then receive this custom JWT. But `authenticateJWT` tries to verify it with `privy.verifyAuthToken()` — which would fail unless the "custom JWT" is actually just the Privy access token re-used.

Looking at `UserContext.tsx` line 71-76: `authenticateWithPrivy(privyToken, address, email, googlePicture)` — the privy token IS sent to `privyLogin`. Then the custom JWT returned is stored and used for subsequent calls. The middleware must be verifying the **Privy token** being forwarded, not the custom one — OR the current code uses the Privy access token directly for all calls (not the custom JWT).

**Checking `services/api.ts` is needed to confirm which token goes in the Authorization header.** This is the single most important thing to verify before implementing. See Open Questions.

### Pattern 4: Redirect After Login (AUTH-06, AUTH-07)

**Current behavior in `UserContext.tsx`:** After `syncWithBackend()` completes, `setUser(authUser)` is called. The redirect logic must be in `AuthGuard` or a `useEffect` watching `user.role`.

**Required pattern — await then redirect:**
```typescript
// In syncWithBackend() or a useEffect after user is set:
const { user: authUser } = await authenticateWithPrivy(...);
setUser(authUser);

// Redirect IMMEDIATELY based on returned role — no second API call
if (!authUser.isOnboarded) {
  router.replace(authUser.role === 'BRAND_OWNER' ? '/signup/brand' : '/signup/user');
} else if (authUser.role === 'BRAND_OWNER') {
  router.replace('/brand/dashboard');
} else {
  router.replace('/');
}
```

**Loading gate pattern:**
```tsx
// In root layout or ClientProviders:
const { ready } = usePrivy();
if (!ready) return <FullPageSpinner />;
```

### Anti-Patterns to Avoid

- **Redirecting before `privyLogin` response arrives:** Causes role-detection flicker. Always await the response.
- **Using `usePrivy().user.wallet.address` for the stored wallet:** This is the EOA, not the smart account. Use `useSmartWallets().client?.account?.address`.
- **Null-checking smart account with a hard block:** Smart account may not be deployed yet on first login. Pass null and sync on next login — do not throw or halt.
- **Keeping `nonceStore` in memory:** An in-memory map in a deleted code path — just delete it entirely with the rest of the nonce code.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Custom JWKS fetcher | `privy.verifyAuthToken()` (already in use) | Handles key rotation, expiry, algorithm |
| Idempotent upsert | Manual find-then-create | Existing `privyLogin()` lookup chain | Already handles 3 fallback cases correctly |
| Schema migration | Manual SQL ALTER TABLE | `prisma migrate dev` | Handles constraints, rollback, type safety |

---

## Common Pitfalls

### Pitfall 1: Dead Code Imports After Deletion
**What goes wrong:** Deleting `signatureVerification.ts` without removing its import from `authService.ts` — TypeScript build fails.
**How to avoid:** Delete in order: util file → import line in authService → class methods → nonceStore → NONCE_EXPIRATION_MS constant.
**Files to clean:** `authService.ts` imports `verifySignature`, `createAuthMessage` from `signatureVerification.ts`; `ethers` import; `getProvider` from `provider.ts`; `NonceResponse` type from `types/auth`.

### Pitfall 2: Prisma Unique Constraint on `walletAddress`
**What goes wrong:** `walletAddress String? @unique` — if a user is created without a smart account address (null) and then re-logs in, the update path must not try to set null twice (null is not a unique violation in Postgres, but worth confirming).
**How to avoid:** In `privyLogin()` update block, only set `walletAddress` if the incoming `smartAccountAddress` is non-null.

### Pitfall 3: `generateToken()` vs Privy Token in Auth Header
**What goes wrong:** If the frontend sends the custom JWT but `authenticateJWT` calls `privy.verifyAuthToken()`, all protected API calls return 401.
**How to avoid:** Verify what `services/api.ts` puts in the Authorization header. If it sends the Privy access token directly (not the custom JWT), then the current middleware is correct and the custom JWT from `privyLogin` is used only as a signal/storage artifact. If it sends the custom JWT, the middleware must use `jsonwebtoken.verify()` instead.
**Warning sign:** 401s on all protected routes after login.

### Pitfall 4: Smart Account Address Race Condition
**What goes wrong:** `useSmartWallets().client` may be null on the very first render after Privy login if the smart account hasn't been deployed yet. Sending null `walletAddress` to `privyLogin` means the user is created without a wallet link.
**How to avoid:** This is expected and acceptable per locked decisions — store null and sync on next login. The `WalletContext` re-triggers `syncWithBackend` when `address` changes, so once the smart account deploys, the wallet address updates automatically.

### Pitfall 5: `ethers` Dependency Left in authService
**What goes wrong:** After deleting `login()` and `getNonce()`, the `import { ethers } from 'ethers'` at the top of `authService.ts` remains. This is a large unused dependency.
**How to avoid:** Remove the import after deleting all methods that use it.

---

## Code Examples

### Prisma Migration: Add eoaAddress Column
```prisma
// schema.prisma — add inside User model:
eoaAddress          String?   // Privy embedded wallet EOA address
```

```bash
# Run from server/:
npx prisma migrate dev --name add_eoa_address
```

### privyLogin() Signature Update (backend)
```typescript
// authService.ts — updated privyLogin signature:
static async privyLogin(
  verifiedClaims: { userId: string },
  walletAddress?: string,      // smart account address (ERC-4337)
  email?: string,
  deviceInfo?: string,
  ip?: string,
  avatarUrl?: string,
  eoaAddress?: string          // NEW: EOA address from Privy embedded wallet
): Promise<AuthResponse>
```

### Frontend: Send Both Addresses
```typescript
// UserContext.tsx syncWithBackend() — send smart account address explicitly:
const smartAccountAddress = smartWalletsClient?.account?.address ?? undefined;
const eoaAddr = privyUser?.wallet?.address ?? undefined;

const { user: authUser } = await authenticateWithPrivy(
  privyToken,
  smartAccountAddress,  // walletAddress param = smart account
  email,
  googlePicture,
  eoaAddr               // new param
);
```

### Redirect Logic After Login
```typescript
// After syncWithBackend resolves with authUser:
if (!authUser.isOnboarded) {
  router.replace(authUser.role === 'BRAND_OWNER' ? '/signup/brand' : '/signup/user');
} else if (authUser.role === 'BRAND_OWNER') {
  router.replace('/brand/dashboard');
} else {
  router.replace('/');
}
```

### Loading Gate in Layout
```tsx
// components/providers/ClientProviders.tsx or root layout:
const { ready } = usePrivy();
if (!ready) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

---

## Exact Deletion Checklist (AUTH-03)

Files to modify:
- `server/src/services/authService.ts` — Delete: `getNonce()`, `login()`, `verifySignature()` static methods, `nonceStore` map, `NONCE_EXPIRATION_MS` constant, imports of `ethers`, `verifySignature`/`createAuthMessage`, `getProvider`, `NonceResponse` type
- `server/src/types/auth.ts` — Delete `NonceResponse` interface if present
- `server/src/routes/authRoutes.ts` — Already clean (only has `privy-login` and `logout`)
- `server/src/controllers/authController.ts` — Already clean (only has `privyLogin` and `logout`)

Files to delete entirely (if auth-only):
- `server/src/utils/signatureVerification.ts` — Verify no other file imports it before deleting
- `server/src/utils/provider.ts` — Verify no other file imports it before deleting

Verification command before deleting:
```bash
grep -r "signatureVerification" server/src/
grep -r "getProvider\|from.*provider" server/src/ --include="*.ts"
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| SIWE nonce/signature auth | Privy JWT auth | Already migrated; cleanup remains |
| EOA = walletAddress | Smart account = walletAddress, EOA = eoaAddress | Requires schema migration |
| Redirect after separate role-check call | Redirect based on `privyLogin` response role | Eliminates flicker |

---

## Open Questions

1. **Which token does `services/api.ts` put in the Authorization header?**
   - What we know: `authenticateWithPrivy()` is called in `UserContext` and receives a `privyToken`. The `privyLogin` endpoint returns a custom JWT.
   - What's unclear: Does `services/api.ts` store and send the custom JWT, or does it call `getAccessToken()` fresh on each request to send the Privy token?
   - Impact: HIGH — if the custom JWT is sent to protected routes but `authenticateJWT` verifies with Privy, all protected routes return 401.
   - Recommendation: Read `client/services/api.ts` as the first step of planning. The middleware may need to switch to `jsonwebtoken.verify()` with the app's own secret instead of `privy.verifyAuthToken()`.

2. **Does `provider.ts` have other consumers?**
   - What we know: It's imported by `authService.ts` for `getProvider()` used in `login()` and `verifySignature()`.
   - What's unclear: Whether any other server file imports it.
   - Recommendation: `grep -r "from.*provider" server/src/` before deletion.

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `server/src/services/authService.ts` — full file, confirmed nonce/privy methods
- Direct code read: `server/src/middlewares/authMiddleware.ts` — confirmed `verifyAuthToken` usage
- Direct code read: `server/src/routes/authRoutes.ts` — confirmed already clean
- Direct code read: `server/src/controllers/authController.ts` — confirmed already clean
- Direct code read: `client/context/UserContext.tsx` — confirmed sync flow and address passing
- Direct code read: `client/context/WalletContext.tsx` — confirmed `eoaAddress` vs `address` distinction
- Direct code read: `server/prisma/schema.prisma` — confirmed `walletAddress`, `privyId` columns; no `eoaAddress`

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions — locked by user, treated as authoritative

---

## Metadata

**Confidence breakdown:**
- Deletion scope (AUTH-03): HIGH — all dead code located in authService.ts, no route/controller cleanup needed
- Schema change (AUTH-05): HIGH — schema read directly, migration path is standard Prisma
- Middleware correctness (AUTH-02): MEDIUM — middleware looks correct but token type mismatch is an open question requiring `api.ts` read
- Redirect/loading UX (AUTH-06, AUTH-07): HIGH — pattern is clear from existing UserContext structure

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (Privy v3 API is stable; no fast-moving dependencies in this phase)
