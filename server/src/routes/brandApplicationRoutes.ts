import { Router } from 'express';
import {
  submitApplication,
  getApplication,
  getApplications,
  approveApplication,
  rejectApplication,
  getApplicationByEmail,
} from '../controllers/brandApplicationController';
// import { authenticateToken } from '../middlewares/authMiddleware';
// TODO: Add admin middleware when implemented
// import { requireAdmin } from '../middlewares/adminMiddleware';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// Submit brand application
router.post('/register', submitApplication);

// Check application status by email
router.get('/status', getApplicationByEmail);

/**
 * Admin routes (authentication + admin role required)
 * TODO: Add authentication and admin middleware when implemented
 */

// Get all applications (with optional status filter)
// router.get('/applications', authenticateToken, requireAdmin, getApplications);
router.get('/applications', getApplications);

// Get specific application
// router.get('/applications/:id', authenticateToken, requireAdmin, getApplication);
router.get('/applications/:id', getApplication);

// Approve application
// router.put('/applications/:id/approve', authenticateToken, requireAdmin, approveApplication);
router.put('/applications/:id/approve', approveApplication);

// Reject application
// router.put('/applications/:id/reject', authenticateToken, requireAdmin, rejectApplication);
router.put('/applications/:id/reject', rejectApplication);

export default router;
