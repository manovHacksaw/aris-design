import { Request, Response } from 'express';
import { PrivyClient } from '@privy-io/server-auth';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

/**
 * Authenticate with Privy token
 * POST /api/auth/privy-login
 */
export const privyLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { privyToken, walletAddress, email } = req.body;
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

    const result = await AuthService.privyLogin(verifiedClaims, walletAddress, email, deviceInfo, ip);
    res.json(result);
  } catch (error: any) {
    console.error('Error during Privy authentication:', error);
    const status = error.message?.includes('Invalid') || error.message?.includes('expired') ? 401 : 500;
    res.status(status).json({ error: error.message || 'Authentication failed' });
  }
};

/**
 * Generate a nonce for address
 * GET /api/auth/nonce?address=0x...
 */
export const getNonce = async (req: Request, res: Response): Promise<void> => {
  try {
    const address = req.query.address as string;
    const result = await AuthService.getNonce(address);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating nonce:', error);
    res.status(error.message === 'Valid Ethereum address is required' ? 400 : 500).json({
      error: error.message || 'Failed to generate nonce'
    });
  }
};

/**
 * Authenticate user with signature
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, signature, message, nonce, email, smartAccountAddress } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;

    const result = await AuthService.login(address, signature, message, nonce, deviceInfo, ip, email, undefined, smartAccountAddress);
    res.json(result);
  } catch (error: any) {
    console.error('Error during authentication:', error);
    const status = error.message.includes('Invalid') || error.message.includes('Missing') ? 401 : 500;
    res.status(status).json({
      error: error.message || 'Authentication failed',
    });
  }
};

/**
 * Verify signature endpoint (for testing)
 * POST /api/auth/verify
 */
export const verify = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const isValid = await AuthService.verifySignature(address, signature, message);
    res.json({ valid: isValid, address });
  } catch (error: any) {
    console.error('Error verifying signature:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

/**
 * Logout user and invalidate session
 * POST /api/auth/logout
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.sessionId) {
      // If no session, just return success to allow frontend to clear local state
      res.json({ success: true, message: 'Logged out successfully' });
      return;
    }

    await AuthService.logout(req.user.sessionId);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};


