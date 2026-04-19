import aj from '../lib/arcjet.js';
import { fixedWindow } from '@arcjet/node';
import { arcjetMiddleware } from '../middlewares/arcjetMiddleware.js';

/**
 * Fingerprint helper for authenticated users or anonymous IPs
 */
const userFingerprint = (req: any) => ({
  userId: req.user?.id ?? req.ip ?? 'anon'
});

/**
 * 10 login attempts per minute per IP
 */
export const loginRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '1m', max: 10 }))
);

/**
 * 3 OTP sends per 5 minutes per user
 */
export const otpRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '5m', max: 3, characteristics: ['userId'] })),
  userFingerprint
);

/**
 * 5 claim operations per 5 minutes per user
 */
export const claimRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '5m', max: 5, characteristics: ['userId'] })),
  userFingerprint
);

/**
 * 30 votes per minute per user (feed browsing can trigger rapid votes)
 */
export const voteRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '1m', max: 30, characteristics: ['userId'] })),
  userFingerprint
);

/**
 * 5 registrations per hour per IP
 */
export const registerRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '1h', max: 5, characteristics: ['ip.src'] }))
);
