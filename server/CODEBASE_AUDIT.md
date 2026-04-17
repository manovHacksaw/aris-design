# ARIS Server — Codebase Audit Report

> Generated: 2026-04-16
> Branch: master

---

## 1. High-Level Architecture Summary

**Stack:** Bun runtime + Express 4.x + Prisma 5 + PostgreSQL (Supabase) + Socket.io

**Architecture style: Hybrid layered MVC — mostly coherent, partially broken.**

The intended pattern is `Route → Controller → Service → DB`. This holds for ~70% of the codebase. The remaining 30% breaks the pattern in different ways: inline Prisma calls in controllers, direct Prisma calls skipping the service layer entirely, and one route file (`analyticsRoutes.ts`) that acts as a full fat controller with embedded business logic.

**Request lifecycle (when pattern is followed):**

```
Client
  → Express global middleware (helmet, cors, morgan, json)
  → Router (/api prefix)
  → Auth middleware (authenticateJWT / authenticateOptional)
  → Controller (param extraction, response shaping)
  → Service (business logic, Prisma queries)
  → Prisma ORM → Supabase PostgreSQL
  → [optionally] External: Privy, Gemini, Pinata/IPFS, Pimlico/Polygon, Firebase
```

---

## 2. API Inventory (Grouped Logically)

**~140 total HTTP endpoints** across 22 route files. All prefixed `/api`.

### Domain: Authentication

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/auth/privy-login` | None | `privyLogin` |
| POST | `/auth/logout` | Optional | `logout` |

### Domain: Users

25 endpoints covering: current user, profile update, wallet update, follow/unfollow, followers/following, referrals, OTP email flow, user search, username check, submissions by user, voted content, user list, user by ID.

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/users/me` | JWT | `getCurrentUser` |
| GET | `/users/me/stats` | JWT | `getUserStats` |
| POST | `/users/` | JWT + EmailVerif | `upsertUser` |
| PUT | `/users/` | JWT + EmailVerif | `upsertUser` |
| PATCH | `/users/profile` | JWT + EmailVerif | `updateProfile` |
| PATCH | `/users/wallet` | JWT | `updateWalletAddress` |
| POST | `/users/onboarding-analytics` | JWT | `saveOnboardingAnalytics` |
| GET | `/users/validate-referral` | JWT | `validateReferral` |
| POST | `/users/apply-referral` | JWT | `applyReferral` |
| POST | `/users/email/send-otp` | JWT | `sendOTP` |
| POST | `/users/email/verify-otp` | JWT | `verifyOTP` |
| POST | `/users/follow/:followingId` | JWT + EmailVerif | `followUser` |
| DELETE | `/users/follow/:followingId` | JWT + EmailVerif | `unfollowUser` |
| GET | `/users/me/followers` | JWT | `getFollowers` |
| GET | `/users/me/following` | JWT | `getFollowing` |
| GET | `/users/:userId/followers` | None | `getFollowers` |
| GET | `/users/:userId/following` | None | `getFollowing` |
| GET | `/users/:userId/stats` | None | `getUserStatsById` |
| GET | `/users/search` | None | `searchUsers` |
| GET | `/users/username/:username` | None | `getUserByUsername` |
| GET | `/users/check-username` | None | `checkUsernameAvailability` |
| GET | `/users/:userId/submissions` | Optional | `getSubmissionsByUser` |
| GET | `/users/:userId/voted-content` | Optional | `getUserVotedContent` |
| GET | `/users/` | None | `getUsers` |
| GET | `/users/:id` | None | `getUserById` |

### Domain: Events

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/events/` | None | `getEvents` |
| GET | `/events/brand/me` | JWT | `getBrandEvents` |
| GET | `/events/user/:userId/voted` | None | `getEventsVotedByUser` |
| GET | `/events/:id` | Optional | `getEventById` |
| POST | `/events/` | JWT | `createEvent` |
| PUT | `/events/:id` | JWT | `updateEvent` |
| PATCH | `/events/:id/status` | JWT | `updateEventStatus` |
| PATCH | `/events/:id/blockchain` | JWT | `updateBlockchainStatus` |
| PATCH | `/events/:id/blockchain-failed` | JWT | `failBlockchainStatus` |
| POST | `/events/:id/publish` | JWT | `publishEvent` |
| POST | `/events/:id/cancel` | JWT | `cancelEvent` |
| POST | `/events/:id/stop` | JWT | `stopEventEarly` |
| DELETE | `/events/:id` | JWT | `deleteEvent` |

### Domain: Submissions (nested under events)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/events/:eventId/submissions` | Optional | `getSubmissionsByEvent` |
| GET | `/events/:eventId/submissions/has-submitted` | JWT | `checkIfUserHasSubmitted` |
| GET | `/events/:eventId/submissions/me` | JWT | `getUserSubmission` |
| POST | `/events/:eventId/submissions` | JWT | `createSubmission` |
| PUT | `/events/:eventId/submissions/:id` | JWT | `updateSubmission` |
| DELETE | `/events/:eventId/submissions/:id` | JWT | `deleteSubmission` |

### Domain: Proposals (nested under events)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/events/:eventId/proposals` | None | `getProposalsByEvent` |
| POST | `/events/:eventId/proposals` | JWT | `createProposal` |
| PUT | `/events/:eventId/proposals/:id` | JWT | `updateProposal` |
| DELETE | `/events/:eventId/proposals/:id` | JWT | `deleteProposal` |

### Domain: Votes (nested under events)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/events/:eventId/participants` | None | `getEventParticipants` |
| GET | `/events/:eventId/voter-breakdown` | None | `getVoterBreakdown` |
| GET | `/events/:eventId/my-votes` | JWT | `getUserVotesForEvent` |
| GET | `/events/:eventId/has-voted` | JWT | `checkIfUserHasVoted` |
| POST | `/events/:eventId/proposals/vote` | JWT | `voteForProposals` |
| POST | `/events/:eventId/submissions/:submissionId/vote` | JWT | `voteForSubmission` |

### Domain: Brands

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/brands/public/:identifier` | Optional | `getPublicBrandProfile` |
| GET | `/brands/me` | JWT | `getCurrentBrand` |
| POST | `/brands/` | JWT | `upsertBrandProfile` |
| GET | `/brands/milestones` | JWT | `getBrandMilestones` |

### Domain: Brand Onboarding (Application + Claim)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/brand-application/register` | **None** | `submitApplication` |
| GET | `/brand-application/status` | **None** | `getApplicationByEmail` |
| GET | `/brand-application/applications` | JWT + Admin | `getApplications` |
| GET | `/brand-application/applications/:id` | JWT + Admin | `getApplication` |
| PUT | `/brand-application/applications/:id/approve` | JWT + Admin | `approveApplication` |
| PUT | `/brand-application/applications/:id/reject` | JWT + Admin | `rejectApplication` |
| GET | `/brand-claim/claim/:token` | None | `validateClaimToken` |
| POST | `/brand-claim/claim` | None | `claimBrand` |

### Domain: Brand XP

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/brand-xp/status` | JWT | `getBrandLevelStatus` |
| GET | `/brand-xp/discount` | JWT | `getBrandDiscount` |
| GET | `/brand-xp/history` | JWT | `getBrandLevelHistory` |
| GET | `/brand-xp/thresholds` | None | `getLevelThresholds` |
| POST | `/brand-xp/recalculate` | JWT | `recalculateBrandLevel` |

### Domain: User XP

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/xp/login-ping` | JWT | `loginPing` |
| GET | `/xp/me` | JWT | `getXpStatus` |
| GET | `/xp/milestones` | JWT | `getMilestoneProgress` |
| GET | `/xp/multiplier` | JWT | `getRewardMultiplier` |
| GET | `/xp/transactions` | JWT | `getXpTransactions` |
| GET | `/xp/referral` | JWT | `getReferralInfo` |
| POST | `/xp/referral/generate` | JWT | `generateReferralCode` |

### Domain: Rewards

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/rewards/constants` | None | `getConstants` |
| GET | `/rewards/contract-info` | None | `getContractInfo` |
| GET | `/rewards/pools/:eventId/calculate` | Optional | `calculatePoolRequirements` |
| GET | `/rewards/pools/:eventId` | Optional | `getPool` |
| POST | `/rewards/pools/:eventId/cancel` | JWT | `cancelPool` |
| GET | `/rewards/claims/:eventId` | JWT | `getUserClaims` |
| POST | `/rewards/claims/:eventId/confirm` | JWT | `confirmClaim` |
| GET | `/rewards/me` | JWT | `getMyRewards` |
| GET | `/rewards/user/claimable` | JWT | `getClaimableRewards` |
| GET | `/rewards/user/history` | JWT | `getClaimHistory` |
| POST | `/rewards/claim` | JWT | `claimReward` |
| POST | `/rewards/confirm-all-claims` | JWT | `confirmAllClaims` |
| POST | `/rewards/claim-pending` | JWT | `claimPendingRewards` |
| POST | `/rewards/sync-claims` | JWT | `syncClaims` |
| GET | `/rewards/brand/refunds` | JWT | `getBrandRefunds` |
| POST | `/rewards/brand/refunds/prepare` | JWT | `prepareRefundClaim` |
| GET | `/rewards/brand/claimable` | JWT | `getBrandClaimableRewards` |

### Domain: Explore

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/explore/events` | Optional | `getExploreEvents` |
| GET | `/explore/brands` | None | `getExploreBrands` |
| GET | `/explore/creators` | None | `getExploreCreators` |
| GET | `/explore/content` | Optional | `getExploreContent` |

### Domain: Feed

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/feed/home-events` | JWT | `getHomeEvents` |
| GET | `/feed/home-content` | JWT | `getHomeContent` |

### Domain: Leaderboard

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/leaderboard/brands` | None | `getBrands` |
| GET | `/leaderboard/users` | None | `getUsers` |
| GET | `/leaderboard/events` | None | `getEvents` |
| GET | `/leaderboard/content` | None | `getContent` |

### Domain: Search

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/search/users` | JWT | `searchUsers` |
| GET | `/search/brands` | JWT | `searchBrands` |
| GET | `/search/events` | JWT | `searchEvents` |
| GET | `/search/all` | JWT | `searchAll` |
| GET | `/search/user/:username` | JWT | `getUserByUsername` |
| GET | `/search/brand/:identifier` | JWT | `getBrandByIdentifier` |

### Domain: Notifications

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/notifications/` | JWT | `getNotifications` |
| GET | `/notifications/unread` | JWT | `getUnreadNotifications` |
| GET | `/notifications/count` | JWT | `getUnreadCount` |
| PATCH | `/notifications/read-all` | JWT | `markAllNotificationsAsRead` |
| PATCH | `/notifications/:id/read` | JWT | `markNotificationAsRead` |
| DELETE | `/notifications/:id` | JWT | `deleteNotification` |

### Domain: Subscriptions

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/subscriptions/:brandId` | JWT | `subscribeToBrand` |
| DELETE | `/subscriptions/:brandId` | JWT | `unsubscribeFromBrand` |
| GET | `/subscriptions/:brandId/status` | Optional | `getSubscriptionStatus` |
| GET | `/subscriptions/my-subscriptions` | JWT | `getMySubscriptions` |
| GET | `/subscriptions/brand/:brandId/subscribers` | JWT | `getBrandSubscribers` |
| GET | `/subscriptions/brand/:brandId/count` | None | `getSubscriberCount` |

### Domain: AI Generation

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/ai/generate-image` | JWT | `generateImage` |
| POST | `/ai/refine-prompt` | JWT | `refinePrompt` |
| POST | `/ai/generate-proposals` | JWT | `generateProposals` |
| POST | `/ai/generate-tagline` | JWT | `generateTagline` |
| POST | `/ai/generate-event-details` | JWT | `generateEventDetails` |
| POST | `/ai/generate-banner-prompts` | JWT | `generateBannerPrompts` |
| POST | `/ai/generate-voting-option-prompts` | JWT | `generateVotingOptionPrompts` |

### Domain: Analytics

~18 endpoints covering: view/share/click tracking, event analytics, brand analytics, follower growth timeseries, AI insights pipeline. Mixed auth (some public, some JWT).

### Domain: Admin (Basic Auth `admin:admin`)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/admin/stats` | `getDashboardStats` |
| GET | `/admin/sessions` | `getUserSessions` |
| GET | `/admin/activities` | `getUserActivities` |
| GET | `/admin/applications` | `getApplications` |
| GET | `/admin/applications/:id` | `getApplication` |
| PUT | `/admin/applications/:id/approve` | `approveApplication` |
| PUT | `/admin/applications/:id/reject` | `rejectApplication` |
| POST | `/admin/brands/:id/approve` | `approveBrandAndGenerateToken` |
| GET | `/admin/brands/:id/claim-email-template` | `getClaimEmailTemplate` |

### Domain: Phone Verification

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/phone/verify-firebase` | JWT | `verifyFirebasePhone` |
| GET | `/phone/check-availability` | JWT | `checkPhoneAvailability` |

### Domain: Drafts

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/drafts/` | JWT | `getDrafts` |
| POST | `/drafts/` | JWT | `createDraft` |
| DELETE | `/drafts/:id` | JWT | `deleteDraft` |

### Domain: Debug

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/debug/voting-state/:eventId` | JWT | `checkVotingState` |
| GET | `/debug/rewards-pending` | **JWT (Fixed)** | `getPendingRewardUsers` |

---

## 3. Execution Flow Patterns

**Pattern A — Correct (majority of codebase):**
```
Route file (registers path + middleware)
  → Controller (req parse → service call → res.json)
  → Service (business rules + Prisma)
  → Prisma → DB
```
Examples: `submissionController → submissionService`, `voteController → voteService`, `brandXpController → brandXpService`

---

**Pattern B — Controller bypassing service (common deviation):**
```
Route file
  → Controller (req parse → direct prisma.xxx call)
  → Prisma → DB
```
Files affected: `notificationController.ts`, `draftController.ts`, `voteController.ts` (for `getVoterBreakdown`, `getEventParticipants`), `xpController.ts` (for `getXpTransactions`)

---

**Pattern C — Fat route handler (single outlier):**
```
analyticsRoutes.ts (~350 lines)
  → Inline handler functions containing prisma calls + auth checks + AI service calls
```
No controller or service file involved. All logic lives inside the router file.

---

**Pattern D — Repeated Prisma lookup inside controller (intra-file duplication):**
```
eventController.ts — every handler independently executes:
  prisma.brand.findFirst({ where: { userId } }) → if not found, return 403
```
This brand ownership verification is duplicated 8 times in the same file with no shared extraction.

---

**Cross-cutting: Service-to-Service calls**

Several services call other services directly:
- `rewardsService` → `notificationService`
- `voteService` → `xpService` → `milestoneService`

This is acceptable but creates implicit dependency chains that are undocumented.

---

## 4. Major Structural Issues

### ~~4.1 Unauthenticated Admin-Equivalent Routes~~ [FIXED]
~~`/api/brand-application/applications` (list, get, approve, reject) have commented-out auth middleware marked `// TODO`. Any anonymous caller can currently approve or reject brand applications.~~

### 4.2 Fat Route File (`analyticsRoutes.ts`)
~350 lines of inline handler logic with direct Prisma calls, brand ownership checks, and Gemini AI service calls. There is no `analyticsController.ts` — the router acts as controller and service simultaneously.

### 4.3 Hardcoded Credentials in Source Files
- `adminMiddleware.ts`: `ADMIN_USERNAME = 'admin'` and `ADMIN_PASSWORD = 'admin'` as string literals
- `aiService.ts` line 12: Full Pinata JWT hardcoded as a string literal (not from `process.env`)

### ~~4.4 Dead Code — Unused Auth System~~ [FIXED]
~~`utils/jwt.ts` + `UserSession` DB table: the custom JWT system was replaced by Privy but never removed. `generateToken()` is called in `authService.ts` and sessions are written to the DB, but `authenticateJWT` reads the Privy token and never checks `UserSession`. The `logout` route marks sessions inactive but auth ignores session state entirely. Replaced completely by Privy.~~

### ~~4.5 Dead Code — Duplicate App Factory~~ [FIXED]
~~`src/config/app.ts` exports a `createApp()` that is never imported anywhere. The actual app factory is in `src/app.ts`. No functional impact, but dead code.~~

### ~~4.6 Runtime Field Reference Bug~~ [FIXED]
~~`voteController.ts` (~line 165) selects `profilePicCid` from the `User` model in a Prisma query. This field does not exist in `schema.prisma` (the correct field is `avatarUrl`). The `getEventParticipants` endpoint will throw a Prisma validation error at runtime.~~

### 4.7 In-Memory Presence Service
`presenceService.ts` uses a `Map<string, Set<string>>` in process memory. Incompatible with horizontal scaling; all presence state is lost on server restart.

### 4.8 Background Timer in Entry Point
`server.ts` runs a `setInterval` every 60 seconds to auto-transition event states. No error backoff, no circuit breaker. A failed transition is silently swallowed and can affect all subsequent runs within the same interval.

### ~~4.9 Repository Pollution~~ [FIXED]
~~- `src/controllers/rewardsController.ts.backup` is committed to the repo~~
~~- `src/scripts/` contains ~60 one-off operational scripts including archived test directories~~
~~- 10+ debug `.ts` files at the repository root (`checkUser.ts`, `check-brands.ts`, etc.)~~
~~- `src/examples/` contains unused example code~~

### ~~4.10 Email Service Duplication~~ [FIXED]
~~Both `src/services/emailService.ts` and `src/utils/emailService.ts` exist. The service imports from the util. No clear separation of responsibility; the naming is confusing.~~

---

## 5. Code Quality Issues

### 5.1 String-Based Error Handling
Services throw plain `new Error("message string")`. Controllers catch these and use `error.message.includes("not found")` / `error.message.includes("permission")` style matching to select HTTP status codes. No custom error class hierarchy exists. Adding a new error type requires updating every controller's catch block individually.

### 5.2 No Schema Validation Library
Validation is done via manual inline checks in controllers (`if (!title) return res.status(400)...`). There is no Zod, Joi, or express-validator in use. Validation logic is inconsistent across routes — some fields are checked, others are assumed safe from the request body.

### 5.3 Unstructured Logging
All logging is `console.log` / `console.error` with emoji prefixes. No structured logging (Winston/Pino), no log levels, no request correlation IDs, no trace context. Tracing a request across its full lifecycle in production is not feasible.

### 5.4 Email Verification Permanently Bypassed
`requireEmailVerification` middleware always calls `next()` unless `ENABLE_VERIFICATION=true` is explicitly set. Routes that declare this middleware are not actually enforcing it. There is no indication in the codebase that this env var is set in any environment.

### 5.5 Inconsistent Auth on Search Routes
`/api/search/*` requires JWT, but `/api/users/search` and `/api/users/check-username` are public. The same conceptual intent (search) has different auth requirements depending on which route group is hit.

### 5.6 Type Safety Gaps
- Controllers routinely cast `req.user` without null-checking when behind `authenticateOptional`
- Several controller files use `any` or unchecked casting for request body fields
- The Prisma stale-field bug (4.6) was not caught at compile time due to insufficient type coverage on Prisma select objects

### 5.7 Socket.io Example File is Dead Code
`socket/examples.ts` is in the codebase but never imported anywhere. It appears to be documentation-as-code rather than production usage.

---

## 6. Database Models (Prisma Schema — 26 Models, 11 Enums)

| Model | Purpose |
|-------|---------|
| `User` | Core user identity, XP, wallet, streaks, privacy, counters |
| `UserSession` | Login session tracking (legacy — unused by auth middleware) |
| `Brand` | Brand profile, XP level, USDC stats, discount tier |
| `Event` | Event lifecycle with state machine and blockchain fields |
| `Submission` | User-created content for `post_and_vote` events |
| `SubmissionStats` | Aggregate votes/clicks/viewTime per submission |
| `Proposal` | Pre-set voting options for `vote_only` events |
| `Vote` | Per-user vote record (unique per user/event/submission or proposal) |
| `ActivityLog` | General activity tracking |
| `EventAnalytics` | Aggregate metrics per event (views, shares, AI summary) |
| `LeaderboardSnapshot` | Periodic snapshots of leaderboard state |
| `UserFollowers` | Social graph (follower/following) |
| `BrandSubscription` | User-to-brand subscription |
| `Notification` | In-app notifications with optional expiry |
| `TokenActivityLog` | Blockchain token action audit trail |
| `BrandApplication` | Brand onboarding applications with claim token |
| `UserLoginStreak` | Daily login streak tracking |
| `OnboardingAnalytics` | One-time onboarding survey data |
| `XpMilestoneClaimed` | Milestone XP reward tracking (unique per user/category/threshold) |
| `XpTransaction` | XP ledger with running balance |
| `Referral` | Referral code linkage (unique per referred user) |
| `BrandLevelSnapshot` | Brand level change audit trail |
| `EventRewardsPool` | Reward pool per event (USDC amounts) |
| `RewardClaim` | Individual user reward claims (unique per pool/user/claimType) |
| `EventInteraction` | View/click/share/vote interaction events |
| `UserDraft` | Saved AI-generated image drafts |

---

## 7. External Integrations

| Integration | Library | Usage |
|-------------|---------|-------|
| **Privy** | `@privy-io/server-auth` | JWT verification on every protected request; initial login/user creation |
| **Google Gemini** | `@google/generative-ai` | Text generation (`gemini-2.5-flash`), image generation (`imagen-3.0-generate-001`) |
| **Pinata / IPFS** | `axios` (direct HTTP) | Image upload to IPFS; URL serving via `PINATA_GATEWAY` |
| **Firebase Admin** | `firebase-admin` | Phone number verification |
| **Nodemailer** | `nodemailer` | OTP emails via Gmail SMTP (currently disabled in controllers) |
| **Polygon Amoy** | `ethers`, `viem`, `permissionless` | ERC-4337 gasless transactions via Pimlico paymaster |
| **Pimlico** | `permissionless` | Paymaster for gasless blockchain transactions |
| **RewardsVaultV3** | Contract ABI | On-chain: `creditRewardsBatch`, `cancelEvent`, `getBrandRefundBalance` |
| **Socket.io** | `socket.io` | Real-time presence, vote updates, personal notifications |
| **Supabase PostgreSQL** | Prisma | Two URLs: PgBouncer pooled (runtime) + direct (migrations) |

---

## 8. Suggested Domain Grouping

Based strictly on observed code behavior, not desired architecture.

| Domain | Current Files | Notes |
|--------|--------------|-------|
| **auth** | authRoutes, authController, authService, jwt util, authMiddleware | Privy flow + dead custom JWT system |
| **user** | userRoutes, userController, userService | Core user identity |
| **event** | eventRoutes, eventController, eventService | Full lifecycle management |
| **submission** | submissionRoutes, submissionController, submissionService | Content submissions |
| **proposal** | proposalRoutes, proposalController, proposalService | Vote-only options |
| **vote** | voteRoutes, voteController, voteService | Voting mechanics |
| **reward** | rewardsRoutes, rewardsController, rewardsService, lib/blockchain | On-chain reward distribution |
| **brand** | brandRoutes, brandController, brandXpRoutes, brandXpController, brandXpService | Profile + leveling |
| **brand-onboarding** | brandApplicationRoutes/Controller/Service, brandClaimRoutes/Controller/Service | Fragmented across 6 files |
| **xp** | xpRoutes, xpController, xpService, milestoneService, loginStreakService, referralService | User XP ecosystem |
| **analytics** | analyticsRoutes (fat), analyticsService, aiService (partial) | Fat route + service split |
| **ai** | aiRoutes, aiController, aiService | Generation features |
| **social** | follow (inside userRoutes), subscriptionRoutes/Controller/Service, notificationRoutes/Controller/Service | No dedicated domain files |
| **explore / feed** | exploreRoutes, exploreService, feedRoutes, feedController, homeService | Discovery features |
| **leaderboard** | leaderboardRoutes, leaderboardController, leaderboardService | Snapshot-based |
| **search** | searchRoutes, searchController | Cross-domain search |
| **admin** | adminRoutes, adminController + partial brandApplication routes | Mixed with application domain |
| **infrastructure** | lib/prisma, lib/blockchain, lib/firebaseAdmin, socket/, presenceService | Shared infrastructure |

---

## 9. Risk Areas for Any Future Refactor

### ~~R1 — Unauthenticated Brand Application Approval (Active Exploit Vector)~~ [FIXED]
~~`/brand-application/applications/approve` is live with no auth. Any refactor must fix this, not accidentally preserve it.~~

### R2 — Rewards + Blockchain Coupling
`rewardsService.ts` directly calls blockchain functions. On-chain state (event cancellation, credit batches) must stay in sync with DB state. Any service boundary changes here risk partial-commit scenarios with no rollback path.

### R3 — Event State Machine
`EventService` manages a multi-stage lifecycle: `DRAFT → PUBLISHED → POSTING → VOTING → COMPLETED → CANCELLED`. Many services and controllers branch on `event.status`. Extracting or restructuring this domain risks breaking all callers.

### R4 — Dead Auth System Cleanup
Removing `UserSession` table and `utils/jwt.ts` requires confirming no external caller depends on the custom JWT. The `logout` endpoint currently uses it — removing it without replacing the endpoint would break clients.

### R5 — Analytics Route Refactor   
`analyticsRoutes.ts` mixes route registration, business logic, Prisma access, and AI calls in one file. Splitting it incorrectly could break the AI insights pipeline which is also consumed by `aiService.ts`.

### R6 — Socket.io + Notification Coupling
`notificationService.ts` calls `io.to(socketId).emit(...)` directly. If the socket layer is moved or the notification service is extracted into a separate module, this tight coupling must be explicitly resolved (e.g., via an event emitter or message bus).

### R7 — Background Job Idempotency
The `setInterval` in `server.ts` for event auto-transition is not idempotent. If it fires twice during a graceful restart overlap, an event could be double-transitioned. This must be made idempotent before being moved to any external job system.

### ~~R8 — Prisma Field Bug Must Be Fixed First~~ [FIXED]
~~`getEventParticipants` is currently broken at runtime (`profilePicCid` does not exist). Any refactor touching `voteController.ts` must fix this first, or the regression will be incorrectly attributed to the refactor.~~

### R9 — Scripts Directory Contains Live DB Access
`src/scripts/` scripts reference production DB connections via environment variables. Running them carelessly during a refactor could mutate production data. They must not remain in `src/`.

---

## Phase 2 Audit: Code Quality, Maintainability, and Scalability

### 1. High-Impact Issues (Must fix soon)
- **Backend "God Services":** Core foundational files tightly couple pure domain logic with external infrastructure operations (like executing nested Prisma transactions simultaneously with external IPFS HTTP requests). This guarantees transaction locking issues down the line and makes unit testing impossible.

### 2. Medium Issues (Should fix)
- **Unsafe TypeScript Catch Statements:** The vast majority of backend `try/catch` blocks blindly cast `catch (error: any)`, nullifying TypeScript's safety validation. This risks `undefined` property access crashes across all core API controllers.
- **Scattered Environment Constraints:** Environment variables (`process.env.VAR_NAME`) are invoked dynamically and deeply piecemeal across 20+ codebase files (e.g., directly inside `authService.ts`), rather than via a singular, strictly-typed and Zod-validated configuration schema parsed reliably at app-boot time.
- **Simultaneous DB Thrash Loading:** Certain endpoints manually aggregate heavily-nested statistics by triggering heavy `.count()` queries wrapped concurrently inside `Promise.all()` loops that never cap connection limits, risking systemic exhaustion under realistic traffic.

### 3. Low Priority Cleanup
- **Inconsistent Domain Terminology:** There is overlapping, loose usage of "Proposals" versus "Submissions" conceptually leaking between frontend routing architecture, backend data controllers, and the Prisma database schema.

### 4. Specific File References
- **`server/src/services/eventService.ts` (~1597 lines)** -> *Why it's a problem:* Combines schema validation logic, locking constraints, huge monolithic database transactions, and unpredictable sequential IPFS fetch data loading.
- **`server/src/services/rewardsService.ts` (~1120 lines)** -> *Why it's a problem:* Highly bloated service file attempting to handle off-chain database aggregations side-by-side with localized synchronization algorithms for payout state.
- **`server/src/controllers/authController.ts`** -> *Why it's a problem:* Visually pinpoints the systemic `catch (error: any)` typing hazard alongside ad-hoc substring matching (`error.message?.includes('expired')`), revealing the absence of disciplined `AppError` payload inheritance.
