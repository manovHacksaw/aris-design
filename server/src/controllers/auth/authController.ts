import logger from '../../lib/logger';
import { Request, Response } from 'express';
import { PrivyClient } from '@privy-io/server-auth';
import { AuthService } from '../../services/auth/authService';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware';

/**
 * Authenticate with Privy token
 * POST /api/auth/privy-login
 */
export const privyLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { privyToken, walletAddress, eoaAddress, email, avatarUrl } = req.body;
    if (!privyToken) {
      res.status(400).json({ error: 'privyToken is required' });
      return;
    }

    const privyClient = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    );

    const verifiedClaims = await privyClient.verifyAuthToken(privyToken);
    const deviceInfo = req.headers['user-agent'];
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;

    const result = await AuthService.privyLogin(verifiedClaims, walletAddress, email, deviceInfo, ip, avatarUrl, eoaAddress);
    res.json(result);
  } catch (error: any) {
    logger.error({ err: error }, 'Error during Privy authentication:');
    const status = error.message?.includes('Invalid') || error.message?.includes('expired') ? 401 : 500;
    res.status(status).json({ error: error.message || 'Authentication failed' });
  }
};

/**
 * Logout user and invalidate session (Client-side token clearing handled by frontend via Privy)
 * POST /api/auth/logout
 */
export const logout = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Session states are handled statelessly with Privy on the frontend
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error({ err: error }, 'Error during logout:');
    res.status(500).json({ error: 'Logout failed' });
  }
};
