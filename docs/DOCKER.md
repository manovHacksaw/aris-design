# Docker Management Guide

This guide covers advanced usage of the Aris Docker environment.

## 🐳 Core Commands

### Full Rebuild
If you've modified `package.json` or added new core configurations:
```bash
docker compose up --build
```

### Background Execution
To run the stack in the background:
```bash
docker compose up -d
```

### Stop and Cleanup
```bash
docker compose down -v  # -v removes volumes (use with caution)
```

---

## 🛠️ Service Configuration

### Backend (`server`)
- **Port Mapping**: `8000:8000`
- **Internal API**: Accessible within the Docker network at `http://server:8000`.
- **Environment**: Pulls from `server/.env`.

### Frontend (`client`)
- **Port Mapping**: `3000:3000`
- **Optimization**: Uses Next.js **Standalone Mode**.
- **Internal Networking**: Uses `NEXT_PUBLIC_API_URL` to point to the backend container.

---

## 🔍 Troubleshooting

### Missing "addgroup" or "adduser"
If you see errors related to `addgroup`, ensure the Dockerfile uses `groupadd` and `useradd` (standard for Debian slim). I have already pre-configured this in the [client Dockerfile](file:///c:/Users/manov/Desktop/code/aris/client/Dockerfile).

### Database Connection Failed
If the `server` container fails to start because of a database connection:
1. Ensure your `DATABASE_URL` in `server/.env` is a public cloud URL (like Supabase).
2. If using a local DB, ensure it is part of the `aris-network` in `docker-compose.yml`.

### Outdated Build Cache
Sometimes Docker caches old `node_modules`. Force a clean install:
```bash
docker compose build --no-cache
```

---

## 📈 Production Best Practices
When moving to production:
1. Use a managed registry (Docker Hub, GitHub Packages) to host images.
2. Ensure `NODE_ENV` is set to `production`.
3. Use secret management (e.g., Railway Variables) instead of baking `.env` files into images.
