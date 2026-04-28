import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPrismaUrl(dbUrl?: string): string | undefined {
  if (!dbUrl) return undefined;

  try {
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
  } catch (error) {
    // If the URL is invalid (e.g. contains unencoded special characters in password),
    // fall back to the raw URL to let Prisma handle it. 
    // Prisma's own parser is often more lenient than the standard URL constructor.
    console.error('[Prisma] Failed to parse DATABASE_URL as a standard URL, using raw string:', error);
    return dbUrl;
  }
}

const enhancedUrl = buildPrismaUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(enhancedUrl ? { datasources: { db: { url: enhancedUrl } } } : {})
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
