import { prisma } from '../lib/prisma';
import { sendEmailOTP } from '../utils/emailService';
import { generateOTP, hashOTP, verifyOTPHash } from '../utils/otpService';

const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MS = 60 * 1000; // 1 minute

export class EmailService {
    /**
     * Send OTP to email
     */
    static async sendOTP(email: string, userId: string) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check availability
        const existingUser = await prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                NOT: { id: userId },
            },
        });

        if (existingUser) {
            throw new Error('Email is already registered to another account');
        }

        // Check rate limit
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.emailVerificationExpiry && user.emailVerificationExpiry.getTime() > Date.now() + (OTP_EXPIRATION_MS - RATE_LIMIT_MS)) {
            const waitTime = Math.ceil((user.emailVerificationExpiry.getTime() - (Date.now() + (OTP_EXPIRATION_MS - RATE_LIMIT_MS))) / 1000);
            if (waitTime > 0) {
                throw new Error(`Please wait ${waitTime} seconds before requesting another code`);
            }
        }

        // Generate and store OTP
        const otp = generateOTP();
        const otpHash = hashOTP(otp);
        const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerificationCode: otpHash,
                emailVerificationExpiry: expiresAt,
            },
        });

        // Send email
        await sendEmailOTP(normalizedEmail, otp);

        return {
            expiresIn: OTP_EXPIRATION_MS / 1000,
        };
    }

    /**
     * Verify OTP
     */
    static async verifyOTP(email: string, otp: string, userId: string) {
        if (!/^\d{6}$/.test(otp)) {
            throw new Error('Invalid OTP format. Must be 6 digits');
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new Error('User not found');
        }

        if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
            throw new Error('No verification code found. Please request a new code');
        }

        if (Date.now() > user.emailVerificationExpiry.getTime()) {
            throw new Error('Verification code has expired. Please request a new code');
        }

        const isValid = verifyOTPHash(otp, user.emailVerificationCode);
        if (!isValid) {
            throw new Error('Invalid verification code');
        }

        // Double check availability
        const emailTaken = await prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                NOT: { id: userId },
            },
        });

        if (emailTaken) {
            throw new Error('Email is already registered to another account');
        }

        // Update user
        return prisma.user.update({
            where: { id: userId },
            data: {
                email: normalizedEmail,
                emailVerified: true,
                emailVerificationCode: null,
                emailVerificationExpiry: null,
            },
        });
    }
}
