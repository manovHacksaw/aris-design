import crypto from 'crypto';

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP code using SHA256
 */
export function hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Verify OTP by comparing hashes
 */
export function verifyOTPHash(otp: string, hash: string): boolean {
    const otpHash = hashOTP(otp);
    return otpHash === hash;
}
