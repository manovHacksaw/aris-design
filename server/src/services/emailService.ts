import { prisma } from '../lib/prisma';
import { generateOTP, hashOTP, verifyOTPHash } from '../utils/otpService';

// ─── SMTP transport (lazy init) ───────────────────────────────────────────────

let transporter: any = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null;
  }

  const nodemailerModule = await import('nodemailer');
  const nodemailer = nodemailerModule.default || nodemailerModule;

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    family: 4,
    tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development',
    pool: true,
    maxConnections: 5,
    maxMessages: 10,
    ignoreTLS: false,
    requireTLS: smtpPort === 587,
  } as any);

  console.log(`📧 SMTP transporter created for ${smtpHost}:${smtpPort}`);
  return transporter;
}

async function sendEmailOTP(email: string, code: string): Promise<void> {
  const emailTransporter = await getTransporter();

  if (!emailTransporter) {
    throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.');
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'Aris <noreply@aris.com>',
    to: email,
    subject: 'Verify Your Email - Aris',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #1F2937; margin: 0;">Verify Your Email</h2>
        </div>
        <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="color: #6B7280; margin-bottom: 10px;">Your verification code is:</p>
          <h1 style="color: #3B82F6; letter-spacing: 8px; font-size: 36px; margin: 20px 0;">${code}</h1>
          <p style="color: #9CA3AF; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
        </div>
        <p style="color: #6B7280; font-size: 14px; margin-top: 30px; text-align: center;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `,
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email verification code sent to ${email} (Message ID: ${info.messageId})`);
  } catch (error: any) {
    let errorMessage = error.message || 'Unknown error';
    const errorCode = error.code;

    if (errorCode === 'ETIMEDOUT' || errorCode === 'ESOCKET') {
      errorMessage = `SMTP port ${process.env.SMTP_PORT || 587} is blocked or unreachable. Use SendGrid or Brevo instead of Gmail on cloud platforms.`;
    } else if (errorCode === 'ECONNREFUSED') {
      errorMessage = `Connection refused to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}.`;
    } else if (errorCode === 'EAUTH' || error.responseCode === 535) {
      errorMessage = `SMTP authentication failed. For Gmail use App Password; for SendGrid set SMTP_USER="apikey".`;
    } else if (errorCode === 'EDNS' || errorCode === 'ENOTFOUND') {
      errorMessage = `SMTP host "${process.env.SMTP_HOST}" not found.`;
    }

    throw new Error(errorMessage);
  }
}

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
