import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Trim whitespace Railway/env managers may add around the value
const databaseUrl = process.env.DATABASE_URL?.trim();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {})
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
