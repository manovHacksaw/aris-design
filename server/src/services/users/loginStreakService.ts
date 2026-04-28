import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { MilestoneCategory } from '@prisma/client';
import { XpService } from '../xp/xpService';
import { StreakResult, StreakStatus, ClaimedMilestone } from '../../types/xp';

export class LoginStreakService {
  /**
   * Get UTC midnight date (strips time component)
   */
  private static getUtcMidnight(date: Date = new Date()): Date {
    const utc = new Date(date);
    utc.setUTCHours(0, 0, 0, 0);
    return utc;
  }

  /**
   * Check if two dates are the same UTC day
   */
  private static isSameUtcDay(d1: Date, d2: Date): boolean {
    return this.getUtcMidnight(d1).getTime() === this.getUtcMidnight(d2).getTime();
  }

  /**
   * Check if d1 is exactly one day after d2 (consecutive days)
   */
  private static isConsecutiveDay(current: Date, last: Date): boolean {
    const currentMidnight = this.getUtcMidnight(current);
    const lastMidnight = this.getUtcMidnight(last);

    // Create yesterday from current
    const yesterday = new Date(currentMidnight);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    return lastMidnight.getTime() === yesterday.getTime();
  }

  /**
   * Record a daily login and update streak
   * This is idempotent - calling multiple times on the same day is safe
   */
  static async recordDailyLogin(userId: string): Promise<StreakResult> {
    const today = this.getUtcMidnight();

    // Avoid interactive transactions (unsupported by PgBouncer transaction-mode pooling).
    // Sequential reads + upsert are safe here: the worst-case race is two simultaneous
    // pings on the same day, both of which will be caught by isSameUtcDay early-return.
    const streak = await prisma.userLoginStreak.findUnique({ where: { userId } });

    if (!streak) {
      // First login ever — create record
      await prisma.userLoginStreak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, lastLoginDate: today },
      });
      const streakData = { currentStreak: 1, longestStreak: 1, isNewDay: true, previousStreak: 0, streakBroken: false };
      let newMilestonesClaimed: ClaimedMilestone[] = [];
      try {
        newMilestonesClaimed = await XpService.checkAndClaimMilestones(userId, MilestoneCategory.LOGIN_STREAK, 1);
      } catch (error) {
        logger.error({ err: error }, 'Failed to check login streak milestones:');
      }
      return { ...streakData, newMilestonesClaimed };
    }

    // Idempotent: already logged in today
    if (this.isSameUtcDay(streak.lastLoginDate, today)) {
      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isNewDay: false,
        previousStreak: streak.currentStreak,
        streakBroken: false,
        newMilestonesClaimed: [],
      };
    }

    // New day — compute new streak values
    const isConsecutive = this.isConsecutiveDay(today, streak.lastLoginDate);
    const previousStreak = streak.currentStreak;
    const newStreak = isConsecutive ? streak.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, streak.longestStreak);

    await prisma.userLoginStreak.update({
      where: { userId },
      data: { currentStreak: newStreak, longestStreak: newLongest, lastLoginDate: today },
    });

    const streakData = { currentStreak: newStreak, longestStreak: newLongest, isNewDay: true, previousStreak, streakBroken: !isConsecutive };

    // Check milestones after the update
    let newMilestonesClaimed: ClaimedMilestone[] = [];

    if (streakData.isNewDay) {
      try {
        newMilestonesClaimed = await XpService.checkAndClaimMilestones(
          userId,
          MilestoneCategory.LOGIN_STREAK,
          streakData.currentStreak
        );
      } catch (error) {
        logger.error({ err: error }, 'Failed to check login streak milestones:');
        // Don't fail the login for milestone errors
      }
    }

    return {
      ...streakData,
      newMilestonesClaimed,
    };
  }

  /**
   * Get current streak status for a user
   */
  static async getStreakStatus(userId: string): Promise<StreakStatus | null> {
    const streak = await prisma.userLoginStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      return null;
    }

    return {
      current: streak.currentStreak,
      longest: streak.longestStreak,
      lastLoginDate: streak.lastLoginDate,
    };
  }

  /**
   * Check if user's streak is still active (logged in yesterday or today)
   */
  static async isStreakActive(userId: string): Promise<boolean> {
    const streak = await prisma.userLoginStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      return false;
    }

    const today = this.getUtcMidnight();
    const lastLogin = streak.lastLoginDate;

    // Streak is active if logged in today or yesterday
    if (this.isSameUtcDay(lastLogin, today)) {
      return true;
    }

    return this.isConsecutiveDay(today, lastLogin);
  }

}
