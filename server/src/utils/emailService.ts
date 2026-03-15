// NOTE: Email verification is handled by Web3Auth - this service is optional
let transporter: any = null;

// Lazy initialization function to handle CommonJS module loading in Bun
async function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null;
  }

  // Dynamic import for Bun compatibility with CommonJS modules
  const nodemailerModule = await import('nodemailer');
  const nodemailer = nodemailerModule.default || nodemailerModule;

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Force IPv4 to avoid IPv6 issues with Gmail on some cloud providers
    family: 4,
    // TLS configuration for better compatibility
    tls: {
      // Don't fail on invalid certs (useful for some SMTP servers)
      rejectUnauthorized: false,
      // Minimum TLS version
      minVersion: 'TLSv1.2',
    },
    // Reduced timeouts to fail faster if SMTP is blocked
    connectionTimeout: 5000,   // 5 seconds (was 10)
    greetingTimeout: 5000,     // 5 seconds (was 10)
    socketTimeout: 10000,      // 10 seconds (was 15)
    // Enable debug logs in development
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development',
    // Connection pooling
    pool: true,
    maxConnections: 5,
    maxMessages: 10,
    // Ignore STARTTLS errors (fallback to unencrypted if needed)
    ignoreTLS: false,
    // Require TLS (set to false if you want to allow fallback)
    requireTLS: smtpPort === 587,
  } as any);

  // Don't verify on initialization - let sendMail handle the connection
  // This prevents blocking the app startup if SMTP is unreachable
  console.log(`📧 SMTP transporter created for ${smtpHost}:${smtpPort}`);

  return transporter;
}

/**
 * Send email verification OTP
 * @param email - Recipient email address
 * @param code - 6-digit OTP code
 * @throws Error if email service is not configured or sending fails
 */
export async function sendEmailOTP(email: string, code: string): Promise<void> {
  // Debug log to verify what Render is actually using
  console.log('📧 SMTP Config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER ? 'Set' : 'Missing',
    pass: process.env.SMTP_PASSWORD ? 'Set' : 'Missing'
  });

  const emailTransporter = await getTransporter();

  if (!emailTransporter) {
    const errorMsg = 'Email service not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
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
    console.error(`❌ Failed to send email to ${email}:`, error);

    // Provide detailed error information with actionable guidance
    let errorMessage = error.message || 'Unknown error';
    let errorCode = error.code;

    if (errorCode === 'ETIMEDOUT' || errorCode === 'ESOCKET') {
      errorMessage = `SMTP port ${process.env.SMTP_PORT || 587} is blocked or unreachable on ${process.env.SMTP_HOST || 'smtp.gmail.com'}. ` +
        `This is common on cloud platforms like Render. ` +
        `Solution: Use SendGrid SMTP relay (smtp.sendgrid.net) or Brevo (smtp-relay.brevo.com) instead of Gmail.`;
    } else if (errorCode === 'ECONNREFUSED') {
      errorMessage = `Connection refused to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}. ` +
        `Check if SMTP_HOST and SMTP_PORT are correct.`;
    } else if (errorCode === 'EAUTH' || error.responseCode === 535) {
      errorMessage = `SMTP authentication failed. ` +
        `For Gmail: Use App Password from https://myaccount.google.com/apppasswords. ` +
        `For SendGrid: SMTP_USER must be "apikey" and SMTP_PASSWORD is your API key.`;
    } else if (errorCode === 'EDNS' || errorCode === 'ENOTFOUND') {
      errorMessage = `SMTP host "${process.env.SMTP_HOST}" not found. Check SMTP_HOST setting.`;
    }

    // Log detailed error for debugging
    console.error('📋 Error details:', {
      code: errorCode,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
    });

    throw new Error(errorMessage);
  }
}
