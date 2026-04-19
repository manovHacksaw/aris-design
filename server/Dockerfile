FROM oven/bun:1 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# Rebuild the source code and generate Prisma
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun prisma generate
RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user (optional but recommended)
# RUN addgroup --system --gid 1001 backend
# RUN adduser --system --uid 1001 expressjs

# Copy built files and prisma (for runtime)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose port (from .env or default)
EXPOSE 8000

# Set environment variable for port
ENV PORT 8000

# Start the server
# Note: we need the prisma client in node_modules, which is copied from deps
CMD ["bun", "run", "dist/server.js"]
