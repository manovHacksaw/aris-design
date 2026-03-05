import { Response } from 'express';
import { EmailService } from '../services/emailService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { prisma } from '../lib/prisma';

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
        console.log('⚠️ Email verification disabled - bypassing OTP send');
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
        console.error('Error sending email OTP:', error);

        if (error.message.includes('wait')) {
            res.status(429).json({ error: error.message });
            return;
        }

        res.status(error.message.includes('already registered') || error.message.includes('Invalid') ? 400 : 500).json({
            error: error.message || 'Failed to send verification code',
        });
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
        console.log('⚠️ Email verification disabled - auto-verifying user');
        const { email } = req.body;
        const userId = req.user!.id;

        if (!email || typeof email !== 'string') {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Update user to verified without OTP check
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                email: email.toLowerCase().trim(),
                emailVerified: true,
            },
        });

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
        console.error('Error verifying email OTP:', error);
        res.status(error.message.includes('expired') || error.message.includes('Invalid') || error.message.includes('already registered') ? 400 : 500).json({
            error: error.message || 'Failed to verify code',
        });
    }
};
