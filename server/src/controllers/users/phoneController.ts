import logger from '../../lib/logger.js';
import { Response } from 'express';
import { PhoneService } from '../../services/users/phoneService.js';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware.js';


/**
 * Check if phone number is available
 */
export const checkPhoneAvailability = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.query;
    const userId = req.user!.id;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const available = await PhoneService.checkAvailability(phoneNumber, userId);
    res.json({ available });
  } catch (error: any) {
    logger.error({ err: error }, 'Error checking phone availability:');
    res.status(500).json({
      error: 'Failed to check phone availability',
    });
  }
};

/**
 * Verify Firebase ID token and update user's phone number
 *
 * ============================================================================
 * TEMPORARILY DISABLED: Phone Verification
 * ============================================================================
 * Phone verification is disabled - auto-verifies any phone number provided
 * To re-enable: set ENABLE_VERIFICATION=true in .env and configure Firebase
 * ============================================================================
 */
export const verifyFirebasePhone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isVerificationEnabled = process.env.ENABLE_VERIFICATION === 'true';

  if (!isVerificationEnabled) {
    // Auto-verify phone when verification is disabled
    logger.info('⚠️ Phone verification disabled - auto-verifying phone');
    const { phoneNumber } = req.body; // Accept phone directly instead of idToken
    const userId = req.user!.id;

    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    // Update user with phone number, mark as verified
    const updatedUser = await PhoneService.bypassVerification(phoneNumber, userId);

    res.json({
      success: true,
      message: 'Phone number verified successfully (verification disabled)',
      user: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        phoneVerified: updatedUser.phoneVerified,
      },
    });
    return;
  }

  // Original verification logic (kept for future re-enabling)
  try {
    const { idToken } = req.body;
    const userId = req.user!.id;

    if (!idToken) {
      res.status(400).json({ error: 'ID token is required' });
      return;
    }

    const updatedUser = await PhoneService.verifyFirebasePhone(idToken, userId);

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      user: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        phoneVerified: updatedUser.phoneVerified,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error verifying Firebase token:');
    res.status(error.message.includes('already registered') ? 400 : 500).json({
      error: error.message || 'Failed to verify phone number',
    });
  }
};

