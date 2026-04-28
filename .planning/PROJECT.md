# Aris

## What This Is

Aris is a Web3 creative competition platform where brands launch campaigns with USDC reward pools, creators submit text+media posts, and the community votes for the best. The entire blockchain layer is invisible to users — gasless transactions, embedded wallets, no signing pop-ups. It looks and feels like a fintech product, not a dApp.

## Core Value

Brands can activate creator communities with real USDC rewards in one click — and creators never touch a wallet UI.

## Requirements

### Validated

- ✓ Privy auth with embedded wallet creation on login — existing
- ✓ Role selection (user / brand) on register — existing
- ✓ User and brand onboarding flows — existing
- ✓ Brand application → admin approval → claim flow — existing
- ✓ Socket.io real-time notifications — existing
- ✓ Leaderboard page — existing
- ✓ Event listing and status tracking — existing (partial)

### Active

- [ ] Privy auth fully hardened (privyId stored, JWT verified, no duplicate users, nonce/signature logic removed)
- [ ] Clean auth loading states and redirect flow (no popup flicker, smooth role detection)
- [ ] `lib/blockchain/` abstraction layer (client.ts, contracts.ts, gasless.ts)
- [ ] Pimlico paymaster configured with Polygon Amoy policy
- [ ] Smart contracts written and deployed to Polygon Amoy (80002)
- [ ] Event creation: one-click, gasless, atomic UserOp (approve USDC + createEvent bundled)
- [ ] Event creation step indicator modal (Preparing → Approving USDC → Locking pool → Activated)
- [ ] Brand pre-funds embedded wallet with USDC to cover reward pools
- [ ] Voting: off-chain, optimistic update with instant feedback and rollback on failure
- [ ] Reward claim: gasless, animated UX (earnings summary → balance count-up → confetti → step indicator)
- [ ] No wallet address, chain ID, or contract jargon ever visible to users

### Out of Scope

- Mobile app — web-first
- Multi-chain — Polygon Amoy only for this milestone
- Fiat-to-USDC onramp — brand pre-funds embedded wallet directly
- External wallet (MetaMask/Coinbase) integration — embedded wallet only
- Custom platform ERC-20 token — USDC as the sole reward token
- Raw transaction hash visible by default — hash in expandable "Details" only

## Context

- **Chain**: Polygon Amoy (chainId 80002)
- **Wallet infra**: Privy embedded wallets (ERC-4337 smart accounts via permissionless.js)
- **Paymaster**: Pimlico (API key: `pim_EUHoE84PA87vUFGYGNemv2`) — not yet configured, policies need setup
- **Smart contracts**: Not yet deployed — need to write + deploy EventFactory + Rewards contracts
- **USDC**: Brand pre-funds their Privy smart account, contract calls flow from there
- **Backend**: Auth endpoints complete; event/voting endpoints partially built
- **UserOperation bundling**: approve() + createEvent() as single atomic UserOp (no two-step signing)
- **UX philosophy**: "Web2 smooth, Web3 powerful" — fintech aesthetic, no blockchain jargon, Stripe-quality interactions

## Constraints

- **Tech stack**: Next.js, Express/Prisma, Privy v3, permissionless.js, Polygon Amoy — no deviations
- **Gasless requirement**: All brand + user on-chain actions must go through paymaster — never prompt user to pay gas
- **Sequential infra rule**: Do NOT build event creation UI before contracts deployed + paymaster configured
- **Auth stability gate**: Do NOT touch contract layer before auth + wallet abstraction are solid
- **No blockchain UI leakage**: Chain IDs, contract addresses, raw hashes must never surface in primary UI

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Privy embedded wallets (ERC-4337) | Users never manage keys; gasless UX possible | — Pending |
| Bundle approve+createEvent as single UserOp | One-click UX, atomic tx, no partial state | — Pending |
| USDC only (no platform token) | Simplicity, real value, no tokenomics complexity | — Pending |
| Off-chain voting with on-chain settlement | Voting speed (instant) vs reward integrity (on-chain) | — Pending |
| Pimlico as paymaster | Existing API key, ERC-4337 support, permissionless.js compatibility | — Pending |
| Brand pre-funds embedded wallet | Simplest USDC flow; no onramp complexity | — Pending |

---
*Last updated: 2026-03-03 after initialization*
