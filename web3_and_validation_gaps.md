# Web3 Stability & Backend Validation Gaps in `aris-design`

This document details the critical gaps in Web3/blockchain stability and backend data validation within the `aris-design` repository compared to the stable production-like implementation in `aris-demo` and the project `.planning/ROADMAP.md`.

---

## 1. Web3 & Blockchain Stability Gaps

The `aris-design` repository represents an earlier, less secure prototype phase regarding smart contract interactions and decentralised state synchronization.

### A. Lack of Gasless Event Creation Sync
- **Current State in `aris-design`:** The system allows creating event records in the database, but it lacks robust, enforced integration with on-chain transaction hashes. Events are often just marked active or pending without strict verification that the corresponding `RewardsVaultV3.sol` smart contract transaction has cleared.
- **Required Stability (Found in `aris-demo`):** Event creation must be atomic with the blockchain. The backend must require a `poolTxHash` from the frontend (using Privy's `sendBatchTransaction` for gasless sponsored transactions). The backend should insert the event as `PENDING_BLOCKCHAIN` and actively verify the transaction receipt before transitioning the event to an `ACTIVE` state, ensuring zero state deviance between the database and the ledger.

### B. Incomplete Reward Processing Mechanisms
- **Current State in `aris-design`:** Relegates rewards largely to database state updates without a battle-tested distribution script.
- **Required Stability (Found in `aris-demo`):** A robust `processEventRewards` function in `rewardsService.ts` that triggers when an event completes. It must:
  1. Calculate exact cryptographic claims based on fixed BPS (Basis Points) to prevent floating-point vulnerabilities.
  2. Batch execute distributions directly on-chain using `viem`.
  3. Seamlessly handle `EventNotActive` or `AlreadyCompleted` contract reversions gracefully without crashing the server.

### C. Legacy Testnet Code
- **Current State in `aris-design`:** Still includes development scaffolding like `faucetRoutes.ts`.
- **Required Stability:** Production-grade environments abstract testnet funding or remove unsafe faucet endpoints entirely to prevent attack vectors on simulated environments before Mainnet drops.

---

## 2. Backend Validation Gaps

The `aris-design` backend API lacks several crucial defensive programming validations that were subsequently patched in `aris-demo`.

### A. Reward Pool Economics Validation
- **Gap:** `aris-design` does not correctly enforce the economic safety bounds for reward pools. Specifically, it may incorrectly allow or force a `2x` multiplier minimum for the top reward pool relative to the base pool.
- **Resolution:** The `eventService.ts` `createEvent` validation must strictly enforce a minimum `1x` multiplier for `topReward` to match updated product requirements, rejecting any payload that attempts to underfund the smart contract vault.

### B. Event Boundary Enforcement
- **Gap:** The API allows the creation of "ghost events"—events with trivially small participant pools or impossibly short durations.
- **Resolution:** Strict rejection of events must be added to `eventService.ts`:
  - `capacity` must be `>= 5` participants.
  - Event duration (`endTime - startTime`) must be strictly `>= 2 hours` (`2 * 60 * 60 * 1000` ms).

### C. Search & Discovery Visibility (Filter Bugs)
- **Gap:** The `searchController.ts` `/search/all` endpoint in `aris-design` likely employs an overly strict database filter (e.g., `where: { blockchainStatus: 'ACTIVE' }`), which entirely breaks the discovery of identically valid `PENDING` or `COMPLETED` events in the user feed.
- **Resolution:** The query logic must be relaxed to `where: { blockchainStatus: { in: ['ACTIVE', 'PENDING', 'COMPLETED'] } }` to ensure users can see historical and newly spinning-up events in the search results.

### D. Re-voting & Transaction Race Conditions
- **Gap:** The `voteService.ts` voting mutation does not sufficiently lock rows or aggressively validate previous vote existence in a monolithic transaction block, potentially allowing rapid double-click re-voting or self-voting on submissions.
- **Resolution:** Implementation of strict database transaction blocks (`prisma.$transaction`) executing atomic checks: verifying the user hasn't voted, the user isn't the submission owner, and deducting the capacity simultaneously.
