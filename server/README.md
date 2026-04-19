# Aris Backend (Server)

The Aris Backend is a robust, service-oriented API built with **Bun** and **Express**. It handles core business logic for events, rewards, and AI-driven analytics.

## 🏗️ Architecture

We strictly follow the **Service / Controller / Route** pattern:
- **Routes**: Define endpoints and handle authentication.
- **Controllers**: Extract request data, perform validation, and return responses.
- **Services**: The "Source of Truth" for business logic and all Prisma database interactions.

## 🚀 Getting Started

### Prerequisites
- [Bun Runtime](https://bun.sh/)
- PostgreSQL (or Supabase URL)

### Installation
```bash
bun install
bun prisma generate
```

### Environment Variables
Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL`: Your Supabase connection string.
- `ARCJET_KEY`: For rate limiting and security.
- `GEMINI_API_KEY`: For AI analytics reporting.
- `PRIVY_APP_ID/SECRET`: For server-side auth verification.

### Running
```bash
# Development (with hot-reload)
bun run dev

# Production Build
bun run build
bun run start
```

## 🛠️ Core Services

- **RewardsDistributionService**: Manages USDC reward calculations and event pool status.
- **EventLifecycleService**: Handles auto-transitioning events from `scheduled` -> `active` -> `voting` -> `completed`.
- **BrandService**: Single source of truth for brand verification and ownership.
- **AnalyticsService**: Aggregates event participation data and triggers Gemini AI reporting.

## 🔒 Security
- **Authentication**: Handled via `authenticateJWT` (for users) and `authenticateAdmin` (for staff).
- **Protections**: Integrated with **Arcjet** for bot detection, rate-limiting, and SQL injection prevention.

## 🚢 Deployment (Railway)
This service is Docker-ready. To deploy to Railway:
1. Set the **Root Directory** to `/server`.
2. Add all `.env` variables to the Railway dashboard.
3. Railway will use the [Dockerfile](file:///c:/Users/manov/Desktop/code/aris/server/Dockerfile) to build and run the service.
