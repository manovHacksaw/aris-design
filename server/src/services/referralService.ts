import logger from '../lib/logger';
import { prisma } from '../lib/prisma.js';
import { MilestoneCategory, XpTransactionType, Prisma } from '@prisma/client';
import { XpService } from './xpService.js';
import { ReferralStats, ProcessReferralResult, ClaimedMilestone } from '../types/xp.js';

export class ReferralService {
  // Characters to use in referral codes (avoiding confusing ones like 0/O, 1/I/l)
  private static readonly CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  private static readonly CODE_LENGTH = 8;

  /**
   * Generate a random referral code
   */
  private static generateCode(): string {
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.CODE_CHARS.length);
      code += this.CODE_CHARS[randomIndex];
    }
    return code;
  }

  /**
   * Generate a unique referral code for a user
   * If user already has a code, returns existing one
   */
  static async generateReferralCode(userId: string): Promise<string> {
    // Check if user already has a referral code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate a new unique code
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateCode();

      try {
        await prisma.user.update({
          where: { id: userId },
          data: { referralCode: code },
        });
        return code;
      } catch (error: unknown) {
        // P2002 = unique constraint violation (code already exists)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          attempts++;
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to generate unique referral code after max attempts');
  }

  /**
   * Get user by referral code
   */
  static async getUserByReferralCode(referralCode: string): Promise<{ id: string } | null> {
    const user = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
      select: { id: true },
    });
    return user;
  }

  /**
   * Process a referral when a new user signs up with a referral code
   * Grants base XP to referrer and checks for milestone bonuses
   */
  static async processReferral(
    referredUserId: string,
    referralCode: string
  ): Promise<ProcessReferralResult> {
    // Find the referrer by their code
    const referrer = await this.getUserByReferralCode(referralCode);

    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    // Prevent self-referral
    if (referrer.id === referredUserId) {
      throw new Error('Cannot use your own referral code');
    }

    // Check if user has already been referred
    const existingReferral = await prisma.referral.findUnique({
      where: { referredId: referredUserId },
    });

    if (existingReferral) {
      throw new Error('User has already been referred');
    }

    // Process referral in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create referral record
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: referredUserId,
          xpAwarded: XpService.REFERRAL_BASE_XP,
        },
      });

      // Get referrer's current XP
      const referrerUser = await tx.user.findUnique({
        where: { id: referrer.id },
        select: { xp: true },
      });

      if (!referrerUser) {
        throw new Error('Referrer not found');
      }

      const newXp = referrerUser.xp + XpService.REFERRAL_BASE_XP;
      const { level: newLevel } = XpService.calculateLevel(newXp);

      // Create XP transaction for base referral XP
      await tx.xpTransaction.create({
        data: {
          userId: referrer.id,
          amount: XpService.REFERRAL_BASE_XP,
          type: XpTransactionType.REFERRAL_BASE,
          description: 'Referral bonus',
          metadata: { referredUserId } as Prisma.InputJsonValue,
          balanceAfter: newXp,
        },
      });

      // Update referrer XP
      await tx.user.update({
        where: { id: referrer.id },
        data: { xp: newXp, level: newLevel },
      });

      return {
        referrerId: referrer.id,
        newXp,
      };
    });

    // Check for referral milestones (outside transaction)
    let milestonesClaimed: ClaimedMilestone[] = [];
    try {
      const totalReferrals = await prisma.referral.count({
        where: { referrerId: referrer.id },
      });

      milestonesClaimed = await XpService.checkAndClaimMilestones(
        referrer.id,
        MilestoneCategory.REFERRAL,
        totalReferrals
      );
    } catch (error) {
      logger.error('Failed to check referral milestones:', error);
      // Don't fail the referral for milestone errors
    }

    return {
      success: true,
      baseXpAwarded: XpService.REFERRAL_BASE_XP,
      milestonesClaimed,
      referrerNewXp: result.newXp,
    };
  }

  /**
   * Get referral stats for a user
   */
  static async getReferralStats(userId: string): Promise<ReferralStats> {
    return XpService.getReferralStats(userId);
  }

  /**
   * Get list of users referred by a user
   */
  static async getReferredUsers(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ id: string; createdAt: Date }[]> {
    const { limit = 10, offset = 0 } = options || {};

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        referred: {
          select: {
            id: true,
          },
        },
        createdAt: true,
      },
    });

    return referrals.map((r) => ({
      id: r.referred.id,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Check if a user was referred by someone
   */
  static async wasReferred(userId: string): Promise<boolean> {
    const referral = await prisma.referral.findUnique({
      where: { referredId: userId },
    });
    return referral !== null;
  }

  /**
   * Get referrer info for a user (who referred them)
   */
  static async getReferrer(userId: string): Promise<{ id: string } | null> {
    const referral = await prisma.referral.findUnique({
      where: { referredId: userId },
      select: {
        referrer: {
          select: { id: true },
        },
      },
    });

    return referral?.referrer || null;
  }
}
