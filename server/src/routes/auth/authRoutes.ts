import { Router } from 'express';
import { logout, privyLogin } from '../../controllers/auth/authController';
import { authenticateOptional } from '../../middlewares/authMiddleware';
import { loginRateLimit } from '../../config/rateLimits';

const router = Router();

router.post('/privy-login', loginRateLimit, privyLogin);
router.post('/logout', authenticateOptional, logout);

export default router;
