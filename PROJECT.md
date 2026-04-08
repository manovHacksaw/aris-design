# Aris

Aris is a Web3-enabled creative community platform where brands run voting and submission events, users participate by creating and curating content, and on-chain reward pools distribute USDC to winners.

---

## What It Does

**For Users (Creators)**
- Browse and join brand-hosted events
- Submit AI-generated or uploaded images to events
- Vote on other submissions and proposals
- Earn XP, maintain login streaks, complete milestones, and refer others
- Claim USDC rewards from on-chain reward pools

**For Brands**
- Create three event types: submission-only, voting/proposal, or hybrid
- Set reward pools funded on-chain
- Use AI to generate voting option images and sample content
- View detailed analytics per event and across their brand
- Progress through a brand XP / leveling system that unlocks discounts

---

## Tech Stack

### Frontend — `client/`
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Auth | Privy (`@privy-io/react-auth`) |
| Web3 | viem, wagmi, permissionless (ERC-4337) |
| Real-time | Socket.IO client |
| Media | Cloudinary, Pinata (IPFS) |
| AI | Google Imagen via Gemini API |
| Charts | Recharts |
| State / Data | TanStack React Query |

### Backend — `server/`
| Layer | Technology |
|---|---|
| Runtime | Bun |
| Framework | Express.js |
| Database | PostgreSQL via Prisma ORM (hosted on Supabase) |
| Auth | Privy server SDK + JWT |
| Web3 | ethers.js, viem |
| Real-time | Socket.IO |
| Email | Nodemailer |
| Phone verification | Firebase Admin |
| AI | Google Generative AI SDK |
| Media | Cloudinary |

---

## Architecture

```
aris/
├── client/          # Next.js frontend
│   ├── app/
│   │   ├── (user)/      # User-facing pages (explore, create, profile, events)
│   │   ├── brand/       # Brand dashboard and event management
│   │   ├── admin/       # Internal admin panel
│   │   └── api/         # Next.js API routes (image generation)
│   ├── components/      # Shared and feature-specific UI components
│   ├── services/        # API client functions
│   ├── context/         # React context providers
│   └── types/           # TypeScript types
│
└── server/          # Express backend
    └── src/
        ├── routes/      # Express route handlers (~135 endpoints)
        ├── controllers/ # Business logic
        ├── services/    # Domain services
        ├── middlewares/ # Auth, validation
        ├── contracts/   # Web3 contract interaction
        └── socket/      # Real-time event handlers
```

---

## Key Features

### Authentication
- Web3 wallet sign-in via Privy (embedded wallets + external wallets)
- ERC-4337 smart accounts (gasless transactions)
- Email OTP and phone (Firebase) verification for profile completion

### Events
- Three types: `SUBMISSION_ONLY`, `PROPOSAL_ONLY`, `HYBRID`
- Lifecycle: `DRAFT → SCHEDULED → ACTIVE → COMPLETED / CANCELLED`
- On-chain reward pools funded by brands, distributed to winning participants

### AI Image Generation
- Powered by Google Imagen (Imagen 4)
- Users: 3 generations/day — full 6-step flow (type → prompt → generate → preview → pick event → post)
- Brands: 5 generations/day — focused modal for voting option images and sample images
- Prompts are enriched server-side with event context before sending to the model

### Gamification
- User XP from votes, submissions, logins, referrals
- Login streaks and XP multipliers
- Milestone rewards and leaderboards (users, brands, events, content)
- Brand XP levels that unlock platform fee discounts

### Real-time
- Socket.IO for live vote counts, event state changes, and notifications

---

## API

REST API with ~135 endpoints. Base URL: `http://localhost:3000/api`

Auth: wallet signature → JWT (`Authorization: Bearer <token>`)

Main route groups: `/auth`, `/users`, `/brands`, `/events`, `/rewards`, `/xp`, `/analytics`, `/search`, `/leaderboard`, `/notifications`, `/subscriptions`, `/ai`, `/admin`

See `API_ENDPOINTS.md` for the full reference.

---

## Local Development

### Server
```bash
cd server
bun install
bun run dev        # starts with --watch on port 3000
```

### Client
```bash
cd client
npm install
npm run dev        # starts Next.js on port 3001 (or default 3000)
```

### Database
```bash
cd server
bun prisma migrate dev    # run migrations
bun prisma studio         # visual DB browser
```

Required env vars: `DATABASE_URL`, `DIRECT_URL` (Supabase), `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `GEMINI_API_KEY`, `CLOUDINARY_*`, `PINATA_JWT`, Firebase config.
