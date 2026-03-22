import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPrismaUrl(dbUrl?: string): string | undefined {
  if (!dbUrl) return undefined;

  const url = new URL(dbUrl);
  const isSupabasePooler = url.hostname.includes('pooler.supabase.com');
  const explicitConnectionLimit = process.env.PRISMA_CONNECTION_LIMIT;

  // Supabase pooler (PgBouncer) supports up to ~10 connections per client in
  // transaction mode. Use 5 as a safe default to allow parallel queries while
  // avoiding pool exhaustion. Override with PRISMA_CONNECTION_LIMIT if needed.
  if (isSupabasePooler) {
    url.searchParams.set('connection_limit', explicitConnectionLimit || '5');
  }

  if (explicitConnectionLimit && !isSupabasePooler) {
    url.searchParams.set('connection_limit', explicitConnectionLimit);
  }

  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '20');
  }

  return url.toString();
}

const enhancedUrl = buildPrismaUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(enhancedUrl ? { datasources: { db: { url: enhancedUrl } } } : {})
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
