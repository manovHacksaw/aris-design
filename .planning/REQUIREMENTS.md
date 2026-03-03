# Requirements: Aris

**Defined:** 2026-03-03
**Core Value:** Brands can activate creator communities with real USDC rewards in one click — and creators never touch a wallet UI.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User's `privyId` is stored as the primary identifier in DB and used for all lookups
- [ ] **AUTH-02**: JWT is verified via Privy's public JWKS on all protected backend routes
- [ ] **AUTH-03**: Old nonce/signature auth logic is removed from backend middleware and routes
- [ ] **AUTH-04**: Re-login with same Privy account does not create a duplicate user record
- [ ] **AUTH-05**: Smart account address (not EOA) is stored in `user.walletAddress` and synced on every login
- [ ] **AUTH-06**: Auth loading states are clean — no popup flicker, no race between role detection and redirect
- [ ] **AUTH-07**: After login, user is redirected based on role: `BRAND_OWNER` → `/brand/dashboard`, `USER` → `/`
- [ ] **AUTH-08**: No wallet UI complexity visible during auth — no addresses, no chain IDs

### Blockchain Abstraction

- [ ] **CHAIN-01**: `lib/blockchain/client.ts` exports a typed `publicClient` for Polygon Amoy with RPC fallback
- [ ] **CHAIN-02**: `lib/blockchain/contracts.ts` exports vault address, USDC address, ABI read helpers, and `USDC_DECIMALS = 6` constant
- [ ] **CHAIN-03**: `lib/blockchain/gasless.ts` exports `sendGaslessTransaction(calls[])` — batch UserOp via Pimlico, handles undeployed account (initCode) detection, nonce management, and receipt waiting
- [ ] **CHAIN-04**: No component or page ever imports viem or ABI JSON directly — all blockchain access goes through `lib/blockchain/`
- [ ] **CHAIN-05**: `SmartWalletsProvider` in `ClientProviders.tsx` is configured with explicit Pimlico bundler URL and paymaster URL for Polygon Amoy

### Paymaster Configuration

- [ ] **PAY-01**: Pimlico sponsorship policy exists on the Pimlico Dashboard for Polygon Amoy (chainId 80002), whitelisting the `REWARDS_VAULT_ADDRESS` and `USDC_ADDRESS`
- [ ] **PAY-02**: A test UserOp appears in the Pimlico dashboard explorer confirming sponsorship is active before event creation code is written
- [ ] **PAY-03**: Privy Dashboard has Smart Wallets enabled for `eip155:80002` with explicit bundler and paymaster URLs pointing to Pimlico

### Event Creation

- [ ] **EVENT-01**: Brand can create an event via a multi-step campaign builder (brief → type & rules → rewards → review)
- [ ] **EVENT-02**: Brand sets: event name, description, creative brief, event type (post_and_vote | vote_only), max voter/participant cap, start and end dates, USDC reward pool amount
- [ ] **EVENT-03**: System displays reward breakdown preview (base rewards per voter, per creator, leaderboard pool, platform fee) before brand confirms
- [ ] **EVENT-04**: On confirm, a single atomic UserOp is submitted: `approve(USDC, vault, amount)` + `createEvent(...)` bundled — never two separate transactions
- [ ] **EVENT-05**: Step indicator modal shows on-chain progress: "Preparing event → Approving USDC → Locking reward pool → Event Activated"
- [ ] **EVENT-06**: Event is saved to DB and set to `draft` status; status changes to `scheduled` only after `waitForUserOperationReceipt` confirms on-chain success
- [ ] **EVENT-07**: `onChainEventId` is written to the DB event record after on-chain confirmation
- [ ] **EVENT-08**: No raw transaction hash or contract address is shown in the primary UI — hash available in expandable "Details" only

### Content Submission

- [ ] **CONT-01**: Creator can submit text + media (image) to a post_and_vote event while it is in `posting` status
- [ ] **CONT-02**: Media is uploaded to IPFS via Pinata and stored as a CID; displayed via `https://gateway.pinata.cloud/ipfs/${cid}`
- [ ] **CONT-03**: Creator cannot submit more than once per event (guarded by `hasSubmitted` check)
- [ ] **CONT-04**: Submission is rejected if event status is not `posting`
- [ ] **CONT-05**: Submission form has a loading state and success confirmation — no blockchain interaction required for submission

### Voting

- [ ] **VOTE-01**: User can vote on a submission (post_and_vote) or proposal (vote_only) with a single click
- [ ] **VOTE-02**: Vote is recorded optimistically on the frontend — vote count ticks up immediately with no visible delay
- [ ] **VOTE-03**: If the API call fails, the optimistic vote is rolled back and the previous count is restored
- [ ] **VOTE-04**: User cannot vote on their own submission in post_and_vote events
- [ ] **VOTE-05**: In both event types, voting is capped at the max participant limit (first-come-first-served); votes beyond cap are rejected with a clear message
- [ ] **VOTE-06**: User can only vote once per event (or once per submission in post_and_vote, where multiple votes are distributed)
- [ ] **VOTE-07**: Voted state persists on reload — backend returns user's existing votes with event data

### Reward Claim

- [ ] **REWD-01**: User can see their claimable USDC balance after an event they participated in is completed and rewards are credited
- [ ] **REWD-02**: Claiming rewards is a single gasless `claimRewards()` UserOp — no gas prompt, no wallet pop-up
- [ ] **REWD-03**: Claim flow shows animated step indicator: "Preparing claim → Processing on-chain → Rewards credited"
- [ ] **REWD-04**: After successful claim, wallet balance animates (count-up) and a subtle confetti effect plays
- [ ] **REWD-05**: Claim button status updates to "Claimed" after success — no double-claiming
- [ ] **REWD-06**: DB claim status is synced from CREDITED to CLAIMED via `POST /api/rewards/confirm-all` after on-chain confirmation
- [ ] **REWD-07**: Reward breakdown is shown before claiming: per-event earnings, role (creator / voter / leaderboard), and total

### Brand Dashboard

- [ ] **BRAND-01**: Brand dashboard shows live event analytics: submission count, vote count, unique participants per event
- [ ] **BRAND-02**: Brand can see their embedded wallet USDC balance with instructions for pre-funding it
- [ ] **BRAND-03**: Brand can view their refundable balance from cancelled or expired events

---

## v2 Requirements

### Trust & Safety

- **TRUST-01**: Trust score calculation (EMA formula) updates on each vote/submission action
- **TRUST-02**: Low trust score gates access to voting in high-value events
- **TRUST-03**: User can report submissions for moderation review

### Social

- **SOCL-01**: Referral link generation for event promotion
- **SOCL-02**: Brand level / tier display (BrandLevelSnapshot) on dashboard

### Content

- **CONT-V2-01**: Multi-image support per submission
- **CONT-V2-02**: Video submission support
- **CONT-V2-03**: AI submission assistant polish (AICreateModal `refineAiPrompt()` UX)

### Analytics

- **ANLX-01**: Brand can export event analytics as CSV
- **ANLX-02**: Real-time participant count during event lifecycle

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first; mobile is v2+ |
| Multi-chain | Polygon Amoy only for v1; multi-chain adds paymaster policy complexity |
| Fiat-to-USDC onramp | Brand pre-funds embedded wallet directly; onramp adds 3rd-party dependency |
| External wallet (MetaMask/Coinbase) | Would require full auth flow redesign; embedded wallet only |
| Custom platform ERC-20 token | USDC only; custom token adds tokenomics complexity |
| Gas fee prompts | Anti-feature — paymaster sponsors all gas, never shown to user |
| Visible wallet addresses in primary UI | Anti-feature — blockchain layer must be invisible |
| Live WebSocket vote counts per-submission | Anti-feature — incentivizes gaming behavior; refresh only after user votes |
| Video streaming / media storage | Significant IPFS/storage cost; defer to v2 |

---

## Traceability

_Populated during roadmap creation._

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Pending |
| AUTH-08 | Phase 1 | Pending |
| CHAIN-01 | Phase 2 | Pending |
| CHAIN-02 | Phase 2 | Pending |
| CHAIN-03 | Phase 2 | Pending |
| CHAIN-04 | Phase 2 | Pending |
| CHAIN-05 | Phase 2 | Pending |
| PAY-01 | Phase 3 | Pending |
| PAY-02 | Phase 3 | Pending |
| PAY-03 | Phase 3 | Pending |
| EVENT-01 | Phase 4 | Pending |
| EVENT-02 | Phase 4 | Pending |
| EVENT-03 | Phase 4 | Pending |
| EVENT-04 | Phase 4 | Pending |
| EVENT-05 | Phase 4 | Pending |
| EVENT-06 | Phase 4 | Pending |
| EVENT-07 | Phase 4 | Pending |
| EVENT-08 | Phase 4 | Pending |
| CONT-01 | Phase 5 | Pending |
| CONT-02 | Phase 5 | Pending |
| CONT-03 | Phase 5 | Pending |
| CONT-04 | Phase 5 | Pending |
| CONT-05 | Phase 5 | Pending |
| VOTE-01 | Phase 5 | Pending |
| VOTE-02 | Phase 5 | Pending |
| VOTE-03 | Phase 5 | Pending |
| VOTE-04 | Phase 5 | Pending |
| VOTE-05 | Phase 5 | Pending |
| VOTE-06 | Phase 5 | Pending |
| VOTE-07 | Phase 5 | Pending |
| REWD-01 | Phase 6 | Pending |
| REWD-02 | Phase 6 | Pending |
| REWD-03 | Phase 6 | Pending |
| REWD-04 | Phase 6 | Pending |
| REWD-05 | Phase 6 | Pending |
| REWD-06 | Phase 6 | Pending |
| REWD-07 | Phase 6 | Pending |
| BRAND-01 | Phase 7 | Pending |
| BRAND-02 | Phase 7 | Pending |
| BRAND-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after initial definition*
