import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { getAllowedAdminEmails, getAdminKey } from '../config/admin';

export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Fallback: static admin key via header (emergency access)
  if (getAdminKey() && req.headers['x-admin-key'] === getAdminKey()) {
    next();
    return;
  }

  const user = (req as AuthenticatedRequest).user;
  const allowedEmails = getAllowedAdminEmails();

  if (!user?.email) {
    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    return;
  }

  if (!allowedEmails.has(user.email.toLowerCase())) {
    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    return;
  }

  next();
};
