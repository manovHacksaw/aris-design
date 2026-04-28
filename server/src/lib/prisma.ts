import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPrismaUrl(dbUrl?: string): string | undefined {
  if (!dbUrl) return undefined;

  const url = new URL(dbUrl);
  const isSupabasePooler = url.hostname.includes('pooler.supabase.com');

  // Supabase PgBouncer (transaction mode) — enforce a safe connection limit.
  // The URL must NOT carry connection_limit=1 (old leftover bug); we pin to 5
  // unless the operator explicitly overrides via PRISMA_CONNECTION_LIMIT.
  const limit = process.env.PRISMA_CONNECTION_LIMIT || (isSupabasePooler ? '5' : undefined);
  if (limit) url.searchParams.set('connection_limit', limit);

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
