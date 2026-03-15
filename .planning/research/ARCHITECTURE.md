# Architecture Research

**Domain:** Web3 creator competition platform with ERC-4337 smart accounts, off-chain voting, and on-chain reward settlement
**Researched:** 2026-03-03
**Confidence:** HIGH (based on existing codebase analysis + established ERC-4337 / Pimlico patterns)

---

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js client)                       │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  React Pages  │  │  React Pages  │  │  React Pages  │  │  Contexts  │  │
│  │  (brands)     │  │  (users)      │  │  (admin)      │  │  Providers │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                  │                 │          │
│  ┌──────┴─────────────────┴──────────────────┴─────────────────┴──────┐  │
│  │                    lib/blockchain/  (abstraction layer)              │  │
│  │  client.ts  │  contracts.ts  │  gasless.ts  │  abi/                 │  │
│  └──────────────────────────────┬──────────────────────────────────────┘  │
│                                 │                                          │
│  ┌──────────────────────────────┴──────────────────────────────────────┐  │
│  │                  services/*.service.ts  (API calls)                  │  │
│  │  event.service  │  submission.service  │  rewards.service (new)      │  │
│  └──────────────────────────────┬──────────────────────────────────────┘  │
└─────────────────────────────────┼──────────────────────────────────────────┘
                                  │ HTTP + JWT / Socket.io
┌─────────────────────────────────┼──────────────────────────────────────────┐
│                         BACKEND (Express / Prisma)                          │
│                                  │                                          │
│  ┌──────────┐  ┌──────────┐  ┌──┴────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Auth    │  │  Event   │  │  Rewards  │  │  Vote    │  │  Notif     │  │
│  │  Routes  │  │  Routes  │  │  Routes   │  │  Routes  │  │  Routes    │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │             │              │              │               │          │
│  ┌────┴─────────────┴──────────────┴──────────────┴───────────────┴──────┐  │
│  │  lib/blockchain.ts (BlockchainService)  |  Prisma (Supabase/Postgres)  │  │
│  └──────────────────────────────┬──────────────────────────────────────────┘  │
└─────────────────────────────────┼──────────────────────────────────────────┘
                                  │ viem (backend signer)
┌─────────────────────────────────┼──────────────────────────────────────────┐
│                      BLOCKCHAIN (Polygon Amoy)                              │
│                                  │                                          │
│  ┌───────────────────────────────┴────────────────────────────────────┐     │
│  │                    RewardsVaultV3 (single contract)                 │     │
│  │  createEvent()  │  creditRewardsBatch()  │  claimRewards()          │     │
│  │  cancelEvent()  │  withdrawRefund()      │  getUserClaimableBalance()│     │
│  └────────────────────────────────────────────────────────────────────┘     │
│  ┌──────────────┐  ┌───────────────────┐  ┌─────────────────────────┐      │
│  │  USDC (ERC-20) │  │  Pimlico Paymaster │  │  ERC-4337 Bundler      │      │
│  └──────────────┘  └───────────────────┘  └─────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| React Pages | UI rendering, state display, UX step indicators | contexts, services |
| WalletContext | Privy smart wallet lifecycle, address, USDC balance | Privy SDK, publicClient |
| lib/blockchain/ | Pure blockchain calls — no UI, no state, no business logic | viem, Pimlico, contract ABIs |
| services/*.service.ts | REST API calls to backend; maps API responses to typed models | Express backend |
| Express Routes | Request routing, auth middleware, param validation | Services, Prisma |
| RewardsService (backend) | Reward calculation, DB persistence, on-chain distribution orchestration | BlockchainService, Prisma |
| BlockchainService (backend) | Backend-signer transactions (creditRewardsBatch, cancelEvent) | viem walletClient |
| RewardsVaultV3 | USDC custody, event pool tracking, reward crediting, user claims | ERC-20 USDC token |
| Pimlico Paymaster | Sponsors gas for brand and user UserOperations | ERC-4337 Bundler |

---

## Recommended Project Structure

### Client — lib/blockchain/ (does not yet exist, must be created)

```
client/
├── lib/
│   ├── blockchain/
│   │   ├── client.ts           # publicClient + walletClient factories, chain def
│   │   ├── contracts.ts        # contract addresses, ABI imports, typed contract reads
│   │   ├── gasless.ts          # Pimlico paymaster, sendUserOperation, batch calls
│   │   └── abi/
│   │       ├── RewardsVaultV3.json   # copied from server/src/contracts/
│   │       └── ERC20.json            # minimal approve/balanceOf ABI
│   ├── eventUtils.ts           # (existing) event-specific pure utilities
│   ├── utils.ts                # (existing) general utilities
│   └── pinata-upload.ts        # (existing) IPFS upload
├── services/
│   ├── api.ts                  # (existing) base fetch, token injection
│   ├── event.service.ts        # (existing) REST calls for events
│   ├── submission.service.ts   # (existing) REST calls for submissions
│   ├── rewards.service.ts      # (NEW) REST calls: getClaimable, confirmClaim, getBalance
│   └── ...
├── context/
│   ├── WalletContext.tsx       # (existing) Privy smart wallet, balance refresh
│   └── ...
```

### What Each File Exports

**`lib/blockchain/client.ts`**
```typescript
// Exports:
export const polygonAmoy: Chain              // chain definition (move from WalletContext)
export const publicClient: PublicClient      // read-only RPC client
export function getWalletClient(             // write client from Privy smart wallet
  smartWalletClient: SmartWalletClient
): WalletClient
```

**`lib/blockchain/contracts.ts`**
```typescript
// Exports:
export const REWARDS_VAULT_ADDRESS: Address  // from env NEXT_PUBLIC_REWARDS_VAULT_ADDRESS
export const USDC_ADDRESS: Address           // from env NEXT_PUBLIC_TEST_USDC_ADDRESS
export const REWARDS_VAULT_ABI: Abi          // typed ABI from RewardsVaultV3.json

// Pure read functions (use publicClient internally):
export async function getEventPool(
  eventId: string                            // UUID — will be keccak256-hashed internally
): Promise<EventPool>

export async function getUserClaimableBalance(
  userAddress: Address
): Promise<bigint>                           // raw 6-decimal USDC amount

export async function calculateRequiredUsdc(
  eventType: 0 | 1,                          // 0=VoteOnly 1=PostAndVote
  maxParticipants: bigint,
  topPoolUsdc: bigint
): Promise<bigint>

export function eventIdToBytes32(uuid: string): `0x${string}`  // keccak256(uuid)
```

**`lib/blockchain/gasless.ts`**
```typescript
// Exports — all functions go through Pimlico paymaster:
export async function createEventGasless(params: {
  smartWalletClient: SmartWalletClient,
  eventId: string,                           // UUID from DB
  eventType: 0 | 1,
  maxParticipants: bigint,
  topPoolUsdc: bigint,
  useRefundBalance: bigint,
  totalRequired: bigint,                     // pre-calculated for USDC approve
}): Promise<Hash>
// Internally sends atomic batch: [approve(vault, totalRequired), createEvent(...)]

export async function claimRewardsGasless(params: {
  smartWalletClient: SmartWalletClient,
}): Promise<Hash>
// Calls claimRewards() on vault — no parameters needed, vault maps msg.sender to credits

export async function withdrawRefundGasless(params: {
  smartWalletClient: SmartWalletClient,
}): Promise<Hash>
// Calls withdrawRefund() for brand wallet
```

### Server — lib/blockchain.ts (already exists, expand in place)

```
server/src/
├── lib/
│   ├── blockchain.ts     # (existing) BlockchainService + utility functions
│   ├── prisma.ts
│   └── firebaseAdmin.ts
├── contracts/
│   └── RewardsVaultV3.json  # (existing) source of truth ABI
├── services/
│   ├── rewardsService.ts     # (existing, substantial) reward calc + on-chain distribution
│   ├── eventService.ts       # (existing) event CRUD + status machine
│   └── voteService.ts        # (existing) off-chain vote recording
```

---

## Architectural Patterns

### Pattern 1: Off-Chain Voting with On-Chain Settlement

**What:** All votes are recorded in Postgres by the backend. When an event completes, the backend calculates rewards and calls `creditRewardsBatch()` on-chain. Users then claim USDC with a single no-arg `claimRewards()` call.

**When to use:** Any action that needs speed (voting must be instant) but financial integrity (rewards must be tamper-proof).

**Trade-offs:** Backend becomes trusted party for vote tallying. Mitigated by having the contract enforce total-pool constraints — over-crediting is blocked at the contract level. Individual vote counts are not verified on-chain, which is an acceptable trust trade for UX.

**Data flow:**
```
User clicks vote
    ↓
POST /api/events/:id/vote
    ↓
VoteService.voteForSubmission() → prisma.vote.create()
    ↓ (optimistic UI, instant feedback)
    ↓ (event ends — cron or admin trigger)
RewardsService.processEventRewards()
    ├── calculate claims from DB vote records
    ├── BlockchainService.distributeRewardsBatch()  → creditRewardsBatch() on-chain
    └── prisma.$transaction() → upsert RewardClaim records (CREDITED)
    ↓
User clicks "Claim Rewards"
    ↓
claimRewardsGasless() → claimRewards() on vault (gasless UserOp)
    ↓ (on success)
POST /api/rewards/confirm-all  → RewardsService.confirmAllUserClaims() (CLAIMED)
```

### Pattern 2: Atomic Batch UserOperation for Event Creation

**What:** Brand creates an event with a single click. The frontend encodes two calls — `approve(vaultAddress, totalRequired)` on USDC, and `createEvent(eventId, ...)` on the vault — and submits them as a single ERC-4337 UserOperation. Pimlico paymaster sponsors the gas.

**When to use:** Any action requiring multiple contract calls that must be atomic — partial execution is unsafe (approved but event not created would leave allowance dangling).

**Trade-offs:** Slightly higher complexity in gasless.ts. Requires accurate pre-calculation of `totalRequired` before calling. If Pimlico paymaster policy expires or quota runs out, the call fails entirely with a clear error — no partial state.

**Example (gasless.ts internal logic):**
```typescript
// Encode the two calls
const approveData = encodeFunctionData({
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [REWARDS_VAULT_ADDRESS, totalRequired],
})

const createEventData = encodeFunctionData({
  abi: REWARDS_VAULT_ABI,
  functionName: 'createEvent',
  args: [eventIdBytes32, eventType, maxParticipants, topPoolUsdc, useRefundBalance],
})

// Privy smart wallet sendTransaction with calls array (ERC-4337 batch)
const txHash = await smartWalletClient.sendTransaction({
  calls: [
    { to: USDC_ADDRESS, data: approveData, value: 0n },
    { to: REWARDS_VAULT_ADDRESS, data: createEventData, value: 0n },
  ],
  // Pimlico paymaster configuration goes here via Privy smart wallet config,
  // set at PrivyProvider level — not per-call
})
```

### Pattern 3: Backend Signer for Trust-Minimized Settlement

**What:** The backend holds a private key (BACKEND_SIGNER_PRIVATE_KEY) that is whitelisted in the RewardsVaultV3 contract as `backendSigner`. Only this address can call `creditRewardsBatch()`. This keeps reward calculation off-chain while making fraud require compromising the backend key.

**When to use:** Actions where the contract needs to trust computed off-chain data (vote tallies) but you cannot put vote logic on-chain cost-effectively.

**Trade-offs:** Requires operational security on the backend key. Contract should enforce that total credited amounts cannot exceed the locked pool — this bounds the damage of a compromised key. Current RewardsVaultV3 has `creditRewardsBatch` as `backendSigner`-only, which is correct.

### Pattern 4: DB-First with On-Chain Sync (not on-chain-first)

**What:** The database (Prisma/Supabase) is the primary read surface. On-chain state is written to but not read from for normal UI operations. On-chain reads (`getUserClaimableBalance`, `getEventPool`) are used only for financial displays and claim flows.

**When to use:** Web3 apps where on-chain reads are too slow or expensive for every page load.

**Trade-offs:** DB can drift from chain state. RewardsService already has `syncClaimsWithOnChain()` for recovery. Event creation must write `onChainEventId` back to the DB after the UserOp confirms.

---

## Data Flow

### Event Creation Flow (Brand)

```
Brand fills event form → clicks "Create Event"
    ↓
Frontend: calculateRequiredUsdc() [read-only contract call]
    ↓ shows cost breakdown
Brand confirms
    ↓
Frontend: createEventGasless() [lib/blockchain/gasless.ts]
    ├── encodes [approve, createEvent] batch
    ├── submits via Privy smart wallet (Pimlico paymaster sponsors gas)
    └── returns txHash
    ↓ (while waiting for confirmation — show step indicator)
Waiting for UserOp inclusion (typically 3-8 seconds on Amoy)
    ↓ (on confirmed)
Frontend: POST /api/events  { onChainTxHash, onChainEventId, ...formData }
    ↓
Backend: EventService.createEvent() — saves event to DB
         RewardsService.createPoolRecord() — saves pool record to DB
    ↓
Frontend: redirect to event dashboard, start polling for status
```

**Layer involvement:**
- Frontend only (read): cost calculation, form state
- Frontend + blockchain: UserOp submission
- Frontend + backend: DB record creation (after on-chain confirmation)
- Backend only: pool math validation, DB writes

### Voting Flow (User)

```
User clicks vote on submission
    ↓
Frontend: optimistic UI update (instant feedback, no blockchain)
    ↓ simultaneously
POST /api/events/:id/votes  { submissionId }
    ↓ (backend validates: event in VOTING state, user hasn't voted, etc.)
VoteService.voteForSubmission() → prisma.vote.create()
    ↓ (success)
Backend: XpService.awardXp(), NotificationService (async)
    ↓ (failure — e.g., already voted)
Frontend: rollback optimistic update, show error toast
```

**Layer involvement:**
- Frontend only: optimistic state, UI feedback
- Backend only: vote recording, XP, deduplication
- Blockchain: NOT involved in voting at all

### Reward Claim Flow (User)

```
Event completes → admin or cron triggers processEventRewards()
    ↓
Backend: RewardsService.processEventRewards()
    ├── 1. Calculate claims from DB vote records
    ├── 2. BlockchainService.distributeRewardsBatch() → creditRewardsBatch() on-chain
    └── 3. prisma.$transaction() → RewardClaim records set to CREDITED
    ↓
User sees "Rewards Available" badge (from DB query)
    ↓
User clicks "Claim"
    ↓
Frontend: getUserClaimableBalance(userAddress) [on-chain read]
    shows exact USDC amount
    ↓
User confirms
    ↓
Frontend: claimRewardsGasless() [lib/blockchain/gasless.ts]
    claimRewards() call → vault transfers USDC to user wallet
    ↓ (on txHash confirmed)
Frontend: POST /api/rewards/confirm-all  { transactionHash }
    ↓
Backend: RewardsService.confirmAllUserClaims() → CREDITED → CLAIMED
         refreshBalance() in WalletContext
```

**Layer involvement:**
- Backend: reward calculation, on-chain crediting, DB sync
- Blockchain: credit storage (push model), USDC transfer on claim
- Frontend: balance display, gasless claim UserOp, DB confirmation call

### State Diagram: Claim Lifecycle

```
[Event COMPLETED]
    ↓ processEventRewards()
[RewardClaim.status = PENDING]    ← claim record exists, on-chain not yet credited
    ↓ distributeRewardsBatch() succeeds on-chain
[RewardClaim.status = CREDITED]   ← credited in vault, user hasn't called claimRewards()
    ↓ user calls claimRewards() gasless
[USDC transferred to user wallet]
    ↓ confirmAllUserClaims() called by frontend
[RewardClaim.status = CLAIMED]    ← fully settled
```

---

## Smart Contract Interface

### RewardsVaultV3 — Key Function Signatures

The contract already exists at `0x7BEbA9297aED5a2c09a05807617318bAA0F561C6` (Polygon Amoy, deployed). ABI is in `server/src/contracts/RewardsVaultV3.json`.

**Write functions (brand-facing, called via Privy smart wallet + Pimlico gasless):**

```solidity
// Called by brand smart wallet — locks USDC in vault for reward pool
// Must be preceded by USDC.approve(vaultAddress, totalRequired)
function createEvent(
    bytes32 eventId,           // keccak256(uuid) of DB event ID
    EventType eventType,       // 0=VoteOnly, 1=PostAndVote
    uint256 maxParticipants,
    uint256 topPoolUsdc,       // in 6-decimal USDC units
    uint256 useRefundBalance   // 0 = pay full amount, or use brand's refund credits
) external

// Helper: calculates total USDC the brand must approve before createEvent
function calculateRequiredUsdc(
    EventType eventType,
    uint256 maxParticipants,
    uint256 topPoolUsdc
) external pure returns (uint256)
```

**Write functions (user-facing, called via Privy smart wallet + Pimlico gasless):**

```solidity
// Called by user — vault pushes all CREDITED USDC to msg.sender
function claimRewards() external

// Called by brand — withdraws accumulated refund balance
function withdrawRefund() external
```

**Write functions (backend signer only):**

```solidity
// Called by backend signer after event completion — credits rewards to user addresses
function creditRewardsBatch(
    bytes32 eventId,
    address[] calldata users,
    uint256[] calldata amounts,   // 6-decimal USDC units, parallel to users[]
    uint256 actualParticipants
) external

// Called by backend signer if event fails minimum submission threshold
function cancelEvent(bytes32 eventId) external
```

**Read functions (frontend, no gas):**

```solidity
// Returns user's total claimable USDC balance across all events
function getUserClaimableBalance(address user) external view returns (uint256)

// Returns full event pool struct for a given eventId
function getEventPool(bytes32 eventId) external view returns (EventPool memory)

// Returns brand's accumulated refund balance
function getBrandRefundBalance(address brand) external view returns (uint256)
```

**EventPool struct returned by getEventPool:**

```solidity
struct EventPool {
    bytes32 eventId;
    EventStatus status;       // 0=Active, 1=Completed, 2=Cancelled
    EventType eventType;      // 0=VoteOnly, 1=PostAndVote
    address brandOwner;
    uint256 maxParticipants;
    uint256 basePoolUsdc;
    uint256 topPoolUsdc;
    uint256 platformFeeUsdc;
    uint256 creatorPoolUsdc;
    uint256 leaderboardPoolUsdc;
    uint256 totalDisbursed;
    uint256 actualParticipants;
    uint256 createdAt;
    uint256 completedAt;
}
```

---

## Pimlico Paymaster in the Call Chain

Pimlico is configured at the **PrivyProvider level** in `ClientProviders.tsx`, not per-call. This means all Privy smart wallet transactions are automatically sponsored — the paymaster wraps every UserOperation before submission to the bundler.

```
Brand/User action in UI
    ↓
smartWalletClient.sendTransaction({ calls: [...] })
    ↓ (Privy intercepts, builds UserOperation)
Pimlico Paymaster API
    ├── pm_sponsorUserOperation → adds paymaster data to UserOp
    └── returns signed paymaster data
    ↓
Pimlico Bundler (eth_sendUserOperation)
    ↓ (UserOp included in block)
RewardsVaultV3 / USDC contract execution
    ↓
txHash returned to smartWalletClient.sendTransaction()
```

**Pimlico configuration (belongs in PrivyProvider config, not in gasless.ts):**
- Policy: sponsor all calls to `REWARDS_VAULT_ADDRESS` and `USDC_ADDRESS`
- Chain: Polygon Amoy (chainId 80002)
- API key: `pim_EUHoE84PA87vUFGYGNemv2`
- This config currently has stub comments in WalletContext.tsx — it needs to be wired into the PrivyProvider `paymasterContext` or via permissionless.js `createPimlicoClient`

---

## Build Order

The architecture has hard dependencies that determine phase ordering. Each layer must be stable before the next is built.

```
Phase 1: Auth hardening (GATE — must complete first)
│
│   Rationale: All subsequent layers read privyId, walletAddress, JWT from auth.
│   A broken auth breaks everything downstream. Do not touch contracts until
│   auth loading states, JWT verification, and smart account address resolution
│   are solid and tested.
│
├── Phase 2: lib/blockchain/ abstraction layer
│   │
│   │   Rationale: All frontend blockchain calls must go through this layer.
│   │   Build it empty-shell first: client.ts (chain + public client), contracts.ts
│   │   (address constants + read helpers), gasless.ts (stubs). This lets UI
│   │   components import from the right location before functions are wired.
│   │
│   ├── Phase 3: Pimlico paymaster configuration
│   │   │
│   │   │   Rationale: gasless.ts cannot be tested until paymaster is live.
│   │   │   Wire paymaster into PrivyProvider config. Test with a minimal
│   │   │   send on Amoy (e.g., a 0-value call to a test contract) to confirm
│   │   │   sponsorship works before building event creation flow.
│   │   │
│   │   ├── Phase 4: Event creation flow
│   │   │   │
│   │   │   │   Rationale: Requires Phase 2 (gasless.ts batch call) and
│   │   │   │   Phase 3 (paymaster live). The contract is already deployed.
│   │   │   │   Build the UI step indicator, wire createEventGasless(), handle
│   │   │   │   onChainEventId write-back to backend after confirmation.
│   │   │   │
│   │   │   └── Phase 5: Reward claim flow
│   │   │
│   │   │       Rationale: Requires Phase 4 (events exist on-chain with pools).
│   │   │       Backend rewardsService is already substantial. Frontend needs
│   │   │       claimRewardsGasless() + confirm-all API call + animated UX.
│   │   │
│   └── (Phase 3 can be parallelized with Phase 4 UI scaffolding)
│
└── (Phase 2 can be started immediately after auth is locked)
```

**Strict gates:**
- Do NOT build gasless event creation UI before Pimlico is confirmed working
- Do NOT build reward claim UI before at least one event has been created and completed on-chain
- Do NOT move to reward distribution before `creditRewardsBatch` is verified on Amoy with the deployed contract address

---

## Integration Points

### External Services

| Service | Integration Pattern | Where | Notes |
|---------|---------------------|-------|-------|
| Privy | SDK in PrivyProvider; `useSmartWallets()` hook | client/context/WalletContext.tsx | v3 API — `useSmartWallets()` not `useWallet()` for smart accounts |
| Pimlico | Configured as paymasterContext in PrivyProvider OR via permissionless.js `createPimlicoClient` | client/components/providers/ClientProviders.tsx | Currently stubbed — must be activated |
| Polygon Amoy RPC | `createPublicClient({ transport: http('https://rpc-amoy.polygon.technology') })` | lib/blockchain/client.ts | Public RPC; switch to private RPC (e.g., Alchemy/Ankr) for production |
| RewardsVaultV3 | Direct contract reads via publicClient; writes via smartWalletClient | lib/blockchain/contracts.ts + gasless.ts | ABI in `server/src/contracts/` and copied to `client/lib/blockchain/abi/` |
| Supabase/Postgres | Prisma ORM | server/src/lib/prisma.ts | Direct connection for writes, pooler (port 6543) for serverless |
| Pinata IPFS | REST API for CID uploads | client/lib/pinata-upload.ts | Already wired; no changes needed |

### Internal Boundaries

| Boundary | Communication | Rule |
|----------|---------------|------|
| UI components ↔ blockchain | Only through lib/blockchain/ — never direct viem calls in components | Components must never import viem or ABI JSON directly |
| Frontend ↔ backend | REST API (services/*.service.ts) + JWT auth | Blockchain state changes must be confirmed to backend after on-chain tx |
| Backend ↔ blockchain | BlockchainService (backend signer) for writes; publicClient for reads | No backend call should block on chain reads for normal API responses |
| On-chain ↔ DB | DB is primary read surface; on-chain is authoritative for balances | Sync functions (`syncClaimsWithOnChain`) handle drift recovery |
| VoteService ↔ RewardsService | VoteService owns vote recording; RewardsService reads votes to calculate rewards | No cross-service writes — RewardsService never writes to Vote table |

---

## Anti-Patterns

### Anti-Pattern 1: Direct viem Calls in React Components

**What people do:** Import `viem`, `encodeFunctionData`, or contract ABI directly into page components or hooks.

**Why it's wrong:** Scatters blockchain logic across the codebase, makes it impossible to swap clients or add the paymaster in one place, and leaks chain details into the component layer.

**Do this instead:** All blockchain interactions go through `lib/blockchain/gasless.ts` (for writes) or `lib/blockchain/contracts.ts` (for reads). Components import from `lib/blockchain/` only.

### Anti-Pattern 2: Two-Step Signing for Event Creation

**What people do:** Prompt user to approve USDC first ("sign transaction 1 of 2"), then create event ("sign transaction 2 of 2").

**Why it's wrong:** This is the Web3 experience users hate. It also creates a partial-state risk where approval lands but createEvent fails.

**Do this instead:** Bundle `approve + createEvent` as a single ERC-4337 UserOperation with a `calls` array. Privy smart wallets support this natively via `sendTransaction({ calls: [...] })`. The user sees one loading step.

### Anti-Pattern 3: Polling Chain State for Vote Display

**What people do:** Call `getEventPool()` on each page load to show vote counts and participation data.

**Why it's wrong:** The contract does not store per-user vote data — only aggregate pool state. On-chain reads for display data are slow (RPC latency) and unnecessary since Postgres has all this data.

**Do this instead:** Use Postgres (via API) as the read surface for all vote display and event state. Reserve on-chain reads for financial data that must be authoritative: `getUserClaimableBalance()` before showing claim UI, `getEventPool().status` to confirm event is Active before creating.

### Anti-Pattern 4: Writing onChainEventId Before Confirmation

**What people do:** Send the UserOp and immediately write `onChainEventId` to the DB based on the expected bytes32, before the tx is confirmed.

**Why it's wrong:** UserOps can fail (reverted by contract, bundler drops them). Writing the DB record before confirmation creates an event the brand thinks is live but which doesn't exist on-chain.

**Do this instead:** Wait for `waitForTransactionReceipt({ hash: txHash })` in `gasless.ts` (or pass the confirmed txHash back to the page), then POST to backend with both `onChainTxHash` and `onChainEventId`. The event stays in `draft` status until this confirmation arrives.

### Anti-Pattern 5: creditRewardsBatch Without DB Transaction Wrapper

**What people do:** Call `distributeRewardsBatch()` on-chain and update the DB in separate try-catches.

**Why it's wrong:** If on-chain succeeds but DB update fails (or vice versa), claims are orphaned. Users get USDC but DB says PENDING (or reverse: DB says CREDITED but on-chain was never called).

**Do this instead:** The existing pattern in `rewardsService.ts` is correct — on-chain first, then `prisma.$transaction()` for all DB writes in one atomic operation. If the DB transaction fails, the txHash is still captured in `result.transactionHash` and can be replayed via `syncClaimsWithOnChain()`.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1K users | Current monolith is fine. Single Amoy RPC. No queue needed. |
| 1K-10K users | Add job queue (BullMQ/Redis) for `processEventRewards()` — it can take 30s+ and should not run in-request. Add DB connection pooling (already using Supabase pooler). Consider dedicated RPC node. |
| 10K+ users | Voting endpoint becomes write bottleneck — batch writes or use a Redis counter with periodic DB flush. Move `creditRewardsBatch` to a separate signer service. Consider moving to Polygon mainnet with real USDC. |

**First bottleneck:** `processEventRewards()` is synchronous and can time out on large events (many votes). It must be moved to an async job queue before public launch. The existing `scripts/processRewards.ts` pattern shows the shape — wire it to BullMQ.

**Second bottleneck:** Voting write throughput. Each vote is a `prisma.vote.create()` — fine at low scale, degrades at high concurrency. The optimistic UI pattern already exists; backing it with Redis counters + async DB flush would handle 10x the current throughput.

---

## Sources

- Codebase analysis: `server/src/lib/blockchain.ts`, `server/src/services/rewardsService.ts`, `client/context/WalletContext.tsx`, `server/src/contracts/RewardsVaultV3.json`
- Architecture pattern: ERC-4337 hybrid off-chain/on-chain patterns (standard industry practice for gasless Web3 apps, HIGH confidence from established ecosystem)
- Pimlico paymaster integration: standard `paymasterContext` in Privy PrivyProvider + permissionless.js patterns (MEDIUM confidence — Pimlico docs and Privy v3 docs confirm this pattern; specific config syntax should be verified against Privy v3 `@privy-io/react-auth` 3.14.x changelog)
- Batch UserOp pattern: `sendTransaction({ calls: [] })` in Privy smart wallet (HIGH confidence — confirmed by WalletContext.tsx `sendBatchTransaction` implementation already using this pattern, though paymaster stub is commented out)

---

*Architecture research for: Aris Web3 creator competition platform — off-chain/on-chain layer separation*
*Researched: 2026-03-03*
