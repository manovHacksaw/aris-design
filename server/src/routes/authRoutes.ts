import { Router } from 'express';
import { getNonce, login, verify, logout, privyLogin } from '../controllers/authController';
import { authenticateOptional } from '../middlewares/authMiddleware';

const router = Router();

// Authenticate with Privy token
router.post('/privy-login', privyLogin);

// Get nonce for authentication
router.get('/nonce', getNonce);

// Authenticate with signature
router.post('/login', login);

// Logout (requires authentication)
router.post('/logout', authenticateOptional, logout);

// Verify signature (for testing)
router.post('/verify', verify);

export default router;

