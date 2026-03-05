# Aris Platform — API Endpoints Reference

> **Base URL:** `http://localhost:3000/api` (development)
> All protected routes require `Authorization: Bearer <jwt_token>` header unless stated otherwise.

---

## Authentication

### How to Authenticate

1. Call `GET /api/auth/nonce?address=<wallet>` to get a nonce
2. Sign the returned `message` with the wallet
3. Call `POST /api/auth/login` with the signature
4. Use the returned `token` as `Authorization: Bearer <token>` on subsequent requests

---

## Route Groups

| Prefix | Description |
|---|---|
| `/api/auth` | Web3 wallet login / logout |
| `/api/users` | User profile, follow, email OTP |
| `/api/brands` | Brand profile management |
| `/api/brand-application` | Brand registration applications |
| `/api/brand-claim` | Brand onboarding via claim token |
| `/api/brand-xp` | Brand level & discount system |
| `/api/events` | Events CRUD + status management |
| `/api/events/:eventId/proposals` | Proposals inside an event |
| `/api/events/:eventId/submissions` | Submissions inside an event |
| `/api/events/:eventId/...` | Voting inside an event |
| `/api/rewards` | Reward pools, claims, brand refunds |
| `/api/xp` | User XP, streaks, referrals |
| `/api/analytics` | Event & brand analytics + AI summary |
| `/api/search` | Global search (users/brands/events) |
| `/api/leaderboard` | Public leaderboards |
| `/api/notifications` | User notification inbox |
| `/api/subscriptions` | Brand subscriptions |
| `/api/phone` | Phone number verification |
| `/api/ai` | AI image generation & proposals |
| `/api/admin` | Admin dashboard (Basic Auth) |

---

## AUTH — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/auth/nonce` | None | Get a nonce for wallet signing |
| POST | `/auth/login` | None | Login with wallet signature, get JWT |
| POST | `/auth/logout` | Optional JWT | Invalidate session |
| POST | `/auth/verify` | None | Verify a signature (testing) |

### `GET /api/auth/nonce`
- **Query:** `address` (wallet address)
- **Response:** `{ nonce, message }`

### `POST /api/auth/login`
```json
// Request Body
{
  "address": "0x...",
  "signature": "0x...",
  "message": "...",
  "nonce": "...",
  "email": "optional",
  "smartAccountAddress": "optional"
}
// Response
{ "token": "<jwt>", "user": { ...UserObject }, "sessionId": "..." }
```

### `POST /api/auth/logout`
- **Response:** `{ success: true, message: "Logged out" }`

---

## USERS — `/api/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | JWT | Get current user |
| GET | `/users/me/stats` | JWT | Get current user stats |
| GET | `/users/me/followers` | JWT | Get current user's followers |
| GET | `/users/me/following` | JWT | Get current user's following list |
| POST | `/users` | JWT + Email Verified | Create or update user |
| PUT | `/users` | JWT + Email Verified | Upsert user (alt method) |
| PATCH | `/users/profile` | JWT + Email Verified | Update profile fields |
| PATCH | `/users/wallet` | JWT | Update wallet address |
| POST | `/users/email/send-otp` | JWT | Send OTP to email |
| POST | `/users/email/verify-otp` | JWT | Verify email OTP |
| POST | `/users/follow/:followingId` | JWT + Email Verified | Follow a user |
| DELETE | `/users/follow/:followingId` | JWT + Email Verified | Unfollow a user |
| GET | `/users` | None | Get all users |
| GET | `/users/:id` | None | Get user by ID |
| GET | `/users/username/:username` | None | Get user by username |
| GET | `/users/check-username` | None | Check username availability |
| GET | `/users/:userId/followers` | None | Get user's followers |
| GET | `/users/:userId/following` | None | Get user's following |
| GET | `/users/:userId/stats` | None | Get user's public stats |
| GET | `/users/:userId/submissions` | None | Get user's submissions |

### `PATCH /api/users/profile`
```json
// Request Body (all optional)
{
  "displayName": "...",
  "avatarUrl": "...",
  "gender": "...",
  "dateOfBirth": "YYYY-MM-DD"
}
```

### `POST /api/users/email/send-otp`
```json
{ "email": "user@example.com" }
```

### `POST /api/users/email/verify-otp`
```json
{ "email": "user@example.com", "otp": "123456" }
```

---

## BRANDS — `/api/brands`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/brands/me` | JWT | Get authenticated brand's profile |
| POST | `/brands` | JWT | Create or update brand profile |
| GET | `/brands/milestones` | JWT | Get brand's milestones |

### `POST /api/brands`
```json
{
  "name": "brand-slug",
  "displayName": "Brand Display Name",
  "description": "...",
  "categories": ["fashion", "lifestyle"],
  "logoUrl": "...",
  "websiteUrl": "..."
}
```

---

## BRAND APPLICATION — `/api/brand-application`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/brand-application/register` | None | Submit brand application |
| GET | `/brand-application/status` | None | Check application status by email |
| GET | `/brand-application/applications` | None (admin TODO) | List all applications |
| GET | `/brand-application/applications/:id` | None (admin TODO) | Get specific application |
| PUT | `/brand-application/applications/:id/approve` | None (admin TODO) | Approve application |
| PUT | `/brand-application/applications/:id/reject` | None (admin TODO) | Reject application |

### `POST /api/brand-application/register`
```json
{
  "companyName": "Acme Corp",
  "email": "contact@acme.com",
  "category": "fashion",
  "description": "..."
}
```

### `GET /api/brand-application/status`
- **Query:** `email`

---

## BRAND CLAIM — `/api/brand-claim`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/brand-claim/claim/:token` | None | Validate claim token, get brand info |
| POST | `/brand-claim/claim` | None | Finalize brand claim and create account |

### `POST /api/brand-claim/claim`
```json
{
  "claimToken": "...",
  "email": "brand@example.com",
  "walletAddress": "0x...",
  "displayName": "optional"
}
// Response
{ "success": true, "user": {...}, "brand": {...} }
```

---

## BRAND XP — `/api/brand-xp`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/brand-xp/status` | JWT | Brand's current level and XP |
| GET | `/brand-xp/discount` | JWT | Brand's discount percentage |
| GET | `/brand-xp/history` | JWT | Level change history |
| GET | `/brand-xp/thresholds` | None | Level threshold config |
| POST | `/brand-xp/recalculate` | JWT | Force recalculate brand level |

---

## EVENTS — `/api/events`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/events` | Optional JWT | List events (filterable) |
| GET | `/events/brand/me` | JWT | Get brand's own events |
| GET | `/events/user/:userId/voted` | None | Events voted by user |
| GET | `/events/:id` | Optional JWT | Get single event |
| POST | `/events` | JWT | Create event |
| PUT | `/events/:id` | JWT | Update event |
| PATCH | `/events/:id/status` | JWT | Update event status |
| PATCH | `/events/:id/blockchain` | JWT | Update blockchain status (success) |
| PATCH | `/events/:id/blockchain-failed` | JWT | Update blockchain status (failed) |
| POST | `/events/:id/publish` | JWT | Publish event (DRAFT → SCHEDULED) |
| POST | `/events/:id/cancel` | JWT | Cancel event |
| POST | `/events/:id/stop` | JWT | Stop event early |
| DELETE | `/events/:id` | JWT | Delete event |

### `GET /api/events`
- **Query:** `status?`, `brandId?`, `type?`, `limit?`, `offset?`

### `POST /api/events`
```json
{
  "title": "Event Title",
  "description": "...",
  "eventType": "SUBMISSION_ONLY | PROPOSAL_ONLY | HYBRID",
  "status": "DRAFT",
  "startDate": "ISO8601",
  "endDate": "ISO8601",
  "rewardPool": 1000,
  "maxParticipants": 100
}
```

### `PATCH /api/events/:id/status`
```json
{ "status": "DRAFT | SCHEDULED | ACTIVE | COMPLETED | CANCELLED" }
```

---

## PROPOSALS — `/api/events/:eventId/proposals`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/events/:eventId/proposals` | None | Get proposals for an event |
| POST | `/events/:eventId/proposals` | JWT | Create a proposal |
| PUT | `/proposals/:id` | JWT | Update proposal |
| DELETE | `/proposals/:id` | JWT | Delete proposal |

### `POST /api/events/:eventId/proposals`
```json
{
  "title": "My Proposal",
  "description": "...",
  "imageUrl": "optional"
}
```

---

## SUBMISSIONS — `/api/events/:eventId/submissions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/events/:eventId/submissions` | None | List submissions for event |
| GET | `/events/:eventId/submissions/has-submitted` | JWT | Check if current user submitted |
| GET | `/events/:eventId/submissions/me` | JWT | Get current user's submission |
| POST | `/events/:eventId/submissions` | JWT | Create submission |
| PUT | `/submissions/:id` | JWT | Update submission |
| DELETE | `/submissions/:id` | JWT | Delete submission |

### `POST /api/events/:eventId/submissions`
```json
{
  "title": "My Submission",
  "description": "...",
  "imageUrl": "optional",
  "contentUrl": "optional"
}
```

---

## VOTES — `/api/events/:eventId`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/events/:eventId/my-votes` | JWT | Get user's votes for event |
| GET | `/events/:eventId/has-voted` | JWT | Check if user has voted |
| POST | `/events/:eventId/proposals/vote` | JWT | Vote for proposals |
| POST | `/events/:eventId/submissions/:submissionId/vote` | JWT | Vote for a submission |

### `POST /api/events/:eventId/proposals/vote`
```json
{ "proposalIds": ["id1", "id2"] }
```

### `POST /api/events/:eventId/submissions/:submissionId/vote`
```json
{ "weight": 1 }
```

---

## REWARDS — `/api/rewards`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/rewards/constants` | None | Reward system constants |
| GET | `/rewards/contract-info` | None | Smart contract addresses |
| GET | `/rewards/pools/:eventId/calculate` | Optional JWT | Calculate pool requirements |
| GET | `/rewards/pools/:eventId` | Optional JWT | Get pool status |
| POST | `/rewards/pools/:eventId/cancel` | JWT | Cancel a reward pool |
| GET | `/rewards/claims/:eventId` | JWT | Get user's claims for event |
| POST | `/rewards/claims/:eventId/confirm` | JWT | Confirm claim (Web2) |
| GET | `/rewards/me` | JWT | User's rewards summary |
| GET | `/rewards/user/claimable` | JWT | All claimable rewards |
| GET | `/rewards/user/history` | JWT | Claim history |
| POST | `/rewards/claim` | JWT | Claim a reward |
| POST | `/rewards/confirm-all-claims` | JWT | Confirm all after on-chain tx |
| POST | `/rewards/sync-claims` | JWT | Sync DB with on-chain state |
| GET | `/rewards/brand/refunds` | JWT | Brand's refundable balance |
| GET | `/rewards/brand/claimable` | JWT | Brand's claimable event rewards |

### `POST /api/rewards/claim`
```json
{ "rewardId": "..." }
```

---

## XP & PROGRESSION — `/api/xp`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/xp/login-ping` | JWT | Record daily login, update streak |
| GET | `/xp/me` | JWT | Full XP status |
| GET | `/xp/milestones` | JWT | Milestone progress |
| GET | `/xp/multiplier` | JWT | Reward multiplier |
| GET | `/xp/transactions` | JWT | XP transaction history |
| GET | `/xp/referral` | JWT | Referral info and stats |
| POST | `/xp/referral/generate` | JWT | Generate referral code |

### `GET /api/xp/transactions`
- **Query:** `limit?`, `offset?`

---

## ANALYTICS — `/api/analytics`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/analytics/events/:id/view` | Optional JWT | Track a view |
| POST | `/analytics/events/:id/share` | Optional JWT | Track a share |
| POST | `/analytics/events/:id/click` | Optional JWT | Track a click |
| GET | `/analytics/events/:id` | JWT | Get event analytics |
| GET | `/analytics/events/:id/detailed` | JWT | Get detailed analytics |
| GET | `/analytics/brand/overview` | JWT | Brand aggregate analytics |
| POST | `/analytics/events/:id/generate-summary` | JWT | Generate AI summary |

### `POST /api/analytics/events/:id/click`
```json
{ "target": "cta_button" }
```

---

## SEARCH — `/api/search`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/search/users` | JWT | Search users |
| GET | `/search/brands` | JWT | Search brands |
| GET | `/search/events` | JWT | Search events |
| GET | `/search/all` | JWT | Search all (users + brands + events) |
| GET | `/search/user/:username` | JWT | Get profile by username |
| GET | `/search/brand/:identifier` | JWT | Get brand by ID or slug |

### Query params for search endpoints
- `q` — search string (min 2 chars, required)
- `limit` — max results (default 10, max 50)

---

## LEADERBOARD — `/api/leaderboard`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/leaderboard/brands` | None | Brand leaderboard |
| GET | `/leaderboard/users` | None | User leaderboard |
| GET | `/leaderboard/events` | None | Event leaderboard |
| GET | `/leaderboard/content` | None | Content leaderboard |

- **Query:** `limit?`, `offset?`

---

## NOTIFICATIONS — `/api/notifications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | JWT | All notifications |
| GET | `/notifications/unread` | JWT | Unread notifications |
| GET | `/notifications/count` | JWT | Unread count |
| PATCH | `/notifications/read-all` | JWT | Mark all as read |
| PATCH | `/notifications/:id/read` | JWT | Mark one as read |
| DELETE | `/notifications/:id` | JWT | Delete a notification |

### `GET /api/notifications`
- **Query:** `limit?`, `offset?`, `isRead?`

---

## SUBSCRIPTIONS — `/api/subscriptions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/subscriptions/:brandId` | JWT | Subscribe to brand |
| DELETE | `/subscriptions/:brandId` | JWT | Unsubscribe from brand |
| GET | `/subscriptions/:brandId/status` | Optional JWT | Subscription status |
| GET | `/subscriptions/my-subscriptions` | JWT | User's subscribed brands |
| GET | `/subscriptions/brand/:brandId/subscribers` | JWT | Brand's subscribers |
| GET | `/subscriptions/brand/:brandId/count` | None | Subscriber count |

---

## PHONE — `/api/phone`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/phone/check-availability` | JWT | Check if phone is available |
| POST | `/phone/verify-firebase` | JWT | Verify Firebase phone token |

### `GET /api/phone/check-availability`
- **Query:** `phoneNumber`

### `POST /api/phone/verify-firebase`
```json
{ "phoneToken": "firebase-id-token", "phoneNumber": "+1234567890" }
```

---

## AI — `/api/ai`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/ai/generate-image` | JWT | Generate image from prompt |
| POST | `/ai/refine-prompt` | JWT | Refine an image prompt |
| POST | `/ai/generate-proposals` | JWT | Generate proposal ideas |

### `POST /api/ai/generate-image`
```json
{ "prompt": "A futuristic city at night", "styleGuide": "optional" }
// Response: { "imageUrl": "...", "prompt": "..." }
```

### `POST /api/ai/refine-prompt`
```json
{ "prompt": "...", "objective": "optional" }
// Response: { "refinedPrompt": "...", "suggestions": [] }
```

### `POST /api/ai/generate-proposals`
```json
{ "eventDescription": "...", "count": 5 }
// Response: { "proposals": [...] }
```

---

## ADMIN — `/api/admin`

> **Auth:** HTTP Basic Auth — `admin:admin`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard statistics |
| GET | `/admin/sessions` | User sessions |
| GET | `/admin/activities` | User activities |
| GET | `/admin/applications` | All brand applications |
| GET | `/admin/applications/:id` | Specific application |
| PUT | `/admin/applications/:id/approve` | Approve application |
| PUT | `/admin/applications/:id/reject` | Reject application |
| POST | `/admin/brands/:id/approve` | Approve brand, generate claim token |
| GET | `/admin/brands/:id/claim-email-template` | Get claim email template |

### `GET /api/admin/applications`
- **Query:** `status?`, `limit?`

---

## MISC

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | None | API info |
| GET | `/health` | None | Health check |
| GET | `/debug/voting-state/:eventId` | JWT | Voting state (dev only) |

---

## Common Response Patterns

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Error message", "code": "ERROR_CODE" }

// Paginated
{ "data": [...], "total": 100, "limit": 10, "offset": 0 }
```

## Common HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 500 | Internal Server Error |

---

## Auth Header Example

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

*Total endpoints: 135 | Generated from: `server/src/routes/`*
