import logger from '../lib/logger';
import { prisma } from '../lib/prisma';

/**
 * Check if database connection is established
 * @returns Promise<boolean> - true if connected, false otherwise
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const url = process.env.DATABASE_URL?.trim();
    logger.info(`DB URL prefix: ${url?.slice(0, 30)}... (length ${url?.length})`);
    await prisma.$connect();
    // Test query to ensure connection is working
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error(error, 'Database connection failed:');
    return false;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error(error, 'Error disconnecting from database:');
  }
}

