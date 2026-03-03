# Feature Research

**Domain:** Web3 Creator Competition Platform (brand campaigns + creator submissions + community voting + USDC rewards)
**Researched:** 2026-03-03
**Confidence:** MEDIUM — primary sources are the existing codebase (HIGH confidence on what exists), competitor analysis draws on training data through August 2025 with LOW-MEDIUM confidence on specific platform UX details (WebSearch/WebFetch unavailable during research session).

---

## Context: What Already Exists

The platform has substantial infrastructure already built. This research maps what is missing, not what to build from scratch.

**Already built (do not re-research):**
- Privy auth + embedded wallet creation
- Role selection (USER / BRAND_OWNER)
- Brand application → admin approval → claim token flow
- Socket.io real-time notifications
- Leaderboard page (users/brands/events/content tabs)
- Event listing with status tracking
- Event creation wizard UI (4 steps: Details → Schedule → Requirements → Rewards)
- Event detail page (vote and post mode, mock data still used)
- Submission create/read/update/delete (API + service layer complete)
- Voting (API + service layer complete — `voteForSubmission`, `voteForProposals`)
- Rewards pool system (EventRewardsPool model, RewardClaim model, two claim types: voter + creator)
- User profile, followers/following, XP/level system, login streak
- Brand dashboard, analytics, financials page (mock data)
- Brand wallet page (shows real USDC balance via Privy)
- Explore page with category filters, search, featured brands

**What the roadmap must build:**
- Blockchain layer: smart contract deployment + Pimlico paymaster setup
- Gasless event creation (approve USDC + createEvent as single bundled UserOp)
- Gasless reward claiming (animated UX, no signing prompts)
- Real event detail page (replace mock data with live API calls)
- Submission flow UI (user-facing: upload media, write caption, submit)
- Voting UI (user-facing: swipe/tap to vote, optimistic update, instant feedback)
- Reward claiming UI (earnings summary → balance count-up → confetti)
- Brand financials (real USDC balance, pool calculator, refund view)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Event detail page with live data | Every listing platform shows real content behind a card | MEDIUM | Currently uses mock data; API/service layer complete; needs real data wiring |
| Browse submissions in real time | Platforms like Gleam/Galxe show all entries live during the event | MEDIUM | `getEventSubmissions()` exists; UI needs to call it and paginate |
| One-click voting with instant feedback | Users on Layer3, Galxe expect tap-to-vote with no confirmation dialog | LOW-MEDIUM | Vote API exists; UI needs optimistic update + rollback pattern |
| Submit content (image + caption) | The whole creator-side value prop — without this, creators have nothing to do | MEDIUM | API exists; needs file upload to IPFS + form UI |
| See your own submission status | Creators expect to track rank, vote count, status in real time | LOW | API exists (`/submissions/me`); UI needs to surface it |
| Reward amounts visible before entering | Gleam, Galxe, Layer3 all show "$X pool, earn up to $Y" prominently | LOW | Already in event card / detail UI (baseReward, leaderboardPool) |
| Countdown timer on events | Every competition platform shows time remaining prominently | LOW | `endTime` exists; just a UI component |
| Reward claim flow after event ends | If there's no claim UX, users assume they lost or were cheated | HIGH | Rewards API complete; UI + blockchain gasless claim needed |
| Know if you've already voted | Prevent confusion, show voted state clearly | LOW | `hasVoted` and `checkIfUserHasVoted` API exist; UI state needed |
| Know if you've already submitted | One submission per event; must show current submission, not the form again | LOW | `hasSubmitted` exists; UI gating needed |
| Brand dashboard with real event data | Brands need to see live metrics after launching a campaign | MEDIUM | `getBrandEvents()` works; analytics wiring incomplete |
| Event status lifecycle clarity | Users need to understand: what phase is the event in, what can I do now | LOW | Status states defined (draft/scheduled/posting/voting/completed); UI labels exist |
| Error states and loading states | Blank screens or silent failures feel broken | LOW | Needs systematic implementation across all data-fetching pages |

### Differentiators (Competitive Advantage)

Features that set Aris apart. Not expected by default, but create premium feel and viral potential.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Gasless everything (no wallet prompts) | Web3 platforms universally show "Sign transaction" dialogs; Aris hides this entirely | HIGH | Core differentiator per PROJECT.md; requires Pimlico paymaster + ERC-4337 bundled UserOps |
| Single-click event creation (approve + lock USDC atomic) | Brands elsewhere do multi-step (approve, confirm, wait); Aris bundles it | HIGH | Single UserOp combining USDC approve + createEvent; defined in PROJECT.md |
| Animated reward claim UX (count-up + confetti) | Most platforms show "Claimed: $0.05 USDC" with no emotion | MEDIUM | Framer Motion already in stack; earnings summary → count-up → confetti sequence |
| Step indicator during on-chain operations | Users get anxious waiting for blockchain; visual progress helps | LOW | "Preparing → Approving USDC → Locking pool → Activated" modal pattern |
| AI-assisted content creation | Platforms like Layer3 have no content creation help; Aris has AICreateModal | LOW-MEDIUM | AICreateModal.tsx exists, wired to `refineAiPrompt()`; needs polishing |
| XP + level system with milestones | Gamification beyond just money; creates habit loop | MEDIUM | Full XP system exists (XpTransaction, MilestoneCategory, XpMilestoneClaimed); needs UI surfacing |
| Leaderboard split: voters + creators | Most platforms only reward creators; Aris rewards top voters too | LOW | Two claim types already: CREATOR + BASE_VOTER/TOP_VOTER; leaderboard tabs exist |
| Trust score system | Prevents sybil attacks and low-effort spam; visible quality signal | HIGH | `trustScore` field exists on User model; calculation logic not yet implemented |
| Brand level system with USDC discounts | Brands level up as they spend more; get fee discounts → creates loyalty | MEDIUM | `BrandLevelSnapshot`, `discountPercent` exist; UI not wired |
| Social graph (follow brands + users) | Creates sticky engagement beyond individual campaigns | LOW | `UserFollowers` model exists; follow/unfollow API + UI exist |
| Event proposal voting (vote_only type) | Brands can put design proposals to community vote — not just content | MEDIUM | `Proposal` model and `voteForProposals` exist; proposal display UI needed |
| Refundable pool for undersubscribed events | Brands don't lose money if event underperforms — builds trust | MEDIUM | `getBrandRefunds` API exists; UI not built |

### Anti-Features (Things to Deliberately NOT Build)

Features that seem appealing but violate the platform's core UX philosophy or create unnecessary complexity.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Visible wallet addresses in primary UI | Kills the "fintech not dApp" aesthetic; intimidates non-crypto users | Show only in expandable "Details" accordion or user-initiated wallet page |
| Raw transaction hashes in success screens | Meaningless to 95% of users; creates anxiety if they try to decode it | Show "Rewards added to your wallet" + optional "View on explorer" link collapsed |
| Gas fee estimates / "You will pay X gas" prompts | Breaks the gasless illusion entirely | Never show gas — paymaster covers it; if gas fails, show generic "transaction failed" error |
| Manual USDC token import instructions | Sends users into MetaMask — incompatible with embedded wallet strategy | USDC balance visible in-app wallet page automatically; no token import steps |
| Multi-chain support (this milestone) | Adds testing surface area, Pimlico policy complexity, user confusion | Polygon Amoy only; add chains post-launch based on demand |
| External wallet support (MetaMask/Coinbase) | Breaks embedded wallet assumption; signing flow would need full redesign | Embedded wallets only via Privy; document this as a feature (no keys to manage) |
| Platform ERC-20 token / points-to-token economy | Tokenomics adds regulatory risk, speculation, and complexity | USDC only — real money, simple messaging |
| Blockchain jargon in copy (ERC-4337, UserOp, Paymaster, EOA) | Users don't know what these mean; creates distrust | Use plain language: "your wallet", "instant payment", "secure transfer" |
| Submission voting on mobile via horizontal scroll cards | Common pattern that creates accidental votes | Use explicit tap-to-vote with confirmation indicator (filled heart / filled circle); no swipe |
| Live WebSocket vote count updates per submission | Creates anxiety and gaming behavior (vote for lowest-count to be "safe") | Refresh vote counts at reasonable intervals (30s) or only after user votes |
| Multi-file media uploads per submission | Complex IPFS pinning, display, and storage; Gleam limits to single entry | One image + caption per submission; video support deferred to v2 |
| Fiat onramp integration | Bank transfer / card-to-USDC pipeline is a separate product; regulatory overhead | Brand pre-funds embedded wallet directly with USDC; document this as the onboarding step |
| Real-time vote leaderboard refresh during voting phase | Gaming incentive: creators would encourage friends to vote at specific times | Show live ranking, but rate-limit updates to every 5 minutes minimum |

---

## Feature Dependencies

```
[Smart Contract Deployment + Paymaster Config]
    └──required by──> [Gasless Event Creation]
                          └──required by──> [Gasless Reward Claiming]
                          └──required by──> [Brand USDC Pool Locking]

[IPFS Media Upload]
    └──required by──> [Creator Submission Flow]
                          └──required by──> [Voting UI]
                                                └──required by──> [Vote-Based Reward Distribution]

[Event Detail Page (real data)]
    └──required by──> [Submission Flow] (need event context)
    └──required by──> [Voting UI] (need submissions list)
    └──required by──> [Reward Display] (need pool amounts)

[Event Completed Status]
    └──required by──> [Reward Claim UI]
                          └──required by──> [Gasless Claim Transaction]

[Brand Auth + JWT hardened]
    └──required by──> [Event Creation] (must know brand wallet address)
    └──required by──> [Brand Dashboard real data]

[Rewards Pool Finalization (server-side)]
    └──required by──> [Claim generation for users]
    └──required by──> [Brand refund calculation]
```

### Dependency Notes

- **Smart contracts must be deployed before event creation UI is wired**: PROJECT.md explicitly states "Do NOT build event creation UI before contracts deployed + paymaster configured." The current UI stub (create-event/page.tsx) encodes the contract call but cannot execute without deployed contract addresses.
- **IPFS upload required before submission flow**: Submissions use `imageCid`; without IPFS pinning (Pinata), creators cannot upload media.
- **Event detail real-data wiring unlocks everything downstream**: The event detail page is currently mock-only. It is the entry point for both submission and voting user journeys.
- **Reward claiming requires event completion + server-side finalization**: The RewardsService must finalize the pool (calculate who gets what) before users can claim. This is a server-side cron job or trigger, not just a UI feature.
- **Auth hardening is a prerequisite gate**: PROJECT.md lists auth hardening as the first "Active" requirement and explicitly gates all contract work behind it.

---

## MVP Definition

### Launch With (v1 — this milestone)

Minimum feature set that makes the platform actually functional end-to-end for one campaign cycle.

- [ ] **Auth hardened** — privyId stored, JWT verified, no duplicate users; needed before anything on-chain
- [ ] **Blockchain abstraction layer** (`lib/blockchain/`) — client.ts, contracts.ts, gasless.ts — foundational for all on-chain features
- [ ] **Smart contracts deployed to Polygon Amoy** — EventFactory + RewardsVaultV3; no on-chain features work without this
- [ ] **Pimlico paymaster configured** — policy set up; without this, brands pay gas and the UX breaks
- [ ] **Gasless event creation** — approve USDC + createEvent as single UserOp; core brand value prop
- [ ] **Event creation step indicator modal** — "Preparing → Approving → Locking → Activated"; essential for user trust during async blockchain ops
- [ ] **Event detail page with real data** — replaces mock data; gateway to all participant interactions
- [ ] **Creator submission flow** — IPFS upload + caption + submit; without this, no content in events
- [ ] **One-click voting** — optimistic update, instant feedback, rollback on failure
- [ ] **Reward claim flow** — animated UX, gasless, shows earnings after event ends
- [ ] **Brand wallet pre-funding UX** — tell brands how to get USDC into their embedded wallet; no onramp, just clear instructions

### Add After Validation (v1.x)

Features to add once the core campaign loop works.

- [ ] **Trust score calculation** — spam prevention becomes urgent once real money flows; implement EMA-based scoring
- [ ] **Event analytics for brands** — real submission counts, vote counts, unique participant metrics from EventAnalytics table
- [ ] **Brand refund view** — surface `getBrandRefunds` API in financials page; brands need to reclaim unused pool funds
- [ ] **Proposal voting UI** — vote_only events with image/text proposals; second event type, low additional complexity
- [ ] **Video submission support** — creators want video; adds Pinata video CID handling; significant storage cost consideration
- [ ] **Submission editing (pre-deadline)** — `updateSubmission` API exists; UI gating needed

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Referral system UI** — `Referral` model and `referralCode` exist; create invite link flow and landing page
- [ ] **Brand level / discount UI** — `BrandLevelSnapshot` exists; surface level progress and discount in brand settings
- [ ] **Multi-media submission (multiple images)** — requires significant IPFS + UI work; single image is enough for v1
- [ ] **Mobile app** — explicitly out of scope per PROJECT.md
- [ ] **External wallet support** — MetaMask/Coinbase; fundamentally changes auth flow
- [ ] **Additional chains** — Polygon mainnet, Base, etc.; needs multi-chain paymaster policies

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth hardening | HIGH | LOW | P1 |
| Blockchain abstraction layer | HIGH (enables everything) | MEDIUM | P1 |
| Smart contracts deployed | HIGH | HIGH | P1 |
| Pimlico paymaster config | HIGH | MEDIUM | P1 |
| Gasless event creation | HIGH | HIGH | P1 |
| Event creation step indicator | HIGH | LOW | P1 |
| Event detail page (real data) | HIGH | MEDIUM | P1 |
| Creator submission flow | HIGH | MEDIUM | P1 |
| Voting UI (optimistic) | HIGH | LOW-MEDIUM | P1 |
| Reward claim flow (animated) | HIGH | MEDIUM | P1 |
| Brand wallet pre-funding UX | HIGH | LOW | P1 |
| Brand dashboard real analytics | MEDIUM | MEDIUM | P2 |
| Trust score calculation | HIGH | HIGH | P2 |
| Brand refund view | MEDIUM | LOW | P2 |
| Proposal voting UI (vote_only) | MEDIUM | MEDIUM | P2 |
| AI submission assist polish | MEDIUM | LOW | P2 |
| Video submission support | MEDIUM | HIGH | P3 |
| Referral system UI | LOW-MEDIUM | MEDIUM | P3 |
| Brand level / discount UI | LOW-MEDIUM | LOW | P3 |
| Multi-chain support | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone — platform is not functional without it
- P2: Should have — add once P1 items are working
- P3: Nice to have — future consideration

---

## Competitor Feature Analysis

Note: Confidence level on competitor specifics is MEDIUM-LOW (training data, no live fetch available). Use for directional guidance only.

| Feature | Galxe | Layer3 | Gleam | Aris Approach |
|---------|-------|--------|-------|---------------|
| Reward distribution | On-chain, NFT / point drops; user must claim manually, wallet popup appears | Points + token drops; gasless for some campaigns via their abstraction | Off-chain, random winner selection, email notification | Gasless USDC, no popups, instant after event ends |
| Content submission | No content creation; task completion (follow X, retweet, etc.) | Similar — off-chain tasks, not creative content | Photo/video entry via URL or upload | Original media upload (image + caption), IPFS-stored |
| Voting | Community voting rare; usually brand-determined | Voting mechanics not a core feature | Viral share mechanic (shares = entries) | Community votes determine creator rankings and voter rewards |
| Voter rewards | None — voters get nothing | None for basic quests | None | Voters earn USDC too (base reward per vote + top voter bonus) |
| Brand UX | Complex campaign setup, requires wallet knowledge | Somewhat simpler; still requires wallet | Web2 friendly, credit card payments, no blockchain | One-click campaign creation, USDC from embedded wallet |
| Gas experience | User pays gas on most chains; some gasless for specific chains | Some gasless via their own abstraction | No blockchain | Fully gasless — paymaster covers all gas |
| Reward claiming UX | Click "Claim" → wallet popup → confirm → wait → toast | Automatic airdrop or manual claim button | Email notification + manual redemption | Animated sequence: earnings summary → count-up → confetti, no signing |
| Creator visibility | Minimal (wallet address as identity) | Username + profile | Full name + social | Username, avatar, XP level, submission rank |
| Leaderboard | Token holders / campaign points | Quest completion count | Not applicable | Users by XP; brands by USDC given; event-level submission rank |

**Key gap Aris fills:** No competitor rewards both creators AND voters with real USDC in a single gasless UX. Galxe/Layer3 are task completion engines; Gleam is Web2 giveaway tooling. Aris is the only product targeting creative content quality + community curation with on-chain USDC rewards and zero blockchain friction.

---

## UX Patterns for Premium Feel

Based on patterns observed at Stripe, Linear, Vercel (Web2 fintech references) and Galxe/Layer3 (Web3 references) — confidence MEDIUM.

### Gasless Interaction Pattern
**Do:** Show a modal progress indicator with named steps. Never say "transaction." Say "activating your campaign."
```
[Step 1: Preparing]  ●○○○  Checking your wallet balance...
[Step 2: Approving]  ●●○○  Securing reward pool...
[Step 3: Locking]    ●●●○  Publishing campaign...
[Step 4: Activated]  ●●●●  Your campaign is live!
```
Each step: spinner → checkmark, smooth transition.

### Optimistic Vote Pattern
**Do:** Increment vote count immediately on tap. Fill the vote icon. If API fails, revert count + show subtle error toast.
**Don't:** Disable the button, show a loading spinner, or wait for server confirmation before showing feedback.

### Reward Claim Celebration Pattern
**Do:** Three-stage sequence:
1. Summary card: "You earned $0.37 from this campaign" (earnings breakdown: base votes + top voter bonus)
2. Count-up animation: balance ticks up from previous balance to new balance
3. Confetti burst + "Rewards added to your wallet"
**Don't:** Show a transaction hash, blockchain confirmation count, or "pending" state.

### Error State Pattern
**Do:** Specific, actionable errors. "Your wallet doesn't have enough USDC — you need $500 to lock this pool." Not "Transaction failed."
**Don't:** Show raw error messages from smart contracts or node providers. Map all on-chain errors to human-readable strings.

### Empty State Pattern (Events, Submissions)
**Do:** Purposeful empty states with a clear CTA. For events with no submissions yet: "Be the first to submit — earn double XP for early entries."
**Don't:** Blank white space or generic "No data found."

---

## Sources

- **Codebase analysis** (HIGH confidence): `/home/manov/Desktop/code/aris-design/server/prisma/schema.prisma`, `/server/src/routes/`, `/server/src/controllers/`, `/client/app/`, `/client/services/`, `/client/components/events/` — all read directly
- **PROJECT.md** (HIGH confidence): `/home/manov/Desktop/code/aris-design/.planning/PROJECT.md` — authoritative project requirements
- **Galxe UX patterns** (MEDIUM confidence): training data through August 2025; live product at galxe.com
- **Layer3 UX patterns** (MEDIUM confidence): training data through August 2025; live product at layer3.xyz
- **Gleam competition features** (MEDIUM confidence): training data through August 2025; live product at gleam.io
- **ERC-4337 gasless UX patterns** (MEDIUM confidence): training data; recommend verifying against Pimlico docs and permissionless.js docs before implementation

---
*Feature research for: Aris — Web3 Creator Competition Platform*
*Researched: 2026-03-03*
