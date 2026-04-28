import { Router } from 'express';
import {
  getApplications,
  getApplication,
  approveApplication,
  rejectApplication,
} from '../../controllers/brands/brandApplicationController';
import {
  approveBrandAndGenerateToken,
  getClaimEmailTemplate,
} from '../../controllers/brands/adminBrandController';
import {
  getDashboardStats,
  getUserActivities,
} from '../../controllers/admin/adminDashboardController';
import { authenticateJWT, AuthenticatedRequest } from '../../middlewares/authMiddleware';
import { authenticateAdmin } from '../../middlewares/adminMiddleware';

const router = Router();

router.use(authenticateJWT, authenticateAdmin);

router.get('/stats', getDashboardStats);
router.get('/activities', getUserActivities);

router.get('/applications', getApplications);
router.get('/applications/:id', getApplication);

router.put('/applications/:id/approve', (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  req.body.reviewedBy = user?.email || 'admin';
  return approveApplication(req, res);
});

router.put('/applications/:id/reject', (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  req.body.reviewedBy = user?.email || 'admin';
  return rejectApplication(req, res);
});

router.post('/brands/:id/approve', approveBrandAndGenerateToken);
router.get('/brands/:id/claim-email-template', getClaimEmailTemplate);

export default router;
