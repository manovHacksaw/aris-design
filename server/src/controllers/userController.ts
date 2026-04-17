import logger from '../lib/logger';
import { Request, Response } from 'express';
import { UserQueryService } from '../services/users/UserQueryService.js';
import { UserMutationService } from '../services/users/UserMutationService.js';
import { UserStatsService } from '../services/users/UserStatsService.js';
import { UserSocialService } from '../services/users/UserSocialService.js';
import { UserReferralService } from '../services/users/UserReferralService.js';
import { VoteService } from '../services/voteService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

/**
 * Search users by username or display name
 * GET /api/users/search?q=...
 */
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string) || "";
    const take = Math.min(Number(req.query.take) || 20, 50);
    const results = await UserQueryService.searchUsers(q, take);
    res.json({ results });
  } catch (error) {
    logger.error({ err: error }, 'Error searching users:');
    res.status(500).json({ error: 'Search failed' });
  }
};

/**
 * Get all users
 */
export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserQueryService.getUsers();
    res.json(users);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching users:');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await UserQueryService.getUserById(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user:');
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Get user by Username
 */
export const getUserByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await UserQueryService.getUserByUsername(username);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user by username:');
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Create or update user
 */
export const upsertUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await UserMutationService.upsertUser(req.body, authReq.user?.id);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        walletAddress: user.walletAddress,
        preferredBrands: user.preferredBrands,
        preferredCategories: user.preferredCategories,
        isOnboarded: user.isOnboarded,
        xp: user.xp,
        socialLinks: user.socialLinks,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        currentStreak: (user as any).loginStreak?.currentStreak || 0,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error upserting user:');

    if (error.code === 'P2002') {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    res.status(error.message === 'Email is required when not authenticated' || error.message === 'User not found' ? 400 : 500).json({
      error: error.message || 'Failed to save user data',
    });
  }
};

/**
 * Get current authenticated user's profile
 */
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await UserQueryService.getUserById(req.user.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified,
      walletAddress: user.walletAddress,
      preferredBrands: user.preferredBrands,
      preferredCategories: user.preferredCategories,
      isOnboarded: user.isOnboarded,
      xp: user.xp,
      socialLinks: user.socialLinks,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      referralCode: user.referralCode,
      ownedBrands: user.ownedBrands,
      currentStreak: (user as any).loginStreak?.currentStreak || 0,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching current user:');
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Check if username is available
 */
export const checkUsernameAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const available = await UserQueryService.checkUsernameAvailability(username);
    res.json({ available });
  } catch (error: any) {
    logger.error({ err: error }, 'Error checking username:');
    res.status(400).json({ error: error.message || 'Failed to check username availability' });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updatedUser = await UserMutationService.updateProfile(req.user.id, req.body);

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
        bio: updatedUser.bio,
        phoneNumber: updatedUser.phoneNumber,
        phoneVerified: updatedUser.phoneVerified,
        emailVerified: updatedUser.emailVerified,
        walletAddress: updatedUser.walletAddress,
        preferredBrands: updatedUser.preferredBrands,
        preferredCategories: updatedUser.preferredCategories,
        isOnboarded: updatedUser.isOnboarded,
        xp: updatedUser.xp,
        socialLinks: updatedUser.socialLinks,
        lastLoginAt: updatedUser.lastLoginAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth,
        role: updatedUser.role,
        currentStreak: (updatedUser as any).loginStreak?.currentStreak || 0,
        web3Level: (updatedUser as any).web3Level,
        intentGoals: (updatedUser as any).intentGoals,
        contentFormat: (updatedUser as any).contentFormat,
        creatorCategories: (updatedUser as any).creatorCategories,
        onboardingStep: (updatedUser as any).onboardingStep,
        referralCode: updatedUser.referralCode,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating profile:');

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      let message = 'This value is already taken';

      if (field === 'username') {
        message = 'Username is already taken';
      } else if (field === 'phoneNumber') {
        message = 'Phone number is already registered to another account';
      } else if (field === 'email') {
        message = 'Email is already registered';
      }

      res.status(409).json({ error: message });
      return;
    }

    // Handle custom error messages
    const statusCode = error.message.includes('already taken') || error.message.includes('already registered') ? 409 : 400;
    res.status(statusCode).json({
      error: error.message || 'Failed to update profile',
    });
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      logger.error('[getUserStats Controller] Unauthorized request - no user');
      res.status(401).json({
        success: false,
        error: 'Unauthorized - Please log in'
      });
      return;
    }

    logger.info(`[getUserStats Controller] Fetching stats for user: ${req.user.id}`);

    const stats = await UserStatsService.getUserStats(req.user.id);

    logger.info(`[getUserStats Controller] Successfully fetched stats for user: ${req.user.id}`);

    // Disable caching for dynamic stats data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[getUserStats Controller] Error:');
    logger.error('[getUserStats Controller] Error message:', error.message);
    logger.error('[getUserStats Controller] Error stack:', error.stack);

    // Provide more specific error messages
    if (error.message === 'User not found') {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get public user statistics by ID
 */
export const getUserStatsById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    const stats = await UserStatsService.getUserStats(userId);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in getUserStatsById:');

    if (error.message === 'User not found') {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
    });
  }
};

/**
 * Get user followers
 */
/**
 * Get user followers
 */
export const getFollowers = async (req: Request, res: Response): Promise<void> => {
  try {
    let { userId } = req.params;

    // Handle "me" alias or missing userId (when hitting /me/followers)
    if (!userId || userId === 'me') {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        userId = authReq.user.id;
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
    }

    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    const followers = await UserSocialService.getFollowers(userId);

    res.json({
      success: true,
      followers,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in getFollowers:');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch followers'
    });
  }
};

/**
 * Get user following
 */
export const getFollowing = async (req: Request, res: Response): Promise<void> => {
  try {
    let { userId } = req.params;

    // Handle "me" alias or missing userId (when hitting /me/following)
    if (!userId || userId === 'me') {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        userId = authReq.user.id;
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
    }

    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    const following = await UserSocialService.getFollowing(userId);

    res.json({
      success: true,
      following,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in getFollowing:');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch following'
    });
  }
};

/**
 * Follow a user
 */
export const followUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const followerId = req.user?.id;
    const { followingId } = req.params;

    if (!followerId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!followingId) {
      res.status(400).json({ success: false, error: 'Target user ID is required' });
      return;
    }

    const result = await UserSocialService.followUser(followerId, followingId);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    logger.error({ err: error }, 'Error in followUser:');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to follow user'
    });
  }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const followerId = req.user?.id;
    const { followingId } = req.params;

    if (!followerId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!followingId) {
      res.status(400).json({ success: false, error: 'Target user ID is required' });
      return;
    }

    const result = await UserSocialService.unfollowUser(followerId, followingId);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    logger.error({ err: error }, 'Error in unfollowUser:');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unfollow user'
    });
  }
};

/**
 * Update user's wallet address (smart account address)
 * Called when smart account is created to sync with backend
 */
export const updateWalletAddress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { walletAddress } = req.body;

    if (!walletAddress || typeof walletAddress !== 'string') {
      res.status(400).json({ success: false, error: 'Wallet address is required' });
      return;
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(400).json({ success: false, error: 'Invalid wallet address format' });
      return;
    }

    const updatedUser = await UserMutationService.updateWalletAddress(req.user.id, walletAddress);

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating wallet address:');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update wallet address',
    });
  }
};

/**
 * Save onboarding analytics (analytics-only, not exposed back to user)
 */
export const saveOnboardingAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { adsSeenDaily, referralSource, joinMotivation, socialPlatforms, rewardPreference, engagementStyle } = req.body;

    await UserMutationService.saveOnboardingAnalytics(req.user.id, {
      adsSeenDaily,
      referralSource,
      joinMotivation,
      socialPlatforms,
      rewardPreference,
      engagementStyle,
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, 'Error saving onboarding analytics:');
    res.status(500).json({ success: false, error: error.message || 'Failed to save analytics' });
  }
};

/**
 * Validate a referral code (read-only, no side effects)
 */
export const validateReferral = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { code } = req.query;
    if (!code || typeof code !== 'string') { res.status(400).json({ error: 'code is required' }); return; }

    const result = await UserReferralService.validateReferralCode(code.trim().toUpperCase(), req.user.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Validation failed' });
  }
};

/**
 * Get content voted for by a user — used on public profile
 * GET /api/users/:userId/voted-content
 */
export const getUserVotedContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const content = await VoteService.getVotedContentByUser(userId, requestingUserId);
    res.json({ success: true, content });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in getUserVotedContent:');
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch voted content' });
  }
};

/**
 * Apply a referral code for the authenticated user
 */
export const applyReferral = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { referralCode } = req.body;
    if (!referralCode || typeof referralCode !== 'string') {
      res.status(400).json({ error: 'referralCode is required' });
      return;
    }

    await UserReferralService.applyReferral(req.user.id, referralCode.trim().toUpperCase());
    res.json({ success: true, message: 'Referral applied! Your referrer earned +5 XP.' });
  } catch (error: any) {
    const clientErrors = ['Invalid referral code', 'You cannot use your own referral code', 'You have already used a referral code'];
    const isClientError = clientErrors.some(msg => error.message?.includes(msg));
    res.status(isClientError ? 400 : 500).json({ error: error.message || 'Failed to apply referral' });
  }
};

