# Stack Research

**Domain:** ERC-4337 Gasless Transactions — Web3 Creator Competition Platform
**Researched:** 2026-03-03
**Confidence:** HIGH (verified from installed node_modules source, .env files, and contract ABIs)

---

## Context: This Is a Brownfield Project

Auth is complete. The installed packages and deployed contracts define hard constraints. Research
findings are derived from the actual installed source code, not documentation guesses.

---

## Recommended Stack

### Core Blockchain Libraries (Already Installed, Lock Verified)

| Technology | Installed Version | Purpose | Why |
|------------|------------------|---------|-----|
| `permissionless` | 0.3.4 | ERC-4337 smart account client + Pimlico actions | Pimlico's own library; `createPimlicoClient`, `sponsorUserOperation`, batch UserOp support. Default EntryPoint is v0.7 (hardcoded in source). |
| `viem` | 2.46.3 | Low-level Ethereum interaction, ABI encoding, public client | permissionless peer dep; provides `entryPoint07Address`, `sendUserOperation`, `waitForUserOperationReceipt`. Both are required. |
| `@privy-io/react-auth` | 3.14.1 | Privy embedded wallets + SmartWalletsProvider | Internally uses permissionless 0.3.x + createPimlicoClient. Bundles all ERC-4337 wiring when configured via dashboard. |

### EntryPoint Version: Use v0.7

**Verified from source:** `permissionless/_esm/clients/pimlico.js` imports `entryPoint07Address` from `viem/account-abstraction` as the default. The Privy internals (`smart-wallets-DOAgnxKI.mjs`) set `A = { address: entryPoint07Address, version: "0.7" }` for Safe, Kernel, Thirdweb smart account types.

**EntryPoint addresses (from `viem/account-abstraction/constants/address.js`, verified):**

| Version | Address | Use |
|---------|---------|-----|
| v0.6 | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` | Legacy. Used only for Biconomy and LightAccount v1.x in Privy. |
| **v0.7** | **`0x0000000071727De22E5E9d8BAf0edAc6f37da032`** | **Default for all new accounts. Use this.** |
| v0.8 | `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108` | Too new; not yet in Pimlico production. |

**Use v0.7.** Pimlico's Polygon Amoy infrastructure is live for v0.7. v0.6 is deprecated and the Privy `SmartWalletsProvider` uses v0.7 for the Smart Account types relevant to this project (Safe is the standard default).

### Pimlico Bundler + Paymaster Configuration

**Key insight from source code inspection:** The `bundlerUrl` and `paymasterUrl` for `SmartWalletsProvider` are configured in the **Privy Dashboard**, not in code. The `SmartWalletsProvider` `config` prop only accepts `paymasterContext`. This is an internal type:

```typescript
// From @privy-io/react-auth/dist/dts/types-CIvz-X6P.d.ts
type SmartWalletNetworkConfig = {
  chainId: string;    // "eip155:80002" for Polygon Amoy
  bundlerUrl: string; // Set in Privy Dashboard
  paymasterUrl?: string; // Set in Privy Dashboard
  paymasterContext?: AlchemyPaymasterContextClient | BiconomyPaymasterContext;
};
```

**Dashboard configuration (required before any gasless tx works):**
- Log into Privy Dashboard → App Settings → Smart Wallets → Enable for Polygon Amoy
- Set Bundler URL: `https://api.pimlico.io/v2/80002/rpc?apikey=pim_EUHoE84PA87vUFGYGNemv2`
- Set Paymaster URL: `https://api.pimlico.io/v2/80002/rpc?apikey=pim_EUHoE84PA87vUFGYGNemv2`
- Set Smart Wallet Type: **Safe** (uses EntryPoint v0.7, ERC-7579 module-compatible, 1.4.1)

**For direct permissionless.js usage (lib/blockchain/ abstraction layer):**
```typescript
// Bundler + Paymaster client (from createPimlicoClient source)
const pimlicoClient = createPimlicoClient({
  transport: http("https://api.pimlico.io/v2/80002/rpc?apikey=pim_EUHoE84PA87vUFGYGNemv2"),
  entryPoint: {
    address: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",  // entryPoint07Address
    version: "0.7"
  }
})
```

**Endpoint URL format for Polygon Amoy (chainId 80002):**
```
https://api.pimlico.io/v2/80002/rpc?apikey={API_KEY}
```
This single URL serves as both bundler and paymaster RPC. The methods `pm_sponsorUserOperation` and `eth_sendUserOperation` both route to the same endpoint.

### USDC on Polygon Amoy

**From server/.env and client/.env.local (deployed and in use):**

| Token | Address | Status |
|-------|---------|--------|
| Test USDC (Amoy) | `0x61d11C622Bd98A71aD9361833379A2066Ad29CCa` | Deployed, used in `NEXT_PUBLIC_TEST_USDC_ADDRESS` |
| RewardsVaultV3 | `0x34C5A617e32c84BC9A54c862723FA5538f42F221` | Deployed, existing contract |
| Treasury | `0x2D4575003f6017950C2f7a10aFb17bf2fBb648d2` | Deployed |

**MEDIUM confidence note:** The USDC at `0x61d11C622Bd98A71aD9361833379A2066Ad29CCa` is confirmed as used in the project but may be a custom test token, not Circle's official USDC testnet deployment. Circle's official USDC on Amoy is `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` (training data — LOW confidence, verify on https://amoy.polygonscan.com). For the project, use the address already in `.env` since the RewardsVaultV3 contract is already deployed against it.

### BatchUserOp: Multiple Calls in One UserOp

**Verified from permissionless source:** `sendTransaction.js` in permissionless converts a single `{ to, data, value }` call into `calls: [...]` for `sendUserOperation`. For multi-call batching, pass `calls` directly:

```typescript
// Pattern for approve + createEvent as single atomic UserOp
// (via Privy's smartWalletClient.sendTransaction with calls array)
const hash = await smartWalletClient.sendTransaction({
  calls: [
    { to: USDC_ADDRESS, data: encodeApproveData(...), value: 0n },
    { to: VAULT_ADDRESS, data: encodeCreateEventData(...), value: 0n }
  ]
})

// This is what the Privy SmartWalletsProvider wraps in its sendTransaction:
// "calls" in args && void 0 !== args.calls → l = [...args.calls]
// It then calls n.sendTransaction({ callData: t, ... })
```

**Source verified:** From `smart-wallets-DOAgnxKI.mjs`, the wrapped `sendTransaction` explicitly handles the `calls` array pattern.

### Smart Contract Layer (Server-Side)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `ethers` | (installed server) | ABI encoding, contract interaction for backend signer | Already used in `lib/blockchain.ts` for `eventIdToBytes32`, `formatUnits`. |
| `viem` (server-side) | (via direct import) | `createWalletClient`, `createPublicClient` for backend signer | Already used in `lib/blockchain.ts`. Keep ethers for compat, add viem for new code. |

**Note:** The existing `RewardsVaultV3.json` ABI covers `creditRewardsBatch`, `cancelEvent`, `getBrandRefundBalance`. A new `EventFactory` or event creation function on the vault needs to be designed — this is missing from the current contract.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `viem/account-abstraction` | (from viem 2.46.3) | `entryPoint07Address`, `sendUserOperation`, `waitForUserOperationReceipt`, `toSafeSmartAccount` | All ERC-4337 operations |
| `permissionless/clients/pimlico` | (from permissionless 0.3.4) | `createPimlicoClient` | Paymaster + bundler client |
| `permissionless/accounts` | (from permissionless 0.3.4) | `toSafeSmartAccount`, `toKernelSmartAccount` | Only if bypassing Privy's SmartWalletsProvider |
| `@privy-io/react-auth/smart-wallets` | (from @privy-io/react-auth 3.14.1) | `SmartWalletsProvider`, `useSmartWallets` | Primary interface for all client-side UserOps |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Hardhat | Smart contract compilation + deployment | `RewardsVaultV3.json` uses `hh-sol-artifact-1` format — confirms Hardhat was used |
| Polygon Amoy Faucet | Test MATIC for gas (paymaster covers user gas but backend signer needs MATIC) | https://faucet.polygon.technology/ |
| Pimlico Dashboard | Configure sponsorship policies, spending limits per address | dashboard.pimlico.io |
| amoy.polygonscan.com | Verify contracts, trace UserOps | Only explorer for Amoy |

---

## Installation

Nothing new required. All blockchain packages are already installed. Configuration is the blocker.

```bash
# Already installed — no new packages needed
# permissionless@0.3.4, viem@2.46.3, @privy-io/react-auth@3.14.1

# Server side needs hardhat only if redeploying contracts
cd server && npm install -D hardhat @nomicfoundation/hardhat-toolbox
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| EntryPoint v0.7 | v0.6 | v0.6 is in legacy mode on Pimlico; Privy Smart Wallets defaults to v0.7 for Safe/Kernel. Using v0.6 would break the Privy integration. |
| Pimlico via Privy Dashboard config | Direct permissionless.js without Privy | Would require bypassing `SmartWalletsProvider` and rebuilding the entire smart account client from scratch. Privy already handles key management, signing, and Smart Account creation. Adding paymaster on top is the only missing piece. |
| Safe (v1.4.1) as smart account type | Kernel v0.3.1 or LightAccount | Privy dashboard defaults to Safe for new apps. Safe supports ERC-7579 modules and multi-call batching natively. Match the dashboard type to avoid smart account address mismatch. |
| `SmartWalletsProvider` with `paymasterContext` | Manual `createSmartAccountClient` | SmartWalletsProvider already manages account initialization, chain switching, and UI modals. Manual approach duplicates ~200 lines of Privy's internal code. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `permissionless` v0.2.x | Breaking API changes in v0.3.x; `createPimlicoClient` API changed. Privy requires `^0.2.47` but the installed 0.3.4 takes precedence. | Stay on 0.3.4 — it is installed and Privy's peer dep is met. |
| EntryPoint v0.6 for new functionality | Pimlico is deprecating v0.6 support incrementally; return type differs (`paymasterAndData` vs `paymaster + paymasterData`). | Use v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`). |
| EntryPoint v0.8 | Not yet in Pimlico production for Amoy. Too early. | v0.7. |
| `wagmi`'s `useWriteContract` for gasless | Wagmi sends raw EOA transactions, not UserOperations. No paymaster support. | `smartWalletClient.sendTransaction` with `calls` array from `useSmartWallets()`. |
| Custom USDC address vs existing `.env` address | RewardsVaultV3 is deployed with `0x61d11C622Bd98A71aD9361833379A2066Ad29CCa` as the token. Changing it requires redeploying the vault. | Use the address in `.env` files. |
| `ethers.js` for new client-side code | Creates a viem/ethers split that complicates types. ethers is already on server for legacy compat. | viem on client side (already established). Server can keep ethers for existing functions. |
| Direct Pimlico API key in client code | API key is already in `NEXT_PUBLIC_PIMLICO_API_KEY` but should be treated as semi-public (Pimlico allows spend limits via dashboard policies). | Configure a spending policy on Pimlico dashboard. The key exposure is acceptable for testnet; on mainnet, use a server-proxied paymaster endpoint. |

---

## Stack Patterns by Variant

**If using Privy's SmartWalletsProvider (recommended path):**
- Configure bundlerUrl + paymasterUrl in Privy Dashboard for chain `eip155:80002`
- Use `useSmartWallets()` → `client.sendTransaction({ calls: [...] })`
- Pass `paymasterContext: { sponsorshipPolicyId: "..." }` to `SmartWalletsProvider` if using policy-scoped sponsorship
- Zero additional code outside of dashboard configuration

**If building `lib/blockchain/gasless.ts` abstraction for direct permissionless use:**
- `createPimlicoClient` with Amoy RPC endpoint
- `createSmartAccountClient` with `toSafeSmartAccount` + `paymaster: pimlicoClient`
- Use `sendUserOperation({ calls: [...] })` for batch operations
- This bypasses Privy's UI modals — appropriate for headless background operations

**If event creation needs to be atomic (approve USDC + createEvent):**
- Use the `calls` array pattern with `smartWalletClient.sendTransaction`
- Both calls are ABI-encoded with `encodeFunctionData` from viem
- Safe smart account natively supports multi-call via its `execTransaction` mechanism
- No separate ERC-7579 module required for simple multi-call batching

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `permissionless@0.3.4` | `viem@^2.44.4` | Both installed, compatible. Privy's peer dep is `^0.2.47` but 0.3.4 satisfies it. |
| `@privy-io/react-auth@3.14.1` | `permissionless@^0.2.47` (optional peer) | 0.3.4 satisfies this. The `smart-wallets-DOAgnxKI.mjs` imports from `permissionless/accounts` and `permissionless/clients/pimlico` — all present in 0.3.4. |
| `viem@2.46.3` | `permissionless@0.3.4` | permissionless peer dep is `^2.44.4`. 2.46.3 satisfies. |
| Privy Dashboard Smart Wallets | EntryPoint v0.7 | Dashboard must be set to Safe (v1.4.1) to match the v0.7 default used by permissionless internals. |

---

## Critical Configuration Steps (Not Code)

These are blocking issues that must be resolved before any gasless transaction can work:

1. **Privy Dashboard → Smart Wallets → Enable for chain `eip155:80002` (Polygon Amoy)**
2. **Set Bundler URL:** `https://api.pimlico.io/v2/80002/rpc?apikey=pim_EUHoE84PA87vUFGYGNemv2`
3. **Set Paymaster URL:** `https://api.pimlico.io/v2/80002/rpc?apikey=pim_EUHoE84PA87vUFGYGNemv2`
4. **Set Smart Wallet Type:** Safe (v1.4.1) — matches EntryPoint v0.7
5. **Pimlico Dashboard → Create Sponsorship Policy** for the Amoy API key with a USDC allowlist or per-address spend limit
6. **Fund the Pimlico Verifying Paymaster** — Pimlico requires a pre-funded balance in their paymaster contract; done via their dashboard

Without steps 1-4, `useSmartWallets().client` will be `undefined` and all `sendTransaction` calls will fail silently.

---

## Sources

- `client/node_modules/permissionless/package.json` — Version 0.3.4, author Pimlico
- `client/node_modules/permissionless/_esm/clients/pimlico.js` — Default entryPoint07Address verified
- `client/node_modules/permissionless/_types/actions/pimlico/sponsorUserOperation.d.ts` — v0.6 vs v0.7 return type differences confirmed
- `client/node_modules/permissionless/_types/types/pimlico.d.ts` — `pm_sponsorUserOperation` RPC schema
- `client/node_modules/viem/_esm/account-abstraction/constants/address.js` — EntryPoint addresses (HIGH confidence)
- `client/node_modules/@privy-io/react-auth/dist/dts/smart-wallets.d.ts` — `SmartWalletsProviderProps` type (paymasterContext only, no paymasterUrl)
- `client/node_modules/@privy-io/react-auth/dist/dts/types-CIvz-X6P.d.ts` — `SmartWalletNetworkConfig` with bundlerUrl/paymasterUrl
- `client/node_modules/@privy-io/react-auth/dist/esm/smart-wallets-DOAgnxKI.mjs` — Internal Privy smart wallet wiring, Safe type uses A={address:entryPoint07Address,version:"0.7"}
- `server/src/lib/blockchain.ts` — Existing server-side viem + ethers usage pattern
- `server/.env` — `TEST_USDC_ADDRESS=0x61d11C622Bd98A71aD9361833379A2066Ad29CCa`, `REWARDS_VAULT_ADDRESS=0x34C5A617e32c84BC9A54c862723FA5538f42F221`
- `client/.env.local` — `NEXT_PUBLIC_PIMLICO_API_KEY=pim_EUHoE84PA87vUFGYGNemv2`
- `client/bun.lock` — Exact resolved versions: permissionless@0.3.4, viem@2.46.3

---
*Stack research for: ERC-4337 gasless transactions on Polygon Amoy with Privy + Pimlico*
*Researched: 2026-03-03*
