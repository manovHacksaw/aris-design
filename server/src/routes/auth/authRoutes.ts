import { Router } from 'express';
import { logout, privyLogin } from '../../controllers/auth/authController.js';
import { authenticateOptional } from '../../middlewares/authMiddleware.js';
import { loginRateLimit } from '../../config/rateLimits.js';

const router = Router();

router.post('/privy-login', loginRateLimit, privyLogin);
router.post('/logout', authenticateOptional, logout);

export default router;
