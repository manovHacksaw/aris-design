import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbUrl = process.env.DATABASE_URL;
const enhancedUrl = dbUrl
  ? dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=10&pool_timeout=20&pgbouncer=true'
  : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(enhancedUrl ? { datasources: { db: { url: enhancedUrl } } } : {})
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

