# Aris Ecosystem

Welcome to the Aris Fullstack Application—a modern, high-performance platform for decentralized engagement and digital rewards. Built with **Bun**, **Next.js**, **Express**, and **Prisma**, Aris bridges the gap between brands and users through transparent, reward-driven interactions.

---

## 🚀 Quick Start (Docker)

The fastest way to get Aris running locally is using Docker Compose. Ensure you have Docker Desktop installed.

```bash
# Build and start the entire stack
docker compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)

---

## 🏗️ Repository Structure

```text
aris/
├── client/           # Next.js 15 Frontend
├── server/           # Bun/Express Backend
├── db/               # Manual SQL scripts & DB tools
├── docs/             # Technical audits, roadmap, and docker guides
├── docker-compose.yml # Main orchestration file
└── README.md         # (You are here)
```

---

## 🛠️ Tech Stack

### Frontend (`/client`)
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Auth**: Privy (Smart Wallet Support)
- **Charts**: Recharts
- **Icons**: Lucide React / React Icons

### Backend (`/server`)
- **Runtime**: Bun 1.x
- **Framework**: Express (TypeScript)
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Security**: Arcjet (Rate limiting & Shield)
- **AI**: Google Gemini Pro
- **Realtime**: Socket.io

---

## 📖 Documentation Deep-Dives

- [**System Reorganization Walkthrough**](file:///c:/Users/manov/Desktop/code/aris/docs/WALKTHROUGH.md)
- [**Dockerization Guide**](file:///c:/Users/manov/Desktop/code/aris/docs/DOCKER.md)
- [**Development Roadmap**](file:///c:/Users/manov/Desktop/code/aris/docs/ROADMAP.md)

---

## 🧑‍💻 Local Development (Manual)

### 1. Prerequisite
Install [Bun](https://bun.sh/):
```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 2. Backend Setup
```bash
cd server
bun install
bun prisma generate
bun run dev
```

### 3. Frontend Setup
```bash
cd client
bun install
bun run dev
```

---

## 🚢 Deployment

The backend is architected for seamless deployment to **Railway** or any container-ready cloud provider. For detailed instructions, see the [Server README](file:///c:/Users/manov/Desktop/code/aris/server/README.md).

---

## 🤝 Contributing
Please ensure all pull requests follow the established **Service/Controller/Route** pattern as detailed in the `/docs/ARCHITECTURE.md`.
