import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';

export class AnalyticsTrackingService {
  /**
   * Track an event view
   */
  static async trackEventView(eventId: string, userId: string | null): Promise<void> {
    try {
      let isFirstView = false;

      // Only check for first view if user is logged in
      if (userId) {
        const previousView = await prisma.activityLog.findFirst({
          where: {
            eventId,
            userId,
            type: 'EVENT_VIEW',
          },
        });
        isFirstView = !previousView;
      }

      // Upsert event analytics - increment total views
      await prisma.eventAnalytics.upsert({
        where: { eventId },
        update: {
          totalViews: { increment: 1 },
          // Increment unique participants only on first view by logged-in user
          ...(userId && isFirstView && { uniqueParticipants: { increment: 1 } }),
        },
        create: {
          eventId,
          totalViews: 1,
          uniqueParticipants: userId ? 1 : 0, // Only count logged-in users as unique
          totalVotes: 0,
          totalSubmissions: 0,
        },
      });

      // Log to ActivityLog for legacy compatibility
      if (userId) {
        await prisma.activityLog.create({
          data: {
            eventId,
            userId,
            type: 'EVENT_VIEW',
            metadata: {
              timestamp: new Date().toISOString(),
              isFirstView,
            },
          },
        });
      }

      // Log to EventInteraction for unified interaction tracking
      await prisma.eventInteraction.create({
        data: {
          eventId,
          userId,
          type: 'VIEW',
          metadata: { timestamp: new Date().toISOString(), isFirstView },
        },
      });

      logger.info(`👁️ Event view tracked: ${eventId} by ${userId ? `user ${userId}` : 'anonymous'} (first: ${isFirstView})`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to track event view:');
      // Don't throw - analytics shouldn't break the app
    }
  }

  /**
   * Update vote count in analytics
   */
  static async trackVote(eventId: string): Promise<void> {
    try {
      await prisma.eventAnalytics.upsert({
        where: { eventId },
        update: {
          totalVotes: { increment: 1 },
        },
        create: {
          eventId,
          totalViews: 0,
          uniqueParticipants: 0,
          totalVotes: 1,
          totalSubmissions: 0,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to track vote:');
    }
  }

  /**
   * Update submission count in analytics
   */
  static async trackSubmission(eventId: string): Promise<void> {
    try {
      await prisma.eventAnalytics.upsert({
        where: { eventId },
        update: {
          totalSubmissions: { increment: 1 },
        },
        create: {
          eventId,
          totalViews: 0,
          uniqueParticipants: 0,
          totalVotes: 0,
          totalSubmissions: 1,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to track submission:');
    }
  }

  /**
   * Track an event share
   */
  static async trackShare(eventId: string, userId: string | null): Promise<void> {
    try {
      await prisma.eventAnalytics.upsert({
        where: { eventId },
        update: {
          totalShares: { increment: 1 },
        },
        create: {
          eventId,
          totalViews: 0,
          uniqueParticipants: 0,
          totalVotes: 0,
          totalSubmissions: 0,
          totalShares: 1,
          totalClicks: 0,
        },
      });

      await prisma.eventInteraction.create({
        data: {
          eventId,
          userId,
          type: 'SHARE',
          metadata: { timestamp: new Date().toISOString() },
        },
      });

      logger.info(`🔗 Share tracked: ${eventId} by ${userId || 'anonymous'}`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to track share:');
    }
  }

  /**
   * Track a click interaction on an event
   */
  static async trackClick(eventId: string, userId: string | null, target: string): Promise<void> {
    try {
      await prisma.eventAnalytics.upsert({
        where: { eventId },
        update: {
          totalClicks: { increment: 1 },
        },
        create: {
          eventId,
          totalViews: 0,
          uniqueParticipants: 0,
          totalVotes: 0,
          totalSubmissions: 0,
          totalShares: 0,
          totalClicks: 1,
        },
      });

      await prisma.eventInteraction.create({
        data: {
          eventId,
          userId,
          type: 'CLICK',
          metadata: { target, timestamp: new Date().toISOString() },
        },
      });

      logger.info(`👆 Click tracked: ${eventId} target=${target} by ${userId || 'anonymous'}`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to track click:');
    }
  }
}
