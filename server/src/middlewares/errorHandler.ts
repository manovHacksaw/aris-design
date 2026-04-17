import logger from '../lib/logger';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Prisma unique constraint violation
  if ((err as any).code === 'P2002') {
    res.status(409).json({ error: 'Duplicate entry' });
    return;
  }

  logger.error(err);
  res.status(500).json({
    error: 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { message: err.message }),
  });
};
