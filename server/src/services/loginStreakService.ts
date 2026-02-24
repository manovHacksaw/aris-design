import { prisma } from '../lib/prisma.js';
import { MilestoneCategory } from '@prisma/client';
import { XpService } from './xpService.js';
import { StreakResult, StreakStatus, ClaimedMilestone } from '../types/xp.js';

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

    // Use transaction to ensure consistency
    const streakData = await prisma.$transaction(async (tx) => {
      // Get or create streak record
      let streak = await tx.userLoginStreak.findUnique({
        where: { userId },
      });

      if (!streak) {
        // First login ever - create streak record
        streak = await tx.userLoginStreak.create({
          data: {
            userId,
            currentStreak: 1,
            longestStreak: 1,
            lastLoginDate: today,
          },
        });

        return {
          currentStreak: 1,
          longestStreak: 1,
          isNewDay: true,
          previousStreak: 0,
          streakBroken: false,
        };
      }

      // Check if already logged in today (idempotent)
      if (this.isSameUtcDay(streak.lastLoginDate, today)) {
        // Same day - no streak update needed
        return {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          isNewDay: false,
          previousStreak: streak.currentStreak,
          streakBroken: false,
        };
      }

      // New day - check if streak continues or breaks
      const isConsecutive = this.isConsecutiveDay(today, streak.lastLoginDate);
      const previousStreak = streak.currentStreak;

      let newStreak: number;
      let streakBroken: boolean;

      if (isConsecutive) {
        // Streak continues
        newStreak = streak.currentStreak + 1;
        streakBroken = false;
      } else {
        // Streak breaks - start fresh
        newStreak = 1;
        streakBroken = true;
      }

      const newLongest = Math.max(newStreak, streak.longestStreak);

      // Update streak record
      await tx.userLoginStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastLoginDate: today,
        },
      });

      return {
        currentStreak: newStreak,
        longestStreak: newLongest,
        isNewDay: true,
        previousStreak,
        streakBroken,
      };
    });

    // After transaction, check milestones (outside transaction for performance)
    let newMilestonesClaimed: ClaimedMilestone[] = [];

    if (streakData.isNewDay) {
      try {
        newMilestonesClaimed = await XpService.checkAndClaimMilestones(
          userId,
          MilestoneCategory.LOGIN_STREAK,
          streakData.currentStreak
        );
      } catch (error) {
        console.error('Failed to check login streak milestones:', error);
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

  /**
   * Initialize login streak from session history (for backfill)
   */
  static async initializeFromSessionHistory(userId: string): Promise<StreakResult> {
    // Get session history ordered by date
    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (sessions.length === 0) {
      // No sessions - no streak to initialize
      return {
        currentStreak: 0,
        longestStreak: 0,
        isNewDay: false,
        newMilestonesClaimed: [],
      };
    }

    // Get unique login days
    const uniqueDays = new Set<string>();
    for (const session of sessions) {
      const day = this.getUtcMidnight(session.createdAt).toISOString().split('T')[0];
      uniqueDays.add(day);
    }

    // Convert to sorted array (newest first)
    const sortedDays = Array.from(uniqueDays).sort().reverse();

    // Calculate current streak from most recent day
    let currentStreak = 0;
    const today = this.getUtcMidnight();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    let lastStreakDay: Date | null = null;

    for (let i = 0; i < sortedDays.length; i++) {
      const dayDate = new Date(sortedDays[i] + 'T00:00:00.000Z');

      if (i === 0) {
        // First day - check if it's today or yesterday
        if (
          this.isSameUtcDay(dayDate, today) ||
          this.isSameUtcDay(dayDate, yesterday)
        ) {
          currentStreak = 1;
          lastStreakDay = dayDate;
        } else {
          // Too old - no active streak
          break;
        }
      } else {
        // Check if consecutive to previous day in streak
        if (lastStreakDay && this.isConsecutiveDay(lastStreakDay, dayDate)) {
          currentStreak++;
          lastStreakDay = dayDate;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak (simplified - walk through all days)
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDay: Date | null = null;

    // Walk from oldest to newest
    const chronologicalDays = sortedDays.slice().reverse();
    for (const dayStr of chronologicalDays) {
      const dayDate = new Date(dayStr + 'T00:00:00.000Z');

      if (prevDay === null) {
        tempStreak = 1;
      } else {
        // Check if this day is consecutive to previous
        const nextExpected = new Date(prevDay);
        nextExpected.setUTCDate(nextExpected.getUTCDate() + 1);

        if (this.isSameUtcDay(dayDate, nextExpected)) {
          tempStreak++;
        } else {
          // Streak broken - start new one
          tempStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      prevDay = dayDate;
    }

    // Update or create streak record
    const lastLoginDate = sortedDays.length > 0
      ? new Date(sortedDays[0] + 'T00:00:00.000Z')
      : today;

    await prisma.userLoginStreak.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak,
        longestStreak,
        lastLoginDate,
      },
      update: {
        currentStreak,
        longestStreak,
        lastLoginDate,
      },
    });

    // Check milestones for the current streak
    let newMilestonesClaimed: ClaimedMilestone[] = [];
    if (currentStreak > 0) {
      try {
        newMilestonesClaimed = await XpService.checkAndClaimMilestones(
          userId,
          MilestoneCategory.LOGIN_STREAK,
          currentStreak
        );
      } catch (error) {
        console.error('Failed to check login streak milestones during backfill:', error);
      }
    }

    return {
      currentStreak,
      longestStreak,
      isNewDay: false,
      newMilestonesClaimed,
    };
  }
}
