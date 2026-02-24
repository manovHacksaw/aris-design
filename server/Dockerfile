FROM oven/bun:1 as base
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Copy prisma directory for generation
COPY prisma ./prisma

# Install dependencies
RUN bun install --frozen-lockfile
RUN bun prisma generate

# Copy the rest of the source code
COPY . .

# Build the application
RUN bun run build

# Expose the port (Render usually sets PORT env var, but this is good documentation)
EXPOSE 3000

# Start the server
CMD ["bun", "run", "dist/server.js"]
