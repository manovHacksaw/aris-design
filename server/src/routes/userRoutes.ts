import { Router } from 'express';
import { getUsers, getUserById, getUserByUsername, upsertUser, getCurrentUser, updateProfile, checkUsernameAvailability, getUserStats, getUserStatsById, getFollowers, getFollowing, followUser, unfollowUser, updateWalletAddress } from '../controllers/userController';
import { getSubmissionsByUser } from '../controllers/submissionController';
import { sendOTP, verifyOTP } from '../controllers/emailController';
import { authenticateJWT, requireEmailVerification } from '../middlewares/authMiddleware';

const router = Router();

// Protected routes - require JWT authentication (must be defined before /:id)
router.get('/me', authenticateJWT, getCurrentUser); // Get current authenticated user
router.get('/me/stats', authenticateJWT, getUserStats); // Get current user statistics
router.post('/', authenticateJWT, requireEmailVerification, upsertUser); // Create or update user (protected)
router.put('/', authenticateJWT, requireEmailVerification, upsertUser); // Alternative PUT method for upsert (protected)
router.patch('/profile', authenticateJWT, requireEmailVerification, updateProfile); // Update user profile
router.patch('/wallet', authenticateJWT, updateWalletAddress); // Update wallet address (no email verification required)
router.post('/email/send-otp', authenticateJWT, sendOTP); // Send email OTP
router.post('/email/verify-otp', authenticateJWT, verifyOTP); // Verify email OTP

// User Follow System
router.post('/follow/:followingId', authenticateJWT, requireEmailVerification, followUser);
router.delete('/follow/:followingId', authenticateJWT, requireEmailVerification, unfollowUser);

router.get('/me/followers', authenticateJWT, getFollowers);
router.get('/me/following', authenticateJWT, getFollowing);

router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);
router.get('/:userId/stats', getUserStatsById); // Public user stats

// Public routes (/:id must be last to avoid matching /me)
router.get('/username/:username', getUserByUsername); // Get user by username
router.get('/check-username', checkUsernameAvailability); // Check username availability
router.get('/:userId/submissions', getSubmissionsByUser); // Get user submissions
router.get('/', getUsers);
router.get('/:id', getUserById);

export default router;

