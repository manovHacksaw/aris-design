import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import {
  initGenderCounts,
  initAgeGroupCounts,
  normalizeGender,
  getAgeGroup,
  computeEntropy,
} from './AnalyticsUtils';

export class AnalyticsBrandService {
  /**
   * Get aggregate analytics for a brand across all its events
   */
  static async getBrandAnalytics(brandId: string) {
    try {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { id: true, name: true },
      });
      if (!brand) throw new Error('Brand not found');

      // Get all events for this brand
      const events = await prisma.event.findMany({
        where: { brandId, isDeleted: false },
        select: {
          id: true,
          title: true,
          eventType: true,
          status: true,
          startTime: true,
          endTime: true,
          category: true,
          capacity: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalEvents = events.length;
      const totalVoteEvents = events.filter((e) => e.eventType === 'vote_only').length;
      const totalPostEvents = events.filter((e) => e.eventType === 'post_and_vote').length;

      // Get analytics for all events
      const eventIds = events.map((e) => e.id);
      const allAnalytics = await prisma.eventAnalytics.findMany({
        where: { eventId: { in: eventIds } },
      });
      const analyticsMap = new Map(allAnalytics.map((a) => [a.eventId, a]));

      // Get all votes for all brand events with user demographics
      const allVotes = await prisma.vote.findMany({
        where: { eventId: { in: eventIds } },
        include: {
          user: { select: { id: true, gender: true, dateOfBirth: true } },
        },
      });

      // Unique participants across all events
      const uniqueUserIds = new Set(allVotes.map((v) => v.userId));
      const totalUniqueParticipants = uniqueUserIds.size;
      const totalVotesAcrossEvents = allVotes.length;

      // Overall demographics
      const overallVotesByGender = initGenderCounts();
      const overallVotesByAgeGroup = initAgeGroupCounts();
      for (const vote of allVotes) {
        const genderKey = normalizeGender(vote.user.gender) as keyof ReturnType<typeof initGenderCounts>;
        const ageKey = getAgeGroup(vote.user.dateOfBirth) as keyof ReturnType<typeof initAgeGroupCounts>;
        overallVotesByGender[genderKey]++;
        overallVotesByAgeGroup[ageKey]++;
      }

      // Get cost for all events
      const allPools = await prisma.eventRewardsPool.findMany({
        where: { eventId: { in: eventIds } },
        select: { eventId: true, totalDisbursed: true },
      });
      const poolMap = new Map(allPools.map((p) => [p.eventId, p]));

      // Per-event summaries with computed metrics
      const eventsSummary = [];
      let totalHistoricalAlignment = 0;
      let totalEntropy = 0;
      let totalNormalizedEntropy = 0;
      let totalWinningMargin = 0;
      let completedEventsWithVotes = 0;

      for (const event of events) {
        const eventAnalytics = analyticsMap.get(event.id);
        const eventVotes = allVotes.filter((v) => v.eventId === event.id);
        const eventTotalVotes = eventVotes.length;

        // Get content for this event
        let contentVoteCounts: number[] = [];
        if (event.eventType === 'post_and_vote') {
          const submissions = await prisma.submission.findMany({
            where: { eventId: event.id, status: { not: 'rejected' } },
            select: { voteCount: true },
          });
          contentVoteCounts = submissions.map((s) => s.voteCount);
        } else {
          const proposals = await prisma.proposal.findMany({
            where: { eventId: event.id },
            select: { voteCount: true },
          });
          contentVoteCounts = proposals.map((p) => p.voteCount);
        }

        const sorted = [...contentVoteCounts].sort((a, b) => b - a);
        const rank1Votes = sorted[0] || 0;
        const rank2Votes = sorted[1] || 0;

        const winningMargin = eventTotalVotes > 0 ? ((rank1Votes - rank2Votes) / eventTotalVotes) * 100 : 0;
        const entropy = computeEntropy(contentVoteCounts, eventTotalVotes);
        const numEntries = contentVoteCounts.length;
        const normalizedEntropy = numEntries > 1 ? entropy / Math.log2(numEntries) : 0;
        const historicalAlignment = eventTotalVotes > 0 ? rank1Votes / eventTotalVotes : 0;
        const topContentVotePercent = eventTotalVotes > 0 ? (rank1Votes / eventTotalVotes) * 100 : 0;

        // Accumulate for averages (only events with votes)
        if (eventTotalVotes > 0 && contentVoteCounts.length > 0) {
          totalHistoricalAlignment += historicalAlignment;
          totalEntropy += entropy;
          totalNormalizedEntropy += normalizedEntropy;
          totalWinningMargin += winningMargin;
          completedEventsWithVotes++;
        }

        // Per-event demographics
        const eventVotesByGender = initGenderCounts();
        const eventVotesByAgeGroup = initAgeGroupCounts();
        for (const vote of eventVotes) {
          const gKey = normalizeGender(vote.user.gender) as keyof ReturnType<typeof initGenderCounts>;
          const aKey = getAgeGroup(vote.user.dateOfBirth) as keyof ReturnType<typeof initAgeGroupCounts>;
          eventVotesByGender[gKey]++;
          eventVotesByAgeGroup[aKey]++;
        }

        const cost = poolMap.get(event.id)?.totalDisbursed || 0;
        const voteCompletionPct = event.capacity ? Math.min(100, (eventTotalVotes / event.capacity) * 100) : 0;

        eventsSummary.push({
          eventId: event.id,
          title: event.title,
          eventType: event.eventType,
          status: event.status,
          category: event.category,
          capacity: event.capacity,
          voteCompletionPct,
          cost,
          totalVotes: eventTotalVotes,
          totalSubmissions: eventAnalytics?.totalSubmissions || 0,
          uniqueParticipants: eventAnalytics?.uniqueParticipants || 0,
          winningMargin,
          entropy,
          normalizedEntropy,
          historicalAlignment,
          topContentVotePercent,
          votesByGender: eventVotesByGender,
          votesByAgeGroup: eventVotesByAgeGroup,
        });
      }

      // Aggregate averages
      const avgHistoricalAlignment = completedEventsWithVotes > 0 ? totalHistoricalAlignment / completedEventsWithVotes : 0;
      const avgEntropy = completedEventsWithVotes > 0 ? totalEntropy / completedEventsWithVotes : 0;
      const avgNormalizedEntropy = completedEventsWithVotes > 0 ? totalNormalizedEntropy / completedEventsWithVotes : 0;
      const avgWinningMargin = completedEventsWithVotes > 0 ? totalWinningMargin / completedEventsWithVotes : 0;

      // Compute average trust score across all unique participants
      let avgParticipantTrustScore = 0.5; // default
      if (uniqueUserIds.size > 0) {
        const participantUsers = await prisma.user.findMany({
          where: { id: { in: [...uniqueUserIds] } },
          select: { trustScore: true },
        });
        const totalTrust = participantUsers.reduce((sum, u) => sum + u.trustScore, 0);
        avgParticipantTrustScore = totalTrust / participantUsers.length;
      }

      // Decision Confidence Score: DCS = (1 - normalizedEntropy) * 0.6 + avgParticipantTrustScore * 0.4
      const decisionConfidenceScore = (1 - avgNormalizedEntropy) * 0.6 + avgParticipantTrustScore * 0.4;

      return {
        totalEvents,
        totalVoteEvents,
        totalPostEvents,
        totalVotesAcrossEvents,
        totalUniqueParticipants,
        averageHistoricalAlignment: avgHistoricalAlignment,
        avgParticipantTrustScore,
        averageEntropy: avgEntropy,
        averageWinningMargin: avgWinningMargin,
        decisionConfidenceScore,
        overallVotesByGender,
        overallVotesByAgeGroup,
        eventsSummary,
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to get brand analytics:');
      throw error;
    }
  }

  /**
   * Get high-level stats for a brand
   */
  static async getBrandStats(ownerId: string) {
    try {
      const brand = await prisma.brand.findFirst({
        where: { ownerId },
        select: { id: true, totalUsdcGiven: true },
      });
      if (!brand) throw new Error('Brand not found');

      const totalEvents = await prisma.event.count({
        where: { brandId: brand.id, isDeleted: false },
      });

      const subscriberCount = await prisma.brandSubscription.count({
        where: { brandId: brand.id },
      });

      return {
        totalEvents,
        subscriberCount,
        totalUsdcSpent: brand.totalUsdcGiven || 0,
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to get brand stats:');
      throw error;
    }
  }

  /**
   * Get time-series metrics across all a brand's events
   */
  static async getBrandTimeseries(brandId: string, metric: string, from?: string, to?: string) {
    try {
      const events = await prisma.event.findMany({
        where: { brandId, isDeleted: false },
        select: { id: true },
      });
      const eventIds = events.map((e) => e.id);

      let dateFilter: any;
      if (from && to) {
        dateFilter = { gte: new Date(from), lte: new Date(to) };
      } else if (from) {
        dateFilter = { gte: new Date(from) };
      } else if (to) {
        dateFilter = { lte: new Date(to) };
      }

      const buckets = new Map<string, number>();

      if (metric === 'views') {
        const views = await prisma.eventInteraction.findMany({
          where: { eventId: { in: eventIds }, type: 'VIEW', ...(dateFilter && { createdAt: dateFilter }) },
          select: { createdAt: true },
        });
        views.forEach((v) => {
          const date = new Date(v.createdAt).toISOString().split('T')[0];
          buckets.set(date, (buckets.get(date) || 0) + 1);
        });
      } else if (metric === 'votes') {
        const votes = await prisma.vote.findMany({
          where: { eventId: { in: eventIds }, ...(dateFilter && { createdAt: dateFilter }) },
          select: { createdAt: true },
        });
        votes.forEach((v) => {
          const date = new Date(v.createdAt).toISOString().split('T')[0];
          buckets.set(date, (buckets.get(date) || 0) + 1);
        });
      } else if (metric === 'posts') {
        const posts = await prisma.submission.findMany({
          where: { eventId: { in: eventIds }, ...(dateFilter && { createdAt: dateFilter }) },
          select: { createdAt: true },
        });
        posts.forEach((p) => {
          const date = new Date(p.createdAt).toISOString().split('T')[0];
          buckets.set(date, (buckets.get(date) || 0) + 1);
        });
      }

      const timeseries = Array.from(buckets.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return timeseries;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get brand timeseries:');
      throw error;
    }
  }

  /**
   * Get click breakdown for all a brand's events
   */
  static async getBrandClicksBreakdown(brandId: string) {
    try {
      const events = await prisma.event.findMany({
        where: { brandId, isDeleted: false },
        select: { id: true },
      });
      const eventIds = events.map((e) => e.id);

      const clicks = await prisma.eventInteraction.findMany({
        where: { eventId: { in: eventIds }, type: 'CLICK' },
        select: { metadata: true },
      });

      const breakdown = { vote: 0, event: 0, website: 0, social: 0, other: 0 };
      clicks.forEach((c) => {
        const target = (c.metadata as any)?.target as string;
        if (target === 'vote' || target === 'vote_button') breakdown.vote++;
        else if (target === 'event') breakdown.event++;
        else if (target === 'website') breakdown.website++;
        else if (target === 'social') breakdown.social++;
        else breakdown.other++;
      });

      return breakdown;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get brand clicks breakdown:');
      throw error;
    }
  }

  /**
   * Track a visit to a brand profile
   */
  static async trackBrandView(brandId: string) {
    try {
      await prisma.brand.update({
        where: { id: brandId },
        data: {
          profileViews: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to track brand view:');
    }
  }

  /**
   * Get brand profile views
   */
  static async getBrandViews(brandId: string) {
    try {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { profileViews: true },
      });
      return { profileViews: brand?.profileViews || 0 };
    } catch (error) {
      logger.error({ err: error }, 'Failed to get brand views:');
      throw error;
    }
  }

  /**
   * Get follower growth over time
   */
  static async getFollowerGrowth(brandId: string, from?: string, to?: string, granularity: string = 'day') {
    try {
      let dateFilter: any;
      if (from && to) {
        dateFilter = { gte: new Date(from), lte: new Date(to) };
      } else if (from) {
        dateFilter = { gte: new Date(from) };
      } else if (to) {
        dateFilter = { lte: new Date(to) };
      }

      const subscriptions = await prisma.brandSubscription.findMany({
        where: { brandId, ...(dateFilter && { subscribedAt: dateFilter }) },
        select: { subscribedAt: true },
        orderBy: { subscribedAt: 'asc' },
      });

      const buckets = new Map<string, number>();

      subscriptions.forEach((s) => {
        let key = '';
        const date = new Date(s.subscribedAt);
        if (granularity === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (granularity === 'week') {
          const day = date.getDay() || 7;
          date.setHours(-24 * (day - 1));
          key = date.toISOString().split('T')[0];
        } else {
          key = date.toISOString().split('T')[0];
        }
        buckets.set(key, (buckets.get(key) || 0) + 1);
      });

      const timeline = Array.from(buckets.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let previous = 0;
      const result = timeline.map((entry) => {
        const data = { date: entry.date, count: entry.count, delta: entry.count - previous };
        previous = entry.count;
        return data;
      });

      return result;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get follower growth:');
      throw error;
    }
  }
}
