import type { Request, Response, NextFunction } from 'express';
import type { ArcjetNode } from '@arcjet/node';
import logger from '../lib/logger';

type ProtectProps = Record<string, string | number | boolean>;

/**
 * Wrap an Arcjet instance (base or .withRule'd) as Express middleware.
 * `getProps` extracts any extra characteristics needed by the rules
 * (e.g. userId for per-user limits). Omit for IP-only limits.
 */
export function arcjetMiddleware(
  aj: ArcjetNode<any>,
  getProps?: (req: Request) => ProtectProps,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const props = getProps ? getProps(req) : {};
      const decision = await aj.protect(req as any, props);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          res.status(429).json({ error: 'Too many requests. Please slow down.' });
          return;
        }
        // Shield WAF block
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      next();
    } catch (err) {
      // Fail open — never block legitimate traffic due to Arcjet being unavailable
      logger.warn({ err }, 'Arcjet protect() failed, failing open');
      next();
    }
  };
}
