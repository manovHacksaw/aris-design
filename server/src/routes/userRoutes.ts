import { Router } from 'express';
import { getUsers, getUserById, getUserByUsername, upsertUser, getCurrentUser, updateProfile, checkUsernameAvailability, getUserStats, getUserStatsById, getFollowers, getFollowing, followUser, unfollowUser, updateWalletAddress, saveOnboardingAnalytics, applyReferral, validateReferral, searchUsers, getUserVotedContent } from '../controllers/userController';
import { getSubmissionsByUser } from '../controllers/submissionController';
import { sendOTP, verifyOTP } from '../controllers/emailController';
import { authenticateJWT, authenticateOptional, requireEmailVerification } from '../middlewares/authMiddleware';
import { arcjetMiddleware } from '../middlewares/arcjetMiddleware';
import aj from '../lib/arcjet';
import { fixedWindow } from '@arcjet/node';

const router = Router();

// 3 OTP sends per 5 minutes per user
const otpRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '5m', max: 3, characteristics: ['userId'] })),
  (req) => ({ userId: req.user?.id ?? req.ip ?? 'anon' }),
);

router.get('/me', authenticateJWT, getCurrentUser);
router.get('/me/stats', authenticateJWT, getUserStats);
router.post('/', authenticateJWT, requireEmailVerification, upsertUser);
router.put('/', authenticateJWT, requireEmailVerification, upsertUser);
router.patch('/profile', authenticateJWT, requireEmailVerification, updateProfile);
router.patch('/wallet', authenticateJWT, updateWalletAddress);
router.post('/onboarding-analytics', authenticateJWT, saveOnboardingAnalytics);
router.get('/validate-referral', authenticateJWT, validateReferral);
router.post('/apply-referral', authenticateJWT, applyReferral);
router.post('/email/send-otp', authenticateJWT, otpRateLimit, sendOTP);
router.post('/email/verify-otp', authenticateJWT, verifyOTP);

router.post('/follow/:followingId', authenticateJWT, requireEmailVerification, followUser);
router.delete('/follow/:followingId', authenticateJWT, requireEmailVerification, unfollowUser);

router.get('/me/followers', authenticateJWT, getFollowers);
router.get('/me/following', authenticateJWT, getFollowing);

router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);
router.get('/:userId/stats', getUserStatsById);

router.get('/search', searchUsers);
router.get('/username/:username', getUserByUsername);
router.get('/check-username', checkUsernameAvailability);
router.get('/:userId/submissions', authenticateOptional, getSubmissionsByUser);
router.get('/:userId/voted-content', authenticateOptional, getUserVotedContent);
router.get('/', getUsers);
router.get('/:id', getUserById);

export default router;
