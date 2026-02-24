import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address: string;
    email: string;
    sessionId: string;
    role?: import('@prisma/client').UserRole;
    walletAddress?: string;
  };
}

/**
 * JWT-based authentication middleware for protected routes
 * Expects JWT token in Authorization header: Bearer <token>
 * 
 * This is the recommended middleware for protected routes after initial Web3 authentication
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(authReq.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid JWT token in the Authorization header (Bearer <token>)'
      });
      return;
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please login again to get a new token'
      });
      return;
    }

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, walletAddress: true, email: true, role: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify session is active
    const session = await prisma.userSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || !session.isActive) {
      res.status(401).json({
        error: 'Session expired or invalid',
        message: 'Please login again'
      });
      return;
    }

    // Check if session has expired
    if (new Date() > session.expiredAt) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      res.status(401).json({
        error: 'Session expired',
        message: 'Please login again'
      });
      return;
    }

    // Attach user to request
    authReq.user = {
      id: user.id,
      address: user.walletAddress || payload.address,
      email: user.email,
      sessionId: payload.sessionId,
      role: user.role,
      walletAddress: user.walletAddress || undefined,
    };

    next();
  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional JWT authentication middleware
 * Does not return 401 if authentication fails, just leaves req.user undefined
 */
export const authenticateOptional = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    const token = extractTokenFromHeader(authReq.headers.authorization);

    if (!token) {
      next();
      return;
    }

    const payload = verifyToken(token);

    if (!payload) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, walletAddress: true, email: true, role: true },
    });

    if (!user) {
      next();
      return;
    }

    const session = await prisma.userSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || !session.isActive) {
      next();
      return;
    }

    if (new Date() > session.expiredAt) {
      // We can optionally deactivate it here, but for "optional" auth we might just ignore it
      // or we can deactivate it to be helpful.
      // Let's deactivate it to keep DB clean.
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      next();
      return;
    }

    authReq.user = {
      id: user.id,
      address: user.walletAddress || payload.address,
      email: user.email,
      sessionId: payload.sessionId,
      role: user.role,
      walletAddress: user.walletAddress || undefined,
    };

    next();
  } catch (error) {
    // Just proceed without auth on error
    console.error('Optional JWT auth error:', error);
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
    console.log('⚠️ Email verification middleware bypassed - verification disabled');
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
    console.error('Email verification check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
