# Pitfalls Research

**Domain:** ERC-4337 gasless Web3 platform — Pimlico paymaster + Privy embedded wallets + Polygon Amoy
**Researched:** 2026-03-03
**Confidence:** HIGH (verified against actual codebase history; this project already ran a failed Web3 phase and has `migrateToWeb2.ts` + archived test scripts that document real failures)

---

## Critical Pitfalls

### Pitfall 1: EOA Address Stored in DB Instead of Smart Account Address

**What goes wrong:**
When a Privy user logs in, two addresses exist: the EOA (embedded wallet key, `eoaAddress`) and the smart account address (`address` from `useSmartWallets`). If the backend stores `eoaAddress` instead of the smart account address as `user.walletAddress`, on-chain reward credits go to the EOA, but the user's smart account (which performs claims) has zero balance. The claim transaction succeeds in the DB but reverts on-chain.

**Why it happens:**
Privy's `user.linkedAccounts` array returns the embedded wallet with `walletClientType: "privy"` — this is the EOA. The smart account address comes from `useSmartWallets().client.account.address`, which only resolves after the smart wallet is fully initialized. Developers frequently snapshot `linkedAccounts` during login before the smart account is ready, storing the wrong address.

**Consequences:**
- `diagnoseRewards.ts` pattern: `status: 'ZERO_ONCHAIN'` — DB shows rewards, on-chain balance is 0
- This exact failure is documented in the archived codebase: `"On-chain (0.00) != DB (X.XX)"` with note `"likely EOA/SmartAccount mismatch"`
- Users cannot claim rewards; requires manual address update via `updateUserWallet.ts` script
- Silent failure — no error at reward distribution time, only discovered when user tries to claim

**How to avoid:**
1. Never sync `user.walletAddress` from `user.linkedAccounts` on login
2. Only sync the smart account address: `smartWalletClient?.account?.address` — and only after confirming it is non-null
3. Add a server-side check: reject any `walletAddress` update where the address matches a known EOA pattern (EOA addresses are shorter derivation paths, but this requires the Privy user object to compare)
4. Store both `eoaAddress` and `smartAccountAddress` separately in the DB schema from day one

**Warning signs:**
- `diagnoseRewards.ts` showing `ZERO_ONCHAIN` status for users with DB rewards
- User's `walletAddress` in DB begins with `0x` but on-chain `getAccumulatedRewards(walletAddress)` returns 0
- Smart account `isDeployed()` returning false for the stored address

**Phase to address:** Blockchain Abstraction Layer phase (before any contract calls) — the `lib/blockchain/` module must expose only the smart account address and never the EOA.

---

### Pitfall 2: Paymaster Policy Not Configured Before Building UserOp Flows

**What goes wrong:**
Pimlico paymaster requires an explicit sponsorship policy scoped to: chain (Polygon Amoy = 80002), contract address, and optionally per-user or per-UserOp spend limits. Calling `pm_sponsorUserOperation` without a configured policy returns a policy-rejection error that looks identical to a gas estimation failure. Building the entire event-creation UserOp flow before verifying paymaster sponsorship works causes all integration tests to fail with cryptic bundler errors.

**Why it happens:**
Developers assume the Pimlico API key alone is sufficient — it is not. The Pimlico dashboard requires a policy be created for each chain and each contract address that will be sponsored. The API key grants dashboard access; the policy grants sponsorship.

**Consequences:**
- All `sendUserOperation` calls fail with `AA31 paymaster deposit too low` or `policy not found` errors
- The error surfaces at the bundler level, not the contract level, making it look like a contract or gas issue
- Blocks the entire event creation and reward claim flows

**How to avoid:**
1. Before writing any UserOp code: create a Pimlico policy at `dashboard.pimlico.io` — set chain to Amoy (80002), whitelist `EventFactory` and `RewardsVault` contract addresses
2. Test the policy with a minimal `eth_sendUserOperation` call via curl before integrating into app code
3. Set a per-address daily spend cap in the policy to prevent runaway sponsorship costs on testnet
4. Configure separate policies for brand operations (event creation + USDC approval) vs. user operations (reward claims)

**Warning signs:**
- `pm_sponsorUserOperation` returning 400/422 before any contract simulation
- Bundler error containing `AA31` or `AA32` (paymaster rejection codes)
- Gas estimation for the UserOp returns non-zero but sponsorship still fails

**Phase to address:** Paymaster Configuration phase — must be the first sub-step of any blockchain work, before writing contract interaction code.

---

### Pitfall 3: UserOp Nonce Collisions from Parallel Sends

**What goes wrong:**
ERC-4337 smart accounts maintain their own nonce, separate from the EOA nonce. The nonce is fetched from the EntryPoint via `getNonce(account, key)`. If two UserOps are submitted in rapid succession (e.g., UI retry on network timeout, React strict mode double-invocation, or concurrent tab sessions), both may fetch the same nonce and one will be rejected with `AA25 invalid account nonce`.

**Why it happens:**
Unlike EOA nonces which nodes track, smart account nonces are fetched client-side at send time. If the first UserOp is in the mempool but not yet included in a block, a second read of `getNonce` still returns the same value. permissionless.js does not have built-in nonce locking.

**Consequences:**
- Duplicate event creation attempts where one silently fails
- User sees the loading spinner but the transaction never confirms; no error surfaced to UI
- React Strict Mode in development doubles every effect, which means two UserOps are submitted on first render for anything triggered in `useEffect`

**How to avoid:**
1. Implement a per-account nonce mutex on the client: store the last submitted nonce in a ref, increment locally, only fetch from chain if local nonce is uninitialized
2. Use `useRef` + `useCallback` to prevent double-invocation in React Strict Mode — never trigger UserOp submission from `useEffect` directly
3. Disable React Strict Mode (`<React.StrictMode>`) for components that initiate UserOp submission during development testing
4. Add idempotency: before submitting a new UserOp, check if the previous one (same eventId + same UserOp type) is still pending in the bundler

**Warning signs:**
- `AA25 invalid account nonce` errors in bundler response
- Event created twice in DB but only one on-chain pool
- UserOp receipts returning `null` for `userop_hash` lookups

**Phase to address:** Gasless Transaction Engine phase — nonce management belongs in `lib/blockchain/gasless.ts` before any UI is built on top of it.

---

### Pitfall 4: USDC Approval and createPool as Separate UserOps (Not Atomic)

**What goes wrong:**
The planned architecture calls for a single atomic UserOp bundling `approve(USDC, contractAddress, amount)` + `createPool(eventId, ...)`. If implemented as two separate UserOps instead (approve first, then createPool), a failure or timeout between the two leaves the USDC approved but the pool not created. The brand's USDC is locked in a dangling `allowance` with no corresponding pool. Worse, if the event was already created in the DB, the DB and chain are now out of sync.

**Why it happens:**
Developers prototype with two sequential `sendTransaction` calls because they are simpler to debug individually. The atomic batch gets deferred and sometimes never implemented.

**Consequences:**
- Brand cannot re-submit because `PoolAlreadyExists()` fires if DB created the event first; or pool creation succeeds but USDC was never approved so `transferFrom` in `createPool` reverts
- Refund flow is complex: dangling approvals do not auto-revert; requires explicit `approve(0)` to reset
- On-chain state diverges from DB state — the `migrateToWeb2.ts` in this codebase shows the team already hit this exact problem (DB tracking `onChainEventId` + `transactionHash` that didn't match reality)

**How to avoid:**
1. Implement the batch from day one: use `smartWalletClient.sendTransaction({ calls: [approveCall, createPoolCall] })` — Privy Smart Wallets support call arrays natively (already scaffolded in `WalletContext.sendBatchTransaction`)
2. Never write two-step UserOp flows in prototype code that will be "cleaned up later"
3. Contract-side: `createPool` should internally call `transferFrom` — so if approve is insufficient, the entire UserOp reverts atomically
4. DB event record should only be created after receiving a confirmed on-chain receipt, not before submitting the UserOp

**Warning signs:**
- DB has event with `status: 'draft'` but no corresponding on-chain pool (or vice versa)
- USDC `allowance(brandAddress, contractAddress)` is non-zero but `getPoolInfo` returns NOT_CREATED state
- Users reporting event creation spinner that never completes

**Phase to address:** Smart Contract Design phase AND Gasless Transaction Engine phase — atomicity is a contract design requirement (createPool must call transferFrom internally) and a client requirement (must use batch UserOps).

---

### Pitfall 5: EIP-712 Domain Separator Mismatch Between Contract and Backend

**What goes wrong:**
Reward claims use an EIP-712 signed message where the backend signs `(eventId, user, amount, claimType, nonce, deadline)` and the user submits this signature in a gasless UserOp to `claim()`. If the backend and contract use different domain separator parameters (name, version, chainId, or verifyingContract), `ecrecover` in the contract returns the wrong address, the contract rejects the signature with `InvalidSignature`, and claims never succeed.

**Why it happens:**
The domain separator is computed separately in the backend code and hardcoded in the Solidity contract constructor. Any drift between the two — a typo in `name`, using `chainId: 80001` (Mumbai, deprecated) instead of `80002` (Amoy), or deploying a new contract without updating `REWARDS_VAULT_ADDRESS` in `.env` — causes all signatures to fail. The existing `checkSigner.ts` and `checkSignerConfig.ts` scripts exist precisely because this happened.

**Consequences:**
- All claim transactions revert with `InvalidSignature` on-chain
- No error at signature generation time — the signature is generated successfully, it just fails on-chain
- Domain separator mismatch is entirely silent until the contract call is made

**How to avoid:**
1. Run `checkSignerConfig.ts` equivalent test immediately after every new contract deployment: compare `contract.getDomainSeparator()` with the locally-computed hash
2. Store domain separator parameters in a single shared config file used by both the deployment script and the backend signing service
3. After deployment, write the contract address to a deployment manifest that the backend reads — never hardcode or copy-paste addresses
4. Add a startup check in the backend rewards service: call `getDomainSeparator()` and compare to locally computed value; fail fast at server start if mismatched

**Warning signs:**
- `claim()` reverts on static call with `InvalidSignature` error
- `contract.backendSigner()` returns correct address but claims still fail
- `checkSignerConfig.ts` shows matching signer but mismatched domain separator

**Phase to address:** Smart Contract Deployment phase — domain configuration must be verified before any signing code is written.

---

### Pitfall 6: Polygon Amoy RPC Instability Blocking Development

**What goes wrong:**
Polygon Amoy's public RPC (`https://rpc-amoy.polygon.technology`) has documented reliability issues: rate limiting, intermittent 503 errors, and occasional slow block times (>5s). All blockchain operations — balance reads, transaction submission, receipt polling — depend on this endpoint. When it is unreliable, it is impossible to tell whether failures are code bugs or RPC issues.

**Why it happens:**
Testnet RPCs are not production infrastructure. The public Amoy RPC has no SLA. Pimlico's bundler also has its own RPC connection to Amoy — if the RPC is slow, bundler transaction inclusions slow down too.

**Consequences:**
- `waitForTransactionReceipt` times out → code assumes failure, DB marks transaction as failed, but block explorer shows it succeeded
- Development velocity collapses when RPC is down — no way to test anything
- False positives in integration tests that look like contract bugs

**How to avoid:**
1. Add a fallback RPC: use Alchemy or QuickNode for Polygon Amoy as the primary, keep the public RPC as fallback
2. Never use `waitForTransactionReceipt` with a timeout below 60 seconds on Amoy — blocks can be slow
3. Always verify failures independently on `amoy.polygonscan.com` before debugging code
4. Add a health-check function: before any UserOp submission, call `eth_blockNumber` and if it fails or returns stale data, surface "Network unstable" to the user rather than letting the UserOp fail silently

**Warning signs:**
- `eth_sendRawTransaction` returns 503 intermittently
- `waitForTransactionReceipt` consistently times out but transactions appear on-chain afterward
- Pimlico bundler returns `timeout` errors without an `AA` error code

**Phase to address:** Blockchain Abstraction Layer phase — the `lib/blockchain/client.ts` module must handle RPC fallback and retry logic before anything builds on top of it.

---

### Pitfall 7: Smart Account Not Deployed at Time of First UserOp (Initcode Missing)

**What goes wrong:**
Privy smart accounts (ERC-4337 SimpleAccount / Kernel) are counterfactually deployed — the address is deterministic before deployment, but the contract bytecode only lands on-chain with the first UserOp that includes `initCode`. If a brand's smart account is not yet deployed and a UserOp is submitted without `initCode`, the bundler returns `AA20 account not deployed` and the operation fails.

**Why it happens:**
permissionless.js and Privy's `SmartWalletsProvider` handle initCode automatically for new accounts — but only when the full stack is correctly configured with the bundler URL and paymaster. If the paymaster is not sponsoring the deployment gas (the first UserOp's initCode execution costs extra gas), the entire deployment fails. Developers often test with accounts that were deployed in a previous session and miss this on fresh accounts.

**Consequences:**
- New user (first login, never transacted) cannot create events or claim rewards
- Error only manifests for brand-new smart accounts; existing accounts work fine → creates a "works for me" debugging nightmare
- If the factory address in permissionless.js config does not match Pimlico's expected factory for that chain, the counterfactual address differs and account is permanently broken

**How to avoid:**
1. Before any UserOp submission, call `publicClient.getBytecode({ address: smartAccountAddress })` — if it returns `undefined` or `0x`, the account is not deployed and the first UserOp must include initCode
2. Ensure Pimlico policy covers account factory deployment costs (the first UserOp for any new account will be more expensive)
3. Test with a genuinely fresh Privy account (create new email, log in for first time) as part of integration testing
4. Verify the factory address in permissionless.js config matches the factory address registered in the Pimlico policy

**Warning signs:**
- `AA20 account not deployed` from bundler
- `smartWalletClient.account.address` resolves but `publicClient.getBytecode(address)` returns `undefined`
- Error only occurs for users who have never sent a transaction before

**Phase to address:** Gasless Transaction Engine phase — the `gasless.ts` module must detect and handle undeployed accounts before submission.

---

### Pitfall 8: USDC Decimal Confusion (6 vs 18 decimals)

**What goes wrong:**
USDC uses 6 decimal places, not 18. If `parseEther("10")` (which gives `10 * 10^18`) is used instead of `parseUnits("10", 6)` (which gives `10 * 10^6`) when encoding the USDC amount for approval or pool creation, the contract receives an astronomically large amount. For approval, this may silently succeed (ERC-20 allows any uint256 approval). For `transferFrom`, the contract will attempt to move more USDC than exists, causing `ERC20: transfer amount exceeds balance` revert.

**Why it happens:**
`viem`'s `parseEther` is convenient and familiar. The 6-decimal USDC quirk is easily forgotten, especially when switching between MATIC (18 decimals) and USDC in the same codebase. The existing codebase correctly uses `parseUnits(amount.toString(), 6)` in `blockchain.ts` but the `refreshBalance` function in `WalletContext.tsx` divides by `1_000_000` to convert — this pattern must be applied consistently everywhere.

**Consequences:**
- Approval succeeds but pool creation reverts — the UI shows "approving USDC" step completing but "locking pool" step failing
- If parsing is reversed (parsing USDC as 18 decimals), `1 USDC` becomes `0.000000000001 USDC` on-chain — silent under-funding

**How to avoid:**
1. Create a single `USDC_DECIMALS = 6` constant in `lib/blockchain/contracts.ts` — import it everywhere, never hardcode 6 or 18
2. Write a unit test: `parseUsdc(10)` must equal `BigInt(10_000_000)` — run it as part of CI
3. Audit every `parseEther` call in blockchain-related files and replace with `parseUnits(amount, USDC_DECIMALS)`
4. Add a contract-side sanity check: if the deposited amount is > 1,000,000 USDC (i.e., > 10^12 in raw form) the pool creation should revert — prevents catastrophic over-approval bugs

**Warning signs:**
- Pool creation reverts with `ERC20InsufficientBalance` even though the brand has USDC
- `balanceOf` on the smart account shows correct USDC but `allowance` shows a number with 12+ digits
- `formatUsdc(rawAmount)` returns a value with many leading zeros

**Phase to address:** Smart Contract Design phase AND Blockchain Abstraction Layer phase — both layers must enforce the correct decimal handling.

---

### Pitfall 9: Privy SmartWalletsProvider Configuration Missing or Misconfigured

**What goes wrong:**
`useSmartWallets()` returns `{ client: null }` if `SmartWalletsProvider` is not wrapping the component tree, or if the Privy app has smart wallets disabled in the dashboard, or if the bundler/paymaster URL is not passed to `SmartWalletsProvider`. Since the current `ClientProviders.tsx` wraps with `SmartWalletsProvider` but without explicit bundler config, it relies on Privy's default bundler — which may not use Pimlico for Polygon Amoy.

**Why it happens:**
`SmartWalletsProvider` without explicit `bundlerUrl` and `paymasterUrl` uses Privy's own bundler (not Pimlico). Privy's bundler may not have a sponsorship policy for Amoy, causing all UserOps to fail with gas payment errors. Developers see `smartWalletClient` as non-null and assume the configuration is correct.

**Consequences:**
- `sendTransaction` works but is NOT gasless — the smart account must pay its own gas, which it cannot do if it has no MATIC
- All brand UserOps fail with `AA21 didn't pay prefund` on Pimlico's bundler
- The Pimlico API key configured in env is never used because the wrong bundler is being targeted

**How to avoid:**
1. Pass explicit `bundlerUrl` and `paymasterUrl` to `SmartWalletsProvider`:
   - Bundler: `https://api.pimlico.io/v2/80002/rpc?apikey=<PIMLICO_API_KEY>`
   - Paymaster: `https://api.pimlico.io/v2/80002/rpc?apikey=<PIMLICO_API_KEY>`
2. Verify by checking the UserOp receipt's `paymasterAndData` field — it should not be `0x` for sponsored ops
3. Log the bundler URL being used at startup in development
4. Test with a Pimlico dashboard "UserOp Explorer" search — verify that submitted UserOps appear there (they won't if using the wrong bundler)

**Warning signs:**
- `smartWalletClient` is non-null but `sendTransaction` requires native token gas
- `AA21 didn't pay prefund` errors despite Pimlico policy being configured
- UserOps do not appear in Pimlico's dashboard explorer after submission

**Phase to address:** Paymaster Configuration phase — must be verified before the Gasless Transaction Engine phase begins.

---

### Pitfall 10: Off-Chain Vote Integrity When On-Chain Settlement Happens Later

**What goes wrong:**
The architecture uses off-chain votes with on-chain settlement. If the backend processes rewards based on a vote snapshot at event completion time, but users can still vote between the snapshot and the settlement transaction (due to async processing), some votes are counted in the DB but not credited on-chain. Alternatively, if the settlement transaction fails and is retried, vote counts may be double-counted.

**Why it happens:**
The async gap between `event.status = 'COMPLETED'` (DB write) and `creditRewardsBatch(...)` (on-chain transaction) creates a window where DB state and on-chain state diverge. The longer Amoy takes to include the settlement transaction, the larger this window.

**Consequences:**
- Users who voted in the gap receive rewards on-chain for votes that aren't in the DB record used for calculation
- Settlement transaction retry (after RPC timeout) re-credits already-credited users
- Leaderboard shows incorrect earnings until chain confirmation

**How to avoid:**
1. When setting `event.status = 'COMPLETED'`, simultaneously set `allowVoting = false` and `votingLockedAt = NOW()` in the same DB transaction
2. Use `event.votingLockedAt` timestamp as the canonical cutoff for reward calculation — only count votes with `createdAt < votingLockedAt`
3. Make `creditRewardsBatch` on the contract idempotent: track `eventFinalized[eventId]` boolean and revert if called twice
4. Never retry settlement without first checking if the previous transaction was included — check `getPoolInfo(eventId).state` before re-submitting

**Warning signs:**
- `RewardsPool.status = ACTIVE` but `event.status = COMPLETED` with no pending settlement
- Users reporting different reward amounts than the leaderboard shows
- On-chain `totalDisbursed` is double the expected amount

**Phase to address:** Reward Settlement phase — the settlement trigger in `rewardsController.ts` must lock votes atomically with event completion.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding contract addresses in `.env` | Fast during dev | Breaks silently on redeployment; mismatch causes all claim signatures to fail | Never — use a deployment manifest |
| Using `any` type for `smartWalletClient` (current `WalletContext.tsx:58`) | Avoids fighting TS types | UserOp encoding errors only surface at runtime, not build time | During initial prototyping only |
| Public Amoy RPC without fallback | Zero config | RPC outages block all development and all users | Never in integration testing or beyond |
| Two-step approve+createPool instead of atomic batch | Easier to debug individually | Partial state on failure; requires refund flow complexity | Never — atomicity is the entire UX promise |
| Storing EOA address as `user.walletAddress` initially | Simple login flow | Reward claims to wrong address; manual DB fixes required | Never — always store smart account address |
| Skipping `simulateContract` before `writeContract` | Fewer round trips | Silent reverts cost gas, confuse users, and leave DB in bad state | Never for user-facing flows |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Pimlico bundler | Using v1 API path (`/v1/`) | Use `/v2/` — v1 is deprecated for Amoy |
| Pimlico paymaster | Not setting `verificationGasLimit` in sponsorship request | Let permissionless.js estimate it, or add 20% buffer |
| Privy SmartWalletsProvider | No `bundlerUrl` → uses Privy's bundler, not Pimlico | Explicitly pass `bundlerUrl: pimlicoBundlerUrl` in provider config |
| Polygon Amoy USDC | Using Ethereum Mainnet USDC address | Amoy USDC (test token) has a different address — source from Pimlico's supported tokens list |
| `waitForUserOperationReceipt` | Default timeout too short for Amoy | Set `timeout: 60_000` minimum; Amoy block times are variable |
| EIP-712 signing | Using `ethers.signTypedData` in backend but `viem.signTypedData` in contract tests | Ensure the same ABI encoding is used; they produce the same output but type coercions differ |
| permissionless.js UserOp | Not waiting for full account initialization before reading address | `client.account.address` may be the factory address until initialized — wait for `isDeployed()` |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `waitForTransactionReceipt` in API request handler | API request times out (30s default) before Amoy confirms block | Send UserOp → return immediately with `userOpHash` → poll confirmation separately | Every request on slow Amoy days |
| Polling `getAccumulatedRewards` for every user on leaderboard page | 1 RPC call per user → 100 users = 100 RPC calls, hits rate limit | Batch via `Multicall3` or cache on-chain balances in DB, refresh periodically | >20 concurrent users |
| Fetching UserOp status via `eth_getUserOperationReceipt` per-user | Bundler rate limits | Cache pending UserOp hashes server-side; use webhook if Pimlico supports it | >50 concurrent active claims |
| Re-creating `PublicClient` on every render | Memory leak, new connections per render | Singleton in context (current `WalletContext` does this correctly with `useMemo`) | Development hot-reload |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Backend signer private key in git or `.env` without rotation | Full contract compromise — attacker can sign arbitrary claim amounts | Store in secret manager (Vault, AWS Secrets Manager); never commit; rotate after any exposure |
| No claim nonce tracking → replay attacks | User can resubmit a valid signature to claim twice | Contract must increment `nonces[user]` after each claim; backend must verify nonce before signing |
| No deadline on signed claims | Signature valid forever; if leaked, can be used anytime | Enforce `deadline: now + 1 hour` and validate `block.timestamp < deadline` in contract |
| Pimlico API key in client-side code | Anyone can sponsor arbitrary UserOps, drain paymaster balance | Pimlico API key must be backend-only; client submits UserOps via a backend relay endpoint |
| No maximum claim amount check in contract | Rounding errors in reward calculation could allow over-claim | Contract `claim()` must verify `amount <= accumulatedRewards[user]` before transferring |
| Admin UI using hardcoded `admin:admin` Basic Auth | Trivially bypassed in production | Acceptable for demo; must be replaced with proper auth before any real USDC is involved |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing blockchain jargon on error ("AA25 invalid account nonce") | Users panic, abandon flow | Map all bundler/contract error codes to human-readable messages in `lib/blockchain/errors.ts` |
| No progress state during 15-60s UserOp confirmation | Users click the button again (nonce collision), assume it's broken | Step indicator modal with "Waiting for confirmation..." that polls `getUserOperationReceipt` |
| Blocking UI during reward claim (modal can't be closed) | Frustrating if Amoy is slow | Allow modal dismissal with background confirmation; notify via toast when confirmed |
| Refreshing balance immediately after UserOp submit | Shows stale balance (tx not confirmed) | Poll balance only after `waitForUserOperationReceipt` resolves |
| Displaying raw `0x...` transaction hash as primary feedback | Users don't know what to do with it | Show it only in expandable "Details" section, primary feedback is the action result |
| Generic "Transaction Failed" with no recovery path | User stuck with no next step | Distinguish: paymaster rejection (policy issue, contact support) vs. contract revert (retry) vs. RPC timeout (try again) |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Gasless event creation:** Pimlico policy must be configured for Amoy chainId 80002 AND the EventFactory contract address — verify by sending a test UserOp before building the UI
- [ ] **USDC approval flow:** The approval and createPool must be in the same UserOp batch — verify by checking that a failed createPool causes the approval to revert (i.e., no dangling allowance)
- [ ] **Smart account address sync:** After login, `user.walletAddress` in DB must be the smart account address — verify by calling `publicClient.getBytecode(walletAddress)` and confirming it returns contract code (not `undefined`)
- [ ] **Reward claim signature:** Run `checkSignerConfig` equivalent after every contract redeployment — `contract.getDomainSeparator()` must match locally computed separator exactly
- [ ] **Off-chain voting lock:** When event completes, `allowVoting = false` must be set atomically with vote snapshot — verify no votes accepted after `votingLockedAt`
- [ ] **Amoy RPC fallback:** The `lib/blockchain/client.ts` must handle RPC 503 — verify by temporarily pointing to a dead URL and confirming graceful degradation
- [ ] **New user first transaction:** Test with a genuinely fresh Privy account — confirm the first-ever UserOp deploys the smart account (initCode) AND is sponsored by Pimlico
- [ ] **USDC decimal encoding:** `parseUsdc(10)` must equal `BigInt(10_000_000)` — add this as an automated test

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| EOA address stored instead of smart account | HIGH | Run `updateUserWallet.ts` for each affected user; re-run reward distribution with corrected addresses; requires user to log back in to surface their smart account address |
| Dangling USDC approval (approve succeeded, createPool failed) | LOW | Call `approve(contractAddress, 0)` from the brand's smart account to reset allowance; no DB changes needed |
| Domain separator mismatch on deployed contract | CRITICAL | Redeploy the contract with the correct domain parameters; update `REWARDS_VAULT_ADDRESS` in all `.env` files; re-run `checkSignerConfig`; lost any existing on-chain pools |
| Double-credited rewards (settlement retry) | HIGH | Manual DB correction + contact affected users; requires adding `eventFinalized` guard to contract in next deployment |
| Pimlico paymaster policy exhausted | MEDIUM | Add funds to Pimlico dashboard account or update policy limits; all user-facing actions blocked until resolved |
| Polygon Amoy chain reset/reorg | HIGH | Amoy is a testnet; treat all contract deployments as ephemeral; maintain deployment scripts that can redeploy in <30 minutes |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| EOA vs Smart Account address | Blockchain Abstraction Layer | `getBytecode(user.walletAddress)` returns contract bytecode for all users |
| Paymaster policy not configured | Paymaster Configuration (pre-code) | Test UserOp via curl succeeds before writing app code |
| UserOp nonce collisions | Gasless Transaction Engine | Stress test: submit 3 UserOps rapidly from same account, all succeed |
| Non-atomic approve+createPool | Smart Contract Design + Transaction Engine | Simulate failed createPool, verify no dangling allowance |
| EIP-712 domain separator mismatch | Smart Contract Deployment | `checkSignerConfig` script passes after every redeployment |
| Polygon Amoy RPC instability | Blockchain Abstraction Layer | Chaos test: point to dead RPC, verify graceful degradation |
| Smart account not deployed (initCode) | Gasless Transaction Engine | Fresh account first-UserOp test passes |
| USDC 6-decimal confusion | Smart Contract Design | Unit test `parseUsdc(10) === BigInt(10_000_000)` in CI |
| SmartWalletsProvider misconfiguration | Paymaster Configuration | Pimlico dashboard shows UserOps from app |
| Vote integrity during settlement | Reward Settlement | Vote after `votingLockedAt` is rejected; settlement retry is idempotent |

---

## Sources

- **Primary source (HIGH confidence):** Live codebase at `/home/manov/Desktop/code/aris-design/server/src/scripts/archive-web3-tests/` — archived test scripts documenting real failures from a previous Web3 implementation attempt on this exact project
- **Primary source (HIGH confidence):** `server/src/scripts/diagnoseRewards.ts` — documents EOA/SmartAccount mismatch as a known, observed failure mode with `ZERO_ONCHAIN` diagnostic status
- **Primary source (HIGH confidence):** `server/src/scripts/migrateToWeb2.ts` — proves the project previously had full on-chain integration (with `onChainEventId`, `transactionHash`, `signature`, `signatureExpiry` DB fields) and migrated away from it due to complexity; all ERC-4337 pitfalls below map to why that migration happened
- **Primary source (HIGH confidence):** `server/src/scripts/archive-web3-tests/checkSignerConfig.ts` and `checkSigner.ts` — domain separator mismatch was a real, previously encountered bug requiring diagnostic tooling
- **Architecture source (HIGH confidence):** `client/context/WalletContext.tsx` — current implementation shows the EOA vs smart account address split and the `any` type on `smartWalletClient`
- **ERC-4337 spec (HIGH confidence):** EIP-4337 error codes AA20–AA33 are standardized — `AA20` (not deployed), `AA21` (didn't pay prefund), `AA25` (invalid nonce), `AA31` (paymaster deposit low), `AA32` (paymaster expired) — these error codes are implementation-independent
- **Pimlico documentation (MEDIUM confidence, accessed from training data):** Pimlico v2 bundler endpoint pattern, policy configuration requirements, and verifying paymaster API — recommend verifying against `docs.pimlico.io` during implementation
- **permissionless.js patterns (MEDIUM confidence, training data):** Smart account deployment initCode behavior, nonce handling, and `SmartWalletsProvider` configuration — recommend cross-checking against Context7 or official permissionless.js docs during implementation

---

*Pitfalls research for: ERC-4337 gasless Web3 platform — Pimlico + Privy + Polygon Amoy*
*Researched: 2026-03-03*
