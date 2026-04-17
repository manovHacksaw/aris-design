import { Router } from 'express';
import {
    subscribeToBrand,
    unsubscribeFromBrand,
    getSubscriptionStatus,
    getMySubscriptions,
    getBrandSubscribers,
    getSubscriberCount
} from '../../controllers/social/subscriptionController';
import { authenticateJWT, authenticateOptional } from '../../middlewares/authMiddleware';

const router = Router();

// User subscription routes (require authentication)
router.post('/:brandId', authenticateJWT, subscribeToBrand);
router.delete('/:brandId', authenticateJWT, unsubscribeFromBrand);
router.get('/:brandId/status', authenticateOptional, getSubscriptionStatus); // Optional auth - works for logged-in and non-logged-in users
router.get('/my-subscriptions', authenticateJWT, getMySubscriptions);

// Brand owner routes (require authentication)
router.get('/brand/:brandId/subscribers', authenticateJWT, getBrandSubscribers);

// Public routes
router.get('/brand/:brandId/count', getSubscriberCount);

export default router;
