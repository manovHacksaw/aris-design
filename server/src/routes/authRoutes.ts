import { Router } from 'express';
import { logout, privyLogin } from '../controllers/authController';
import { authenticateOptional } from '../middlewares/authMiddleware';
import { arcjetMiddleware } from '../middlewares/arcjetMiddleware';
import aj from '../lib/arcjet';
import { fixedWindow } from '@arcjet/node';

const router = Router();

// 10 login attempts per minute per IP
const loginRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '1m', max: 10 })),
);

router.post('/privy-login', loginRateLimit, privyLogin);
router.post('/logout', authenticateOptional, logout);

export default router;
