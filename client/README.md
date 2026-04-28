# Aris Client (Frontend)

The Aris Client is a high-performance, decentralized web application built with **Next.js 15** and **Tailwind CSS**.

## 🎨 Features
- **Modern UI**: Built with Framer Motion for smooth, premium transitions.
- **Web3 Integration**: Uses **Privy** for seamless smart wallet onboarding.
- **Analytics Dashboards**: Interactive charts powered by **Recharts**.
- **Real-time Updates**: Integrated with **Socket.io** for live scoring and event status changes.

## 🚀 Getting Started

### Prerequisites
- [Bun Runtime](https://bun.sh/)

### Installation
```bash
bun install
```

### Environment Variables
Configure `.env.local`:
- `NEXT_PUBLIC_PRIVY_APP_ID`: Your Privy Project ID.
- `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `http://localhost:8000/api`).
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: For media uploads.

### Running
```bash
# Development
bun run dev

# Production Build (Docker-ready)
bun run build
bun run start
```

## 🏗️ Folder Structure
- `/app`: Next.js App Router pages and layouts.
- `/components`: Reusable UI components (using Tailwind Merge).
- `/context`: Global state management (Auth, Theme).
- `/services`: API client functions to communicate with the Backend.
- `/lib`: Helper utilities and shared constants.

## 🐳 Docker Deployment
We use a **multi-stage build** with Next.js **Standalone Mode** for ultra-small production images.
- [Dockerfile](file:///c:/Users/manov/Desktop/code/aris/client/Dockerfile)
- Configured via `next.config.ts` with `output: 'standalone'`.
