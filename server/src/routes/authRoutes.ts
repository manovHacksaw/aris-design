import { Router } from 'express';
import { logout, privyLogin } from '../controllers/authController';
import { authenticateOptional } from '../middlewares/authMiddleware';

const router = Router();

// Authenticate with Privy token
router.post('/privy-login', privyLogin);

// Logout (requires authentication)
router.post('/logout', authenticateOptional, logout);

export default router;

