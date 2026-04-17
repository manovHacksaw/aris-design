import logger from '../lib/logger';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { PrivyClient } from '@privy-io/server-auth';

// Initialize Privy Client
const privy = new PrivyClient(
  process.env.PRIVY_APP_ID || '',
  process.env.PRIVY_APP_SECRET || ''
);

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address: string;
    email: string;
    sessionId?: string; // Optional now, since Privy JWT is stateless
    role?: import('@prisma/client').UserRole;
    walletAddress?: string;
    privyId?: string;
  };
}

/**
 * Privy JWT-based authentication middleware for protected routes
 * Expects Privy JWT token in Authorization header: Bearer <token>
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    const authHeader = authReq.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Privy JWT token in the Authorization header (Bearer <token>)'
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Privy
    let verifiedClaims;
    try {
      verifiedClaims = await privy.verifyAuthToken(token);
    } catch (e) {
      res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please login again via Privy'
      });
      return;
    }

    const privyId = verifiedClaims.userId;

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { privyId },
      select: { id: true, walletAddress: true, email: true, role: true, privyId: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found in database. Please complete the login flow.' });
      return;
    }

    // Attach user to request
    authReq.user = {
      id: user.id,
      address: user.walletAddress || '',
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress || undefined,
      privyId: user.privyId || undefined,
    };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Privy authentication error:');
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional Privy JWT authentication middleware
 * Does not return 401 if authentication fails, just leaves req.user undefined
 */
export const authenticateOptional = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    const authHeader = authReq.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    let verifiedClaims;
    try {
      verifiedClaims = await privy.verifyAuthToken(token);
    } catch (e) {
      next();
      return;
    }

    const privyId = verifiedClaims.userId;

    const user = await prisma.user.findUnique({
      where: { privyId },
      select: { id: true, walletAddress: true, email: true, role: true, privyId: true },
    });

    if (!user) {
      next();
      return;
    }

    authReq.user = {
      id: user.id,
      address: user.walletAddress || '',
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress || undefined,
      privyId: user.privyId || undefined,
    };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Optional Privy auth error:');
    next();
  }
};


/**
 * Middleware to require email verification
 * Must be used AFTER authenticateJWT or authenticateSignature
 *
 * ============================================================================
 * TEMPORARILY DISABLED: Email Verification Requirement
 * ============================================================================
 * Email verification checks are disabled - all users can proceed
 * To re-enable: set ENABLE_VERIFICATION=true in .env
 * ============================================================================
 */
export const requireEmailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const isVerificationEnabled = process.env.ENABLE_VERIFICATION === 'true';

  if (!isVerificationEnabled) {
    // Bypass verification check when disabled
    logger.info('⚠️ Email verification middleware bypassed - verification disabled');
    next();
    return;
  }

  // Original verification logic (kept for future re-enabling)
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    // Fetch fresh user data to check verification status
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: { emailVerified: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({
        error: 'Email verification required',
        message: 'Please verify your email address to continue.',
        requiresVerification: true
      });
      return;
    }

    next();
  } catch (error) {
    logger.error({ err: error }, 'Email verification check error:');
    res.status(500).json({ error: 'Internal server error' });
  }
};
