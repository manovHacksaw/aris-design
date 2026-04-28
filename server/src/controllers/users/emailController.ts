import logger from '../../lib/logger';
import { Response } from 'express';
import { EmailService } from '../../services/users/emailService';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware';

import { AppError } from '../../utils/errors';

/**
 * Send OTP to email
 *
 * ============================================================================
 * TEMPORARILY DISABLED: Email OTP Sending
 * ============================================================================
 * Email verification is disabled to unblock user registration in production
 * This endpoint now returns success without actually sending emails
 * To re-enable: set ENABLE_VERIFICATION=true in .env and configure SMTP
 * ============================================================================
 */
export const sendOTP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const isVerificationEnabled = process.env.ENABLE_VERIFICATION === 'true';

    if (!isVerificationEnabled) {
        // Bypass OTP sending when verification is disabled
        logger.info('⚠️ Email verification disabled - bypassing OTP send');
        res.json({
            success: true,
            message: 'Verification temporarily disabled - proceed without verification',
            expiresIn: 600, // Mock expiry
        });
        return;
    }

    // Original verification logic (kept for future re-enabling)
    try {
        const { email } = req.body;
        const userId = req.user!.id;

        if (!email || typeof email !== 'string') {
            res.status(400).json({ error: 'Valid email is required' });
            return;
        }

        const result = await EmailService.sendOTP(email, userId);

        res.json({
            success: true,
            message: 'Verification code sent to your email',
            expiresIn: result.expiresIn,
        });
    } catch (error: any) {
        if (error instanceof AppError) { res.status(error.status).json({ error: error.message }); return; }
        logger.error({ err: error }, 'Error sending email OTP:');
        res.status(500).json({ error: 'Failed to send verification code' });
    }
};

/**
 * Verify Email OTP
 *
 * ============================================================================
 * TEMPORARILY DISABLED: Email OTP Verification
 * ============================================================================
 * Email verification is disabled - automatically marks user as verified
 * To re-enable: set ENABLE_VERIFICATION=true in .env
 * ============================================================================
 */
export const verifyOTP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const isVerificationEnabled = process.env.ENABLE_VERIFICATION === 'true';

    if (!isVerificationEnabled) {
        // Auto-verify when verification is disabled
        logger.info('⚠️ Email verification disabled - auto-verifying user');
        const { email } = req.body;
        const userId = req.user!.id;

        if (!email || typeof email !== 'string') {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Update user to verified without OTP check
        const updatedUser = await EmailService.bypassVerification(email, userId);

        res.json({
            success: true,
            message: 'Email verified successfully (verification disabled)',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                emailVerified: updatedUser.emailVerified,
            },
        });
        return;
    }

    // Original verification logic (kept for future re-enabling)
    try {
        const { email, otp } = req.body;
        const userId = req.user!.id;

        if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
            res.status(400).json({ error: 'Email and OTP are required' });
            return;
        }

        const updatedUser = await EmailService.verifyOTP(email, otp, userId);

        res.json({
            success: true,
            message: 'Email verified successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                emailVerified: updatedUser.emailVerified,
            },
        });
    } catch (error: any) {
        if (error instanceof AppError) { res.status(error.status).json({ error: error.message }); return; }
        logger.error({ err: error }, 'Error verifying email OTP:');
        res.status(500).json({ error: 'Failed to verify code' });
    }
};
