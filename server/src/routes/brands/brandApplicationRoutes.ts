import { Router } from 'express';
import {
  submitApplication,
  getApplication,
  getApplications,
  approveApplication,
  rejectApplication,
  getApplicationByEmail,
} from '../../controllers/brands/brandApplicationController';
import { authenticateJWT, AuthenticatedRequest } from '../../middlewares/authMiddleware';
import { authenticateAdmin } from '../../middlewares/adminMiddleware';
import { registerRateLimit } from '../../config/rateLimits';

const router = Router();

// Public — no auth required
router.post('/register', registerRateLimit, submitApplication);
router.get('/status', getApplicationByEmail);

// Admin only
router.get('/applications', authenticateJWT, authenticateAdmin, getApplications);
router.get('/applications/:id', authenticateJWT, authenticateAdmin, getApplication);

router.put('/applications/:id/approve', authenticateJWT, authenticateAdmin, (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  req.body.reviewedBy = user?.email || 'admin';
  return approveApplication(req, res);
});

router.put('/applications/:id/reject', authenticateJWT, authenticateAdmin, (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  req.body.reviewedBy = user?.email || 'admin';
  return rejectApplication(req, res);
});

export default router;
