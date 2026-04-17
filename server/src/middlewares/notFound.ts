import logger from '../lib/logger';
import { Request, Response } from 'express';

/**
 * 404 Not Found middleware
 */
export const notFound = (req: Request, res: Response): void => {
  logger.info(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
};

