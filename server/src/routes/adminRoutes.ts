import { Router } from 'express';
import {
  getApplications,
  getApplication,
  approveApplication,
  rejectApplication,
} from '../controllers/brandApplicationController';
import {
  approveBrandAndGenerateToken,
  getClaimEmailTemplate,
} from '../controllers/adminBrandController';
import {
  getDashboardStats,
  getUserSessions,
  getUserActivities,
} from '../controllers/adminDashboardController';
import { authenticateAdmin, AdminRequest } from '../middlewares/adminMiddleware';

const router = Router();

/**
 * All admin routes require authentication
 * Use Basic Auth with username: admin, password: admin
 */
router.use(authenticateAdmin);

/**
 * Dashboard Stats
 */
router.get('/stats', getDashboardStats);

/**
 * User Sessions
 */
router.get('/sessions', getUserSessions);

/**
 * User Activities
 */
router.get('/activities', getUserActivities);

/**
 * Get all brand applications
 * Optional query params:
 * - status: PENDING | APPROVED | REJECTED | COMPLETED
 * - limit: number (default 50)
 */
router.get('/applications', getApplications);

/**
 * Get specific application by ID
 */
router.get('/applications/:id', getApplication);

/**
 * Approve a brand application
 * Body: { reviewedBy: string }
 */
router.put('/applications/:id/approve', (req, res) => {
  const adminReq = req as AdminRequest;
  // Set reviewedBy to admin username
  req.body.reviewedBy = adminReq.admin?.username || 'admin';
  return approveApplication(req, res);
});

/**
 * Reject a brand application
 * Body: { reviewedBy: string, reason: string }
 */
router.put('/applications/:id/reject', (req, res) => {
  const adminReq = req as AdminRequest;
  // Set reviewedBy to admin username
  req.body.reviewedBy = adminReq.admin?.username || 'admin';
  return rejectApplication(req, res);
});

/**
 * Approve brand and generate claim token
 * POST /api/admin/brands/:id/approve
 *
 * Returns a copy-paste ready email template with claim link
 */
router.post('/brands/:id/approve', approveBrandAndGenerateToken);

/**
 * Get email template for brand claim
 * GET /api/admin/brands/:id/claim-email-template
 *
 * Returns a copy-paste ready email template if brand has an active claim token
 */
router.get('/brands/:id/claim-email-template', getClaimEmailTemplate);

export default router;
