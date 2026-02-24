import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add cache headers for IPFS content
 * IPFS content is immutable, so we can cache aggressively
 */
export const ipfsCacheHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Set cache headers for IPFS content (immutable, cache for 1 year)
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('CDN-Cache-Control', 'public, max-age=31536000');
  next();
};

/**
 * Middleware to add cache headers for API responses with events/submissions
 * These can change, so we use shorter cache times
 */
export const apiCacheHeaders = (req: Request, res: Response, next: NextFunction) => {
  // If request is authenticated, don't cache publicly
  const hasAuth = req.headers.authorization;

  if (hasAuth) {
    res.set('Cache-Control', 'private, max-age=60, must-revalidate');
  } else {
    // Set cache headers for API responses (5 minutes)
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');
    res.set('CDN-Cache-Control', 'public, max-age=600'); // CDN can cache longer
  }
  next();
};

/**
 * Middleware to add cache headers for user-specific data
 * Should not be cached by CDN, only by browser
 */
export const privateCacheHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Set cache headers for private data (1 minute, browser only)
  res.set('Cache-Control', 'private, max-age=60, must-revalidate');
  next();
};
