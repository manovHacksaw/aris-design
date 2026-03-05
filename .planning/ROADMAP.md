  # Roadmap: Aris

  ## Overview

  Aris's remaining work is the blockchain integration layer that transforms a mock-data application into a live product where brands lock real USDC into reward pools and creators earn gasless payments. The build sequence is strictly layered: harden auth first (the smart account address, not the EOA, is the identity), build the client-side blockchain abstraction next, verify Pimlico paymaster is live before writing any on-chain code, then wire event creation, the participant flow (submission + voting), reward claims, and finally brand analytics. Each phase is a hard gate — no phase begins until the previous one is verified working.

  ## Phases

  **Phase Numbering:**
  - Integer phases (1, 2, 3): Planned milestone work
  - Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

  Decimal phases appear between their surrounding integers in numeric order.

  - [ ] **Phase 1: Auth Hardening** - Correct Privy identity model — privyId + smart account address — in DB and all routes
  - [ ] **Phase 2: Blockchain Abstraction Layer** - `lib/blockchain/` client, contracts, and gasless helpers; no component ever imports viem directly
  - [ ] **Phase 3: Pimlico Paymaster Configuration** - Dashboard + SDK wiring verified with a real test UserOp before any event creation code is written
  - [ ] **Phase 4: Gasless Event Creation** - Brand creates a campaign in one click — atomic approve + createEvent UserOp with step indicator modal
  - [ ] **Phase 5: Event Detail, Submission, and Voting** - Creator submits IPFS media; community votes with optimistic UI; all state persists on reload
  - [ ] **Phase 6: Reward Claim Flow** - Creator and voter claim USDC via animated gasless flow; balance updates and confetti on success
  - [ ] **Phase 7: Brand Dashboard and Analytics** - Live event analytics, embedded wallet balance, and refund visibility wired to real data

  ## Phase Details

  ### Phase 1: Auth Hardening
  **Goal**: Users are identified by their Privy ID and smart account address throughout the system — logins are idempotent, JWTs are verified on every protected route, and no legacy nonce/signature code remains
  **Depends on**: Nothing (first phase)
  **Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08
  **Success Criteria** (what must be TRUE):
    1. Re-logging in with the same Privy account does not create a second DB user record — the existing record is updated in place
    2. All protected API routes reject requests with missing or invalid Privy JWTs — unauthenticated callers receive 401
    3. The wallet address stored in `user.walletAddress` (and optionally `user.smartAccountAddress`) is the ERC-4337 smart account address, not the EOA — confirmed by comparing DB value against the smart account address shown in the Privy dashboard
    4. After login, a `BRAND_OWNER` user lands on `/brand/dashboard` and a `USER` lands on `/` with no visible redirect flicker
    5. No wallet addresses, chain IDs, or signing prompts appear anywhere in the login or redirect flow
  **Plans**: TBD

  ### Phase 2: Blockchain Abstraction Layer
  **Goal**: A single `lib/blockchain/` module on the client side is the only place blockchain logic lives — all components use its typed exports; no component or page imports viem or ABI JSON directly
  **Depends on**: Phase 1
  **Requirements**: CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04, CHAIN-05
  **Success Criteria** (what must be TRUE):
    1. `client/lib/blockchain/client.ts`, `contracts.ts`, and `gasless.ts` exist and export typed functions; a codebase grep for `import.*from.*viem` in `app/` and `components/` returns zero results
    2. `contracts.ts` exports `USDC_DECIMALS = 6` and a `parseUsdc(n)` helper; a unit test confirms `parseUsdc(10)` equals `BigInt(10_000_000)`
    3. `gasless.ts` handles the undeployed account case — calling `sendGaslessTransaction` on a fresh account that has never transacted does not throw `AA20 account not deployed`
    4. `SmartWalletsProvider` in `ClientProviders.tsx` passes explicit Pimlico bundler and paymaster URLs for Polygon Amoy — not Privy's default bundler
  **Plans**: TBD

  ### Phase 3: Pimlico Paymaster Configuration
  **Goal**: A Pimlico sponsorship policy is live on Polygon Amoy and verified with a real test UserOp — this must be true before a single line of event creation code is written
  **Depends on**: Phase 2
  **Requirements**: PAY-01, PAY-02, PAY-03
  **Success Criteria** (what must be TRUE):
    1. A sponsorship policy exists in the Pimlico Dashboard scoped to chainId 80002 with `REWARDS_VAULT_ADDRESS` and `USDC_ADDRESS` whitelisted
    2. Privy Dashboard shows Smart Wallets enabled for `eip155:80002` with explicit bundler and paymaster URLs pointing to Pimlico (not Privy's default)x`
    3. A test UserOp — submitted manually or via a throwaway script — appears as sponsored in the Pimlico explorer dashboard, confirming end-to-end sponsorship before event creation code begins
  **Plans**: TBD

  ### Phase 4: Gasless Event Creation
  **Goal**: A brand can launch a campaign in one click — a single atomic UserOp bundles the USDC approval and event creation, confirmed on-chain before the DB record is marked active
  **Depends on**: Phase 2, Phase 3
  **Requirements**: EVENT-01, EVENT-02, EVENT-03, EVENT-04, EVENT-05, EVENT-06, EVENT-07, EVENT-08
  **Success Criteria** (what must be TRUE):
    1. A brand completes the multi-step campaign builder (brief → type and rules → rewards → review) and submits without seeing any wallet address, gas prompt, or raw transaction hash
    2. The step indicator modal advances through all four states — "Preparing event", "Approving USDC", "Locking reward pool", "Event Activated" — and the event appears on the brand dashboard only after on-chain confirmation
    3. The DB event record shows `onChainEventId` populated and status `scheduled` only after `waitForUserOperationReceipt` resolves — never in advance
    4. If the UserOp fails after approval but before event creation (simulated), the event does not appear as active and the UI shows an error with retry — no dangling allowance creates a silent stuck state
  **Plans**: TBD

  ### Phase 5: Event Detail, Submission, and Voting
  **Goal**: Creators can submit text and media to an active event, the community can vote with a single click, and all interaction state persists across page reloads — all wired to live API data, no mocks
  **Depends on**: Phase 4
  **Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, VOTE-01, VOTE-02, VOTE-03, VOTE-04, VOTE-05, VOTE-06, VOTE-07
  **Success Criteria** (what must be TRUE):
    1. A creator on a `posting`-status event can submit a caption and upload an image — the image is stored as an IPFS CID via Pinata and displayed from `https://gateway.pinata.cloud/ipfs/${cid}` — and the submission form shows a loading state then success confirmation with no blockchain interaction required
    2. A creator cannot submit twice to the same event — the form is replaced with a "already submitted" state on reload after a successful submission
    3. A voter clicks vote on a submission and the vote count increments immediately on screen; if the API call fails, the count reverts to the pre-vote value automatically
    4. A user who has voted on an event and reloads the page still sees their voted state — vote state is returned by the backend with event data, not derived from local storage
    5. A user cannot vote on their own submission and receives a clear message if they attempt it
  **Plans**: TBD

  ### Phase 6: Reward Claim Flow
  **Goal**: After an event completes and rewards are credited, creators and voters can claim USDC in a single gasless action — the claim UX is animated, jargon-free, and finalizes with a balance count-up and confetti
  **Depends on**: Phase 4, Phase 5
  **Requirements**: REWD-01, REWD-02, REWD-03, REWD-04, REWD-05, REWD-06, REWD-07
  **Success Criteria** (what must be TRUE):
    1. A user who participated in a completed event sees a claimable USDC balance broken down by event, role (creator / voter / leaderboard), and total — before clicking claim
    2. Clicking "Claim Rewards" triggers a gasless `claimRewards()` UserOp with a step indicator — "Preparing claim", "Processing on-chain", "Rewards credited" — no wallet pop-up or gas prompt appears at any point
    3. After a successful claim, the wallet balance animates upward (count-up) and a confetti effect plays; the claim button changes to "Claimed" and cannot be clicked again
    4. The DB claim status updates from CREDITED to CLAIMED via `POST /api/rewards/confirm-all` only after `waitForUserOperationReceipt` confirms — a user who refreshes mid-claim sees the correct in-progress state, not a double-claim button
  **Plans**: TBD

  ### Phase 7: Brand Dashboard and Analytics
  **Goal**: Brands have full operational visibility into their live campaigns — submission counts, vote counts, participant analytics, their embedded wallet USDC balance, and any refundable balance from cancelled events
  **Depends on**: Phase 4, Phase 6
  **Requirements**: BRAND-01, BRAND-02, BRAND-03
  **Success Criteria** (what must be TRUE):
    1. A brand dashboard shows live per-event analytics — submission count, vote count, and unique participant count — pulled from the `EventAnalytics` table (not mock data)
    2. A brand can see their embedded wallet USDC balance with instructions for pre-funding it — no fiat onramp, no MetaMask; clear guidance for the embedded wallet top-up flow
    3. A brand can see their refundable balance from cancelled or expired events with a clear explanation of when and how refunds are processed
  **Plans**: TBD

  ## Progress

  **Execution Order:**
  Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

  | Phase | Plans Complete | Status | Completed |
  |-------|----------------|--------|-----------|
  | 1. Auth Hardening | 0/TBD | Not started | - |
  | 2. Blockchain Abstraction Layer | 0/TBD | Not started | - |
  | 3. Pimlico Paymaster Configuration | 0/TBD | Not started | - |
  | 4. Gasless Event Creation | 0/TBD | Not started | - |
  | 5. Event Detail, Submission, and Voting | 0/TBD | Not started | - |
  | 6. Reward Claim Flow | 0/TBD | Not started | - |
  | 7. Brand Dashboard and Analytics | 0/TBD | Not started | - |
