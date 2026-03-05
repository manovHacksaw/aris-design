# Project Research Summary

**Project:** Aris — Web3 Creator Competition Platform
**Domain:** ERC-4337 gasless Web3 platform with off-chain voting and on-chain USDC reward settlement
**Researched:** 2026-03-03
**Confidence:** HIGH (primary sources: installed node_modules, live codebase, and archived failure scripts)

## Executive Summary

Aris is a brownfield project with substantial infrastructure already in place: auth, brand registration, real-time notifications, event listing, submission and voting service layers, rewards service, and leaderboard pages are all built. The remaining work is the blockchain integration layer — the piece that transforms this from a mock-data application into a live product where brands lock real USDC into reward pools and creators and voters earn gasless payments. The platform's core UX differentiator is that every on-chain interaction is invisible to the user: no wallet popups, no gas fees, no blockchain jargon. This requires ERC-4337 smart accounts via Privy, sponsored by Pimlico's verifying paymaster, all pre-configured and verified before a single line of contract interaction code is written.

The recommended approach is a strict layered build sequence: harden auth first (the smart account address, not the EOA, must be stored), then build the `lib/blockchain/` abstraction layer (client.ts, contracts.ts, gasless.ts), then verify the Pimlico paymaster is live on Polygon Amoy before touching any event creation UI, and only then wire up event creation, submission and voting frontend, and the animated reward claim flow. Every phase has hard gates: the architecture research explicitly forbids building event creation UI before paymaster is confirmed working, and the pitfalls research shows that attempting the on-chain layer without these gates already failed once in this project's history (see `migrateToWeb2.ts` and archived test scripts).

The most critical risks are: storing the EOA wallet address instead of the smart account address in the DB (silently breaks all reward claims), submitting USDC approval and event creation as two separate transactions instead of a single atomic UserOp (creates irrecoverable partial state), and assuming the Pimlico API key alone is sufficient for gasless ops without configuring a sponsorship policy (all UserOps will fail). These are not theoretical — the codebase's own diagnostic scripts (`diagnoseRewards.ts`, `checkSignerConfig.ts`) were written precisely because these failures occurred in a prior implementation.

---

## Key Findings

### Recommended Stack

The full blockchain stack is already installed: `permissionless@0.3.4`, `viem@2.46.3`, and `@privy-io/react-auth@3.14.1` are locked in `bun.lock`. No new packages are needed. The RewardsVaultV3 contract is already deployed on Polygon Amoy at `0x34C5A617e32c84BC9A54c862723FA5538f42F221` with the USDC test token at `0x61d11C622Bd98A71aD9361833379A2066Ad29CCa`. The only missing piece is configuration: the Privy Dashboard must have Smart Wallets enabled for Polygon Amoy with explicit Pimlico bundler and paymaster URLs, and the Pimlico Dashboard must have a sponsorship policy scoped to the vault contract address.

**Core technologies:**
- `@privy-io/react-auth@3.14.1`: Embedded wallet creation + `SmartWalletsProvider` — the gateway for all user-facing on-chain operations; must be configured with explicit `bundlerUrl` and `paymasterUrl` pointing to Pimlico, not left to Privy's default bundler
- `permissionless@0.3.4`: ERC-4337 smart account client + Pimlico actions — provides `createPimlicoClient`, `sponsorUserOperation`, and batch UserOp support; default EntryPoint is v0.7 (confirmed from source)
- `viem@2.46.3`: Low-level Ethereum encoding, `publicClient`, `encodeFunctionData` — used client-side for all ABI encoding and read calls; server-side alongside ethers (keep ethers for existing server functions)
- EntryPoint v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`): The version used by all current Privy Smart Wallet types (Safe v1.4.1); do not use v0.6 (deprecated on Pimlico) or v0.8 (not yet in Pimlico production)
- Pimlico Bundler + Paymaster (`https://api.pimlico.io/v2/80002/rpc?apikey=...`): Single endpoint serves both bundler and paymaster RPCs for Polygon Amoy (chainId 80002)

### Expected Features

The platform already has all the service and API layers built. What remains is the UI connection and the blockchain integration.

**Must have (table stakes — platform is non-functional without these):**
- Auth hardening (privyId stored, JWT verified, smart account address — not EOA — stored in DB)
- Blockchain abstraction layer (`lib/blockchain/client.ts`, `contracts.ts`, `gasless.ts`)
- Pimlico paymaster configured and verified with test UserOp
- Gasless event creation (atomic `approve + createEvent` as single UserOp with step indicator modal)
- Event detail page wired to live API data (currently mock-only; this is the entry point for all participant flows)
- Creator submission flow (IPFS image upload + caption + submit)
- One-click voting with optimistic UI update and rollback on failure
- Animated reward claim flow (earnings summary → count-up → confetti, no blockchain jargon)
- Brand wallet pre-funding instructions (no fiat onramp; clear guidance to fund embedded wallet with USDC)

**Should have (competitive differentiators — add post-core-loop validation):**
- Trust score calculation (spam prevention; `trustScore` field exists, logic not implemented)
- Real brand analytics wired to event data (`EventAnalytics` table exists, dashboard not wired)
- Brand refund view (`getBrandRefunds` API exists; financials page UI not built)
- Proposal voting UI for `vote_only` event type (Proposal model and `voteForProposals` exist)
- AI submission assist polish (AICreateModal exists; `refineAiPrompt()` is wired but unpolished)

**Defer (v2+):**
- Referral system UI (model exists, not a launch blocker)
- Brand level / discount UI (BrandLevelSnapshot exists, not a launch blocker)
- Multi-chain support (adds paymaster policy complexity; Polygon Amoy only for v1)
- External wallet support (MetaMask/Coinbase would require a full auth flow redesign)
- Video submission support (significant IPFS and storage cost implications)
- Mobile app (explicitly out of scope per PROJECT.md)

**Anti-features to deliberately avoid:**
- Visible wallet addresses or transaction hashes as primary UI feedback
- Gas fee estimates or "You will pay X gas" prompts (breaks gasless illusion)
- Blockchain jargon in any user-facing copy
- Multi-file media uploads per submission (defer to v2)
- Live WebSocket vote count updates per submission (gaming behavior incentive)

### Architecture Approach

The platform uses a hybrid off-chain/on-chain architecture: all votes are recorded in Postgres for speed, and reward settlement happens on-chain after event completion via a backend signer (`creditRewardsBatch`). Users then claim with a single gasless `claimRewards()` call. The database is the primary read surface for all display operations; on-chain reads are reserved for financial data that must be authoritative (`getUserClaimableBalance` before showing claim UI, `getEventPool` for status verification). A new `lib/blockchain/` abstraction layer on the client side must enforce that no component ever imports viem or ABI JSON directly — all blockchain logic flows through this layer.

**Major components:**
1. `lib/blockchain/` (client-side, does not yet exist): `client.ts` (publicClient + chain definition), `contracts.ts` (addresses, ABI imports, read helpers), `gasless.ts` (Pimlico paymaster, batch UserOp submission, nonce management, RPC fallback)
2. RewardsVaultV3 (already deployed): `createEvent()`, `creditRewardsBatch()` (backend signer only), `claimRewards()` (user gasless), `cancelEvent()` (backend signer)
3. Pimlico Paymaster (configuration only, no new code): wired into `PrivyProvider` via `SmartWalletsProvider` with explicit bundler and paymaster URLs for Polygon Amoy
4. `RewardsService` (backend, already substantial): calculates reward distribution from DB vote records, calls `creditRewardsBatch` via backend signer, tracks claim lifecycle (PENDING → CREDITED → CLAIMED)
5. Off-chain vote recording (`VoteService`): votes hit the Postgres DB instantly via `POST /api/events/:id/votes`, with XP awarded asynchronously; no blockchain involvement in the voting path

### Critical Pitfalls

The following pitfalls are verified from the project's own history (archived scripts and diagnostic tooling), not theoretical:

1. **EOA stored as `user.walletAddress` instead of smart account address** — `diagnoseRewards.ts` documents this exact failure as `ZERO_ONCHAIN` status. Prevention: `lib/blockchain/` must expose only `smartWalletClient.account.address` and must never surface `linkedAccounts` EOA address; both `eoaAddress` and `smartAccountAddress` should be separate DB columns from day one.

2. **Pimlico paymaster policy not configured before writing UserOp code** — All `sendUserOperation` calls fail with `AA31 paymaster deposit too low` or `policy not found`, which is indistinguishable from a gas estimation failure. Prevention: create and test the Pimlico policy via curl before writing a single line of event creation code.

3. **Non-atomic `approve + createEvent` (two separate UserOps instead of one)** — If approval lands but event creation fails, USDC allowance dangles with no corresponding pool. `migrateToWeb2.ts` and archived scripts show this happened in a prior implementation. Prevention: always use `smartWalletClient.sendTransaction({ calls: [approveCall, createEventCall] })` from day one; never prototype with two-step flow.

4. **EIP-712 domain separator mismatch** — `checkSignerConfig.ts` exists because this failure occurred. If the backend and contract use different domain parameters (wrong chainId, wrong verifyingContract address), all claim signatures fail on-chain silently. Prevention: run `checkSignerConfig` equivalent after every contract redeployment; store domain parameters in a single shared config file.

5. **USDC decimal confusion (6 vs 18)** — `parseEther` instead of `parseUnits(amount, 6)` causes either over-approval or catastrophic under-funding. Prevention: define `USDC_DECIMALS = 6` as a single constant in `lib/blockchain/contracts.ts`; add a CI unit test that `parseUsdc(10) === BigInt(10_000_000)`.

6. **Smart account not deployed (missing initCode) for first-time users** — Error `AA20 account not deployed` only manifests for new users, creating "works for me" debugging. Prevention: `gasless.ts` must call `publicClient.getBytecode({ address: smartAccountAddress })` before any UserOp and handle the initCode case; must test with a genuinely fresh Privy account.

7. **`SmartWalletsProvider` using Privy's default bundler instead of Pimlico** — `useSmartWallets().client` is non-null but operations are NOT gasless; all UserOps fail with `AA21 didn't pay prefund`. Prevention: always pass explicit `bundlerUrl` and `paymasterUrl` to `SmartWalletsProvider`; verify by checking UserOps appear in the Pimlico dashboard explorer.

---

## Implications for Roadmap

Based on research, here is the required phase structure with hard gates between phases:

### Phase 1: Auth Hardening
**Rationale:** Every downstream layer (smart account lookup, JWT verification, reward distribution, event creation) depends on the user identity model being correct. A broken auth silently corrupts all blockchain work. PROJECT.md explicitly lists this as the first "Active" requirement and gates all contract work behind it.
**Delivers:** privyId stored in DB, JWT verified on all protected routes, smart account address (not EOA) synced to `user.walletAddress`, no duplicate users on re-login.
**Addresses:** Table stakes — brand auth needed before event creation; `walletAddress` accuracy needed before reward distribution.
**Avoids:** Pitfall 1 (EOA stored instead of smart account address) — the most severe, recovery-intensive failure mode. Store `eoaAddress` and `smartAccountAddress` as separate DB columns here.

### Phase 2: Blockchain Abstraction Layer
**Rationale:** All client-side blockchain calls must go through `lib/blockchain/` before any UI is built on top. Building the abstraction layer first enforces the architectural boundary and prevents the anti-pattern of direct viem calls scattered in components. The shell can be built and tested before Pimlico is live.
**Delivers:** `client.ts` (publicClient, chain definition, RPC fallback), `contracts.ts` (USDC and vault addresses, read helpers with correct 6-decimal handling), `gasless.ts` (stubs initially, with nonce management and undeployed account detection), `abi/` directory with RewardsVaultV3.json and ERC20.json.
**Uses:** `viem@2.46.3` for publicClient and encodeFunctionData; `permissionless@0.3.4` for smart account client; EntryPoint v0.7 address.
**Avoids:** Pitfall 5 (USDC decimals) via `USDC_DECIMALS = 6` constant + CI unit test; Pitfall 6 (initCode) via `getBytecode` pre-check in gasless.ts; Pitfall 3 (nonce collisions) via nonce mutex in gasless.ts; Pitfall 8 (Amoy RPC instability) via fallback RPC in client.ts.

### Phase 3: Pimlico Paymaster Configuration
**Rationale:** This is a configuration phase, not a code phase — but it is a hard gate. `gasless.ts` cannot be tested or integrated until sponsorship is verified. The architecture research states explicitly: "Do NOT build gasless event creation UI before Pimlico is confirmed working." A test UserOp must succeed via curl before any event creation code is written.
**Delivers:** Privy Dashboard configured (Smart Wallets enabled for `eip155:80002`, bundler URL, paymaster URL, Safe smart wallet type); Pimlico Dashboard configured (sponsorship policy for Amoy chainId 80002, `REWARDS_VAULT_ADDRESS` and `USDC_ADDRESS` whitelisted, per-address daily spend cap); `SmartWalletsProvider` in `ClientProviders.tsx` wired with explicit Pimlico URLs; test UserOp confirmed appearing in Pimlico explorer.
**Avoids:** Pitfall 2 (paymaster policy not configured) and Pitfall 7 (wrong bundler used) — both lead to identically cryptic `AA3x` errors; must be eliminated before code is written.

### Phase 4: Event Creation Flow (Brand)
**Rationale:** Requires Phase 2 (gasless.ts batch calls implemented) and Phase 3 (paymaster live and verified). The smart contract is already deployed; the event creation UI stub in `create-event/page.tsx` encodes the contract call but cannot execute. This phase wires it up with the step indicator modal, atomic UserOp submission, and on-chain confirmation before DB write.
**Delivers:** Gasless event creation with single atomic `approve + createEvent` UserOp; step indicator modal ("Preparing → Approving USDC → Locking pool → Activated"); `onChainEventId` written to DB only after `waitForUserOperationReceipt` confirms; event stays in `draft` until on-chain confirmation.
**Implements:** Atomic Batch UserOperation pattern (Architecture Pattern 2); DB-First with On-Chain Sync (Architecture Pattern 4).
**Avoids:** Pitfall 4 (non-atomic two-step UserOps); anti-feature of two-step signing UX.

### Phase 5: Event Detail Page + Creator Submission + Voting UI
**Rationale:** The event detail page is the gateway to all participant interactions — it is currently mock-only. Wiring it to live API data unlocks the submission form and voting interface, which both depend on event context (event status, submission list, pool amounts). These three components form a natural grouping because they share the same event context and must be tested together as a user journey.
**Delivers:** Event detail page with live data (status, pool amounts, submission list, countdown timer); IPFS image + caption submission form with `hasSubmitted` gate; one-click voting with optimistic update and rollback; voted/submitted state persistence.
**Addresses:** All "table stakes" features requiring user interaction within an event.
**Avoids:** Live WebSocket vote count updates (anti-feature) — rate-limit to 30s or refresh only after user votes.

### Phase 6: Reward Claim Flow
**Rationale:** Requires Phase 4 (events must exist on-chain with pools) and the backend `processEventRewards()` trigger (already exists in `rewardsService.ts`). The animated claim UX is the platform's most visible differentiator — it must be built after at least one event has been created and completed on-chain so it can be tested end-to-end.
**Delivers:** Animated claim flow (earnings summary card → balance count-up animation → confetti); gasless `claimRewards()` UserOp via `claimRewardsGasless()`; `POST /api/rewards/confirm-all` after confirmation to sync DB from CREDITED to CLAIMED; WalletContext balance refresh after claim.
**Implements:** Off-Chain Voting with On-Chain Settlement pattern (Architecture Pattern 1); Claim lifecycle state machine (PENDING → CREDITED → CLAIMED).
**Avoids:** Pitfall 10 (vote integrity during settlement) — event completion must atomically set `votingLockedAt` + `allowVoting = false` in same DB transaction.

### Phase 7: Brand Dashboard + Analytics + Refund View (v1.x)
**Rationale:** Brands need operational visibility after launching campaigns. This phase wires the already-existing analytics tables and refund API to the brand dashboard. It is deliberately after the core user journey (Phases 1-6) so real event data exists to display.
**Delivers:** Live brand analytics (submission counts, vote counts, unique participants from `EventAnalytics`); brand refund view (`getBrandRefundBalance` on-chain read surfaced in financials page); brand wallet pre-funding instructions.
**Addresses:** "Should have" features for brand retention.

### Phase Ordering Rationale

- Phases 1-3 are strictly sequential gates: auth correctness is the foundation, the blockchain abstraction layer provides the testable API surface, and paymaster configuration must be verified before any UserOp code runs.
- Phases 4-6 follow blockchain dependency order: event creation must exist before claim flows can be tested; event detail wiring (Phase 5) can begin in parallel with Phase 4 UI scaffolding since it only requires API calls, not the paymaster.
- Phase 7 is deliberately deferred: it needs real event data to display and real brand users to surface value. It is a "nice to have" for launch but does not block the core campaign loop.
- The architecture's "strict gates" from ARCHITECTURE.md are enforced as phase boundaries: do not build event creation UI before paymaster verified (Phase 3 → Phase 4 gate); do not build reward claim UI before at least one on-chain event exists (Phase 4 → Phase 6 gate); do not move to reward distribution before `creditRewardsBatch` is verified with deployed contract (Phase 6 requires Phase 4 completion).

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Pimlico Configuration):** The exact syntax for passing `bundlerUrl` and `paymasterUrl` to `SmartWalletsProvider` in Privy v3.14.1 should be verified against the live Privy changelog — the type definition shows `SmartWalletNetworkConfig` with these fields but the prop surface of `SmartWalletsProvider` may have changed. Also verify Pimlico policy creation steps against `docs.pimlico.io` before the phase begins.
- **Phase 5 (IPFS Submission):** `lib/pinata-upload.ts` exists but its integration with the submission form needs to be validated against the actual Pinata API version in use. Verify that `imageCid` is stored correctly and that the Pinata gateway URL pattern (`https://gateway.pinata.cloud/ipfs/${cid}`) is still the recommended retrieval method.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Auth Hardening):** Standard JWT + Privy pattern; codebase already has the auth middleware and routes; only fixing existing logic.
- **Phase 2 (Blockchain Abstraction Layer):** Architecture research provides exact file structure, function signatures, and export contracts; implementation is direct translation.
- **Phase 4 (Event Creation):** Architecture research provides the exact batch UserOp pattern with code examples; the contract ABI is already available.
- **Phase 6 (Reward Claim):** Backend rewardsService is already substantial; the `claimRewardsGasless()` function signature and the `confirm-all` API pattern are fully specified in architecture research.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified from installed `node_modules` source, `bun.lock`, and `.env` files. EntryPoint addresses confirmed from `viem` source constants. No guessing required. |
| Features | HIGH (what exists) / MEDIUM (competitor analysis) | What is built vs. what is missing is read directly from codebase. Competitor feature comparison (Galxe, Layer3, Gleam) is training data — directionally accurate but specific UX details should not be treated as authoritative. |
| Architecture | HIGH | Based on existing codebase patterns (`rewardsService.ts`, `WalletContext.tsx`, `BlockchainService`) plus established ERC-4337 industry patterns. The specific Privy v3.14.x `SmartWalletsProvider` configuration syntax warrants verification against live Privy docs. |
| Pitfalls | HIGH | Primary source is the project's own failure history: `migrateToWeb2.ts`, `diagnoseRewards.ts`, `checkSignerConfig.ts`, and archived Web3 test scripts. These are verified failures, not hypothetical ones. ERC-4337 error codes (AA20–AA33) are specification-level facts. |

**Overall confidence:** HIGH

### Gaps to Address

- **Privy Dashboard Smart Wallet configuration syntax for v3.14.1:** The `SmartWalletsProvider` type definition shows `bundlerUrl`/`paymasterUrl` inside `SmartWalletNetworkConfig`, but the exact prop name at the provider level (e.g., `defaultChain`, `config`, or `networks`) needs verification against the Privy v3 changelog or docs before Phase 3 begins. Workaround: use `permissionless.js createPimlicoClient` directly if the Privy provider config surface is unclear.
- **`createEvent()` function existence on deployed contract:** ARCHITECTURE.md notes the existing `RewardsVaultV3.json` ABI covers `creditRewardsBatch`, `cancelEvent`, and `getBrandRefundBalance` but flags that a `createEvent` function "needs to be designed — this is missing from the current contract." This is potentially a Phase 4 blocker. Before building the event creation UI, verify the ABI at the deployed vault address on `amoy.polygonscan.com` to confirm `createEvent()` exists and matches the expected signature.
- **Official Circle USDC testnet address vs project test token:** The project uses `0x61d11C622Bd98A71aD9361833379A2066Ad29CCa` (already deployed, already in contracts); this is confirmed correct for the project but may be a custom test token. This is not a gap to resolve — use the existing address since the vault is deployed against it — but document it for the team.

---

## Sources

### Primary (HIGH confidence)
- `client/node_modules/permissionless/`, `viem/`, `@privy-io/react-auth/` — installed source files, exact versions from `bun.lock`
- `server/src/scripts/diagnoseRewards.ts` — EOA/SmartAccount mismatch documented as real failure
- `server/src/scripts/migrateToWeb2.ts` — prior Web3 integration attempt, documents exact failure modes
- `server/src/scripts/archive-web3-tests/checkSignerConfig.ts`, `checkSigner.ts` — domain separator mismatch as observed bug
- `server/src/contracts/RewardsVaultV3.json` — ABI source of truth for the deployed contract
- `server/.env`, `client/.env.local` — deployed contract addresses, Pimlico API key
- `client/bun.lock` — exact resolved versions: `permissionless@0.3.4`, `viem@2.46.3`
- `server/src/services/rewardsService.ts`, `server/src/lib/blockchain.ts` — existing service implementation
- `.planning/PROJECT.md` — authoritative project requirements and phase gates

### Secondary (MEDIUM confidence)
- ERC-4337 error codes (AA20–AA33) — specification-level, implementation-independent
- Pimlico bundler API v2 endpoint patterns — training data; verify against `docs.pimlico.io`
- permissionless.js smart account deployment and initCode behavior — training data; verify against permissionless docs
- Galxe, Layer3, Gleam UX patterns — training data through August 2025; directional only

### Tertiary (LOW confidence)
- Circle's official USDC testnet address on Polygon Amoy — do not use; use the address already in `.env`
- Privy v3.14.x `SmartWalletsProvider` exact prop surface — type definitions inspected but live changelog should be verified before Phase 3 implementation

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
