import logger from '../lib/logger';
import { prisma } from '../lib/prisma';

/**
 * Check if database connection is established
 * @returns Promise<boolean> - true if connected, false otherwise
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    // Test query to ensure connection is working
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
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
    logger.error('Error disconnecting from database:', error);
  }
}

