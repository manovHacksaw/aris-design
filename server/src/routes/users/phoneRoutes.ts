import { Router } from 'express';
import { verifyFirebasePhone, checkPhoneAvailability } from '../../controllers/users/phoneController';
import { authenticateJWT } from '../../middlewares/authMiddleware';

const router = Router();

// Check phone number availability
router.get('/check-availability', authenticateJWT, checkPhoneAvailability);

// Verify Firebase phone token
router.post('/verify-firebase', authenticateJWT, verifyFirebasePhone);

export default router;
