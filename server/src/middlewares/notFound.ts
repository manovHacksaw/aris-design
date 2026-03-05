import { Request, Response } from 'express';

/**
 * 404 Not Found middleware
 */
export const notFound = (req: Request, res: Response): void => {
  console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
};

