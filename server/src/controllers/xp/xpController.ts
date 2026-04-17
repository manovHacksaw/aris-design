import logger from '../../lib/logger';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware.js';
import { XpService } from '../../services/xp/xpService.js';
import { LoginStreakService } from '../../services/users/loginStreakService.js';
import { ReferralService } from '../../services/referralService.js';
import { MilestoneService } from '../../services/xp/milestoneService.js';
import {
  LoginPingResponse,
  XpStatusResponse,
  MilestoneProgressResponse,
  ReferralInfoResponse,
  GenerateReferralCodeResponse,
} from '../../types/xp.js';

/**
 * Record daily login and update streak
 * POST /api/xp/login-ping
 */
export const loginPing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Record daily login and get streak result
    const streakResult = await LoginStreakService.recordDailyLogin(userId);

    // Get updated XP status
    const xpStatus = await XpService.getXpStatus(userId);

    const response: LoginPingResponse = {
      success: true,
      streak: {
        current: streakResult.currentStreak,
        longest: streakResult.longestStreak,
        isNewDay: streakResult.isNewDay,
        streakBroken: streakResult.streakBroken,
      },
      milestonesClaimedToday: streakResult.newMilestonesClaimed,
      xp: xpStatus,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in loginPing:');
    res.status(500).json({
      success: false,
      error: 'Failed to record login',
    });
  }
};

/**
 * Get user's full XP status
 * GET /api/xp/me
 */
export const getXpStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const status = await XpService.getFullXpStatus(userId);

    const response: XpStatusResponse = {
      success: true,
      data: status,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getXpStatus:');
    res.status(500).json({
      success: false,
      error: 'Failed to get XP status',
    });
  }
};

/**
 * Get milestone progress for all categories
 * GET /api/xp/milestones
 */
export const getMilestoneProgress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const milestones = await MilestoneService.getMilestoneProgress(userId);

    const response: MilestoneProgressResponse = {
      success: true,
      milestones,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getMilestoneProgress:');
    res.status(500).json({
      success: false,
      error: 'Failed to get milestone progress',
    });
  }
};

/**
 * Get referral info and stats
 * GET /api/xp/referral
 */
export const getReferralInfo = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const stats = await ReferralService.getReferralStats(userId);

    const response: ReferralInfoResponse = {
      success: true,
      referralCode: stats.referralCode,
      stats,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getReferralInfo:');
    res.status(500).json({
      success: false,
      error: 'Failed to get referral info',
    });
  }
};

/**
 * Generate referral code for user
 * POST /api/xp/referral/generate
 */
export const generateReferralCode = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const referralCode = await ReferralService.generateReferralCode(userId);

    const response: GenerateReferralCodeResponse = {
      success: true,
      referralCode,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in generateReferralCode:');
    res.status(500).json({
      success: false,
      error: 'Failed to generate referral code',
    });
  }
};

/**
 * Get user's reward multiplier
 * GET /api/xp/multiplier
 */
export const getRewardMultiplier = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const multiplier = await XpService.getUserRewardMultiplier(userId);

    res.status(200).json({
      success: true,
      multiplier,
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getRewardMultiplier:');
    res.status(500).json({
      success: false,
      error: 'Failed to get reward multiplier',
    });
  }
};

/**
 * Get XP transaction history
 * GET /api/xp/transactions
 */
export const getXpTransactions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { limit = '20', offset = '0' } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { prisma } = await import('../lib/prisma.js');

    const transactions = await prisma.xpTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string, 10), 100),
      skip: parseInt(offset as string, 10),
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        threshold: true,
        description: true,
        balanceAfter: true,
        createdAt: true,
      },
    });

    const total = await prisma.xpTransaction.count({ where: { userId } });

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getXpTransactions:');
    res.status(500).json({
      success: false,
      error: 'Failed to get XP transactions',
    });
  }
};
