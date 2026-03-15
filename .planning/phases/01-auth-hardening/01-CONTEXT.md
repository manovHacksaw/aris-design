# Phase 1: Auth Hardening - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the auth identity model so every user is identified by their Privy ID and smart account address throughout the system. Logins are idempotent, the correct wallet address is stored in DB, old nonce/signature code is removed, and the frontend loading/redirect flow has no visible flicker.

</domain>

<decisions>
## Implementation Decisions

### Smart account address storage
- Store `eoaAddress` (Privy embedded wallet EOA) and `smartAccountAddress` (ERC-4337 smart account) as separate DB columns on the User model
- `walletAddress` field should hold the smart account address (this is what rewards use)
- Frontend must send `smartAccountAddress` from `useSmartWallets().client.account.address` to the backend `privyLogin` endpoint — not the EOA from `usePrivy().user.wallet.address`
- If smart account address is not yet available (wallet not yet deployed), store null and sync on next login — do not block auth

### Auth token architecture
- Frontend uses the **custom JWT** returned by `POST /api/auth/privy-login` for all protected API calls (Authorization: Bearer header)
- `authenticateJWT` middleware verifies this custom JWT (via Privy's `verifyAuthToken` under the hood already works — keep this pattern)
- Privy's access token is used only to call `privyLogin` endpoint; custom JWT used thereafter
- Session creation in `privyLogin` stays — provides session tracking for analytics/streak

### Old nonce/signature code removal
- Delete `AuthService.login()` (nonce/signature method) entirely — not needed, actively confusing
- Delete `AuthService.getNonce()` and `AuthService.verifySignature()` helpers
- Delete `server/src/utils/signatureVerification.ts` if only used by old auth path
- Keep `server/src/utils/jwt.ts` — still needed for custom JWT generation
- Keep `server/src/utils/provider.ts` only if used elsewhere; if auth-only, delete it
- Remove nonce-related routes from `authRoutes.ts`
- Keep `nonceStore` cleanup: just delete the whole in-memory store

### Loading & redirect UX
- Auth loading state: show a full-page skeleton/spinner while `usePrivy().ready === false`
- After login: call `privyLogin` endpoint → await response → then redirect based on `user.role`
- `BRAND_OWNER` → `/brand/dashboard`, `USER` → `/`
- No intermediate state between Privy modal close and redirect — no flash of home page
- Role detection: use the role returned from the `privyLogin` response, not a separate API call
- If user is not onboarded (`isOnboarded === false`): redirect to `/signup/user` or `/signup/brand` based on role intent

### No wallet UI complexity
- No wallet address, chain ID, or signing prompt visible anywhere in the login/auth flow
- SmartWalletsProvider stays in ClientProviders but is silent — no UI surfaces wallet info

### Claude's Discretion
- Exact loading skeleton design
- Error state copy for failed backend sync
- Whether to add `smartAccountAddress` as a new Prisma column or reuse `walletAddress`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/middlewares/authMiddleware.ts`: `authenticateJWT` already uses Privy's `verifyAuthToken` — keep as-is, it's correct
- `server/src/services/authService.ts`: `AuthService.privyLogin()` is the correct path — extend it, don't replace it
- `server/src/controllers/authController.ts`: Already only exposes `privyLogin` and `logout` — nonce endpoints are likely in routes only
- `server/src/utils/jwt.ts`: Custom JWT generation — keep, still needed
- `client/context/UserContext.tsx`: Likely has the `privyLogin` call — this is where smart account address should be sourced and sent

### Established Patterns
- `privyLogin` service method: finds user by privyId first → email fallback → wallet fallback → creates if none found. This is correct; just needs smart account address fix
- `generateToken()`: custom JWT wraps userId, address, email, sessionId — continue this pattern
- `authenticateJWT`: verifies Privy token from Bearer header, looks up user by privyId — correct pattern already

### Integration Points
- `client/context/UserContext.tsx` or `WalletContext.tsx`: Where `usePrivy()` and `useSmartWallets()` are called — smart account address must be read from `useSmartWallets().client?.account?.address`
- `server/src/routes/authRoutes.ts`: Remove nonce/signature routes here
- Prisma schema: Add `smartAccountAddress` column (or rename `walletAddress` semantics)

</code_context>

<specifics>
## Specific Ideas

- The main UX pain is "flickery auth loading states" — priority is eliminating any flash of unauthenticated state before redirect
- "Web2 smooth" means the login flow should feel instant — Privy modal opens, user logs in, redirect happens with a clean loading state, never a blank page
- No blockchain jargon means: during the entire auth flow, user sees their email/Google avatar, not a wallet address

</specifics>

<deferred>
## Deferred Ideas

- Email verification re-enabling (`ENABLE_VERIFICATION` flag exists) — v2, not Phase 1
- Session invalidation / multi-device logout — not blocking auth hardening
- Phone verification — exists in DB, not needed for Phase 1

</deferred>

---

*Phase: 01-auth-hardening*
*Context gathered: 2026-03-03*
