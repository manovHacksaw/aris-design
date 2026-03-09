# sperm.fun 🧬

> The wildest creative challenge platform on Avalanche. Post. Vote. Earn. Repeat.

Built on **Avalanche (AVAX)** — fast finality, low fees, and real rewards for real creativity.

---

## What is sperm.fun?

sperm.fun is an onchain creative ad platform where brands launch challenges, creators compete, and the community votes. Winners earn from a prize pool locked in a smart contract — no middlemen, no delays.

- **Brands** post challenges with AVAX-backed reward pools
- **Creators** submit their best work to compete
- **Community** votes on the best entries
- **Winners** get paid out automatically onchain

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TailwindCSS v4, Framer Motion |
| Auth & Wallets | Privy (embedded wallets + smart accounts) |
| Chain | Avalanche C-Chain |
| Smart Contracts | Solidity — RewardsVault, Voting |
| Backend | Express.js, Prisma, Supabase |
| Storage | IPFS via Pinata |
| AI | Image generation for creative submissions |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Privy App ID
- An Avalanche RPC endpoint

### Install & Run

```bash
# Clone
git clone https://github.com/manovHacksaw/spermdotfun.git
cd spermdotfun

# Install client
cd client && npm install

# Install server
cd ../server && npm install
```

### Environment Variables

Create `client/.env.local`:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Create `server/.env`:

```env
DATABASE_URL=your_supabase_postgres_url
PRIVATE_KEY=your_backend_signer_private_key
```

### Run Dev

```bash
# Client (port 3000)
cd client && npm run dev

# Server (port 8000)
cd server && npm run dev
```

---

## How It Works

1. **Brand** creates a challenge with a title, description, and AVAX reward pool
2. **Creators** submit entries during the posting phase
3. **Community** votes during the voting phase — each wallet gets one vote
4. **Smart contract** distributes rewards to top-voted submissions automatically

---

## Avalanche Integration

- Deployed on **Avalanche C-Chain** for EVM compatibility and sub-second finality
- Smart account abstraction via Privy — gasless onboarding for new users
- Reward pools held in a `RewardsVault` contract, released trustlessly on phase completion
- AVAX used as the native reward currency

---

## License

MIT
