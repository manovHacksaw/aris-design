import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

/**
 * Get all users
 */
export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserService.getUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await UserService.getUserById(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Get user by Username
 */
export const getUserByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await UserService.getUserByUsername(username);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user by username:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Create or update user
 */
export const upsertUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await UserService.upsertUser(req.body, authReq.user?.id);

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
    console.error('Error upserting user:', error);

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

    const user = await UserService.getUserById(req.user.id);

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
    console.error('Error fetching current user:', error);
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

    const available = await UserService.checkUsernameAvailability(username);
    res.json({ available });
  } catch (error: any) {
    console.error('Error checking username:', error);
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

    const updatedUser = await UserService.updateProfile(req.user.id, req.body);

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
    console.error('Error updating profile:', error);

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
      console.error('[getUserStats Controller] Unauthorized request - no user');
      res.status(401).json({
        success: false,
        error: 'Unauthorized - Please log in'
      });
      return;
    }

    console.log(`[getUserStats Controller] Fetching stats for user: ${req.user.id}`);

    const stats = await UserService.getUserStats(req.user.id);

    console.log(`[getUserStats Controller] Successfully fetched stats for user: ${req.user.id}`);

    // Disable caching for dynamic stats data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[getUserStats Controller] Error:', error);
    console.error('[getUserStats Controller] Error message:', error.message);
    console.error('[getUserStats Controller] Error stack:', error.stack);

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

    const stats = await UserService.getUserStats(userId);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error in getUserStatsById:', error);

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

    const followers = await UserService.getFollowers(userId);

    res.json({
      success: true,
      followers,
    });
  } catch (error: any) {
    console.error('Error in getFollowers:', error);
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

    const following = await UserService.getFollowing(userId);

    res.json({
      success: true,
      following,
    });
  } catch (error: any) {
    console.error('Error in getFollowing:', error);
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

    const result = await UserService.followUser(followerId, followingId);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error in followUser:', error);
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

    const result = await UserService.unfollowUser(followerId, followingId);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error in unfollowUser:', error);
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

    const updatedUser = await UserService.updateWalletAddress(req.user.id, walletAddress);

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
      },
    });
  } catch (error: any) {
    console.error('Error updating wallet address:', error);
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

    await UserService.saveOnboardingAnalytics(req.user.id, {
      adsSeenDaily,
      referralSource,
      joinMotivation,
      socialPlatforms,
      rewardPreference,
      engagementStyle,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving onboarding analytics:', error);
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

    const result = await UserService.validateReferralCode(code.trim().toUpperCase(), req.user.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Validation failed' });
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

    await UserService.applyReferral(req.user.id, referralCode.trim().toUpperCase());
    res.json({ success: true, message: 'Referral applied! Your referrer earned +5 XP.' });
  } catch (error: any) {
    const clientErrors = ['Invalid referral code', 'You cannot use your own referral code', 'You have already used a referral code'];
    const isClientError = clientErrors.some(msg => error.message?.includes(msg));
    res.status(isClientError ? 400 : 500).json({ error: error.message || 'Failed to apply referral' });
  }
};

