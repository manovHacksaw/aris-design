import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { ALLOWED_ADMIN_EMAILS, ADMIN_KEY } from '../config/admin';

export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Fallback: static admin key via header (emergency access)
  if (ADMIN_KEY && req.headers['x-admin-key'] === ADMIN_KEY) {
    next();
    return;
  }

  const user = (req as AuthenticatedRequest).user;

  if (!user?.email) {
    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    return;
  }

  if (!ALLOWED_ADMIN_EMAILS.has(user.email.toLowerCase())) {
    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    return;
  }

  next();
};
