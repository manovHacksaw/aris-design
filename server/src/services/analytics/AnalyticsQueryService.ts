import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma.js';
import { getActiveCount } from '../../socket/index.js';
import {
  initGenderCounts,
  initAgeGroupCounts,
  normalizeGender,
  getAgeGroup,
  computeEntropy,
} from './AnalyticsUtils.js';

export class AnalyticsQueryService {
  /**
   * Get basic analytics for an event
   */
  static async getEventAnalytics(eventId: string) {
    try {
      // Get database analytics
      const analytics = await prisma.eventAnalytics.findUnique({
        where: { eventId },
      });

      // Get current viewers from presence service
      const currentViewers = getActiveCount(eventId);

      // If no analytics exist yet, return defaults
      if (!analytics) {
        return {
          totalViews: 0,
          uniqueParticipants: 0,
          totalVotes: 0,
          totalSubmissions: 0,
          totalShares: 0,
          totalClicks: 0,
          currentViewers,
          updatedAt: new Date(),
        };
      }

      return {
        totalViews: analytics.totalViews,
        uniqueParticipants: analytics.uniqueParticipants,
        totalVotes: analytics.totalVotes,
        totalSubmissions: analytics.totalSubmissions,
        totalShares: analytics.totalShares,
        totalClicks: analytics.totalClicks,
        currentViewers,
        updatedAt: analytics.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to get event analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics for multiple events
   */
  static async getBulkEventAnalytics(eventIds: string[]) {
    try {
      const analytics = await prisma.eventAnalytics.findMany({
        where: {
          eventId: { in: eventIds },
        },
      });

      const analyticsMap = new Map(analytics.map((a) => [a.eventId, a]));

      return eventIds.map((eventId) => {
        const data = analyticsMap.get(eventId);
        const currentViewers = getActiveCount(eventId);

        return {
          eventId,
          totalViews: data?.totalViews || 0,
          uniqueParticipants: data?.uniqueParticipants || 0,
          totalVotes: data?.totalVotes || 0,
          totalSubmissions: data?.totalSubmissions || 0,
          currentViewers,
          updatedAt: data?.updatedAt || new Date(),
        };
      });
    } catch (error) {
      logger.error('Failed to get bulk event analytics:', error);
      throw error;
    }
  }

  /**
   * Get top events by views
   */
  static async getTopEventsByViews(limit: number = 10) {
    try {
      const topEvents = await prisma.eventAnalytics.findMany({
        orderBy: {
          totalViews: 'desc',
        },
        take: limit,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              status: true,
              brand: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return topEvents.map((analytics) => ({
        eventId: analytics.eventId,
        eventTitle: analytics.event.title,
        brandName: analytics.event.brand.name,
        totalViews: analytics.totalViews,
        uniqueParticipants: analytics.uniqueParticipants,
        totalVotes: analytics.totalVotes,
        totalSubmissions: analytics.totalSubmissions,
      }));
    } catch (error) {
      logger.error('Failed to get top events by views:', error);
      throw error;
    }
  }

  /**
   * Get detailed analytics for a single event
   */
  static async getDetailedEventAnalytics(eventId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, eventType: true, status: true, brandId: true, capacity: true },
      });
      if (!event) throw new Error('Event not found');

      // Get basic analytics
      const analytics = await prisma.eventAnalytics.findUnique({ where: { eventId } });

      // Get all votes with user demographics
      const votes = await prisma.vote.findMany({
        where: { eventId },
        include: {
          user: { select: { gender: true, dateOfBirth: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Get content items (submissions for post_and_vote, proposals for vote_only)
      const isPostAndVote = event.eventType === 'post_and_vote';
      let contentItems: { id: string; title: string; voteCount: number; finalRank: number | null }[] = [];

      if (isPostAndVote) {
        const submissions = await prisma.submission.findMany({
          where: { eventId, status: { not: 'rejected' } },
          select: { id: true, caption: true, voteCount: true, finalRank: true },
          orderBy: { voteCount: 'desc' },
        });
        contentItems = submissions.map((s) => ({
          id: s.id,
          title: s.caption || 'Untitled',
          voteCount: s.voteCount,
          finalRank: s.finalRank,
        }));
      } else {
        const proposals = await prisma.proposal.findMany({
          where: { eventId },
          select: { id: true, title: true, voteCount: true, finalRank: true },
          orderBy: { voteCount: 'desc' },
        });
        contentItems = proposals.map((p) => ({
          id: p.id,
          title: p.title,
          voteCount: p.voteCount,
          finalRank: p.finalRank,
        }));
      }

      // Aggregate vote demographics
      const votesByGender = initGenderCounts();
      const votesByAgeGroup = initAgeGroupCounts();

      const contentVoteMap = new Map<
        string,
        { byGender: ReturnType<typeof initGenderCounts>; byAgeGroup: ReturnType<typeof initAgeGroupCounts> }
      >();
      for (const item of contentItems) {
        contentVoteMap.set(item.id, { byGender: initGenderCounts(), byAgeGroup: initAgeGroupCounts() });
      }

      for (const vote of votes) {
        const genderKey = normalizeGender(vote.user.gender) as keyof ReturnType<typeof initGenderCounts>;
        const ageKey = getAgeGroup(vote.user.dateOfBirth) as keyof ReturnType<typeof initAgeGroupCounts>;

        votesByGender[genderKey]++;
        votesByAgeGroup[ageKey]++;

        const contentId = isPostAndVote ? vote.submissionId : vote.proposalId;
        if (contentId && contentVoteMap.has(contentId)) {
          contentVoteMap.get(contentId)!.byGender[genderKey]++;
          contentVoteMap.get(contentId)!.byAgeGroup[ageKey]++;
        }
      }

      const totalVotes = votes.length;

      const contentMetrics = contentItems.map((item) => ({
        id: item.id,
        title: item.title,
        voteCount: item.voteCount,
        votePercentage: totalVotes > 0 ? (item.voteCount / totalVotes) * 100 : 0,
        rank: item.finalRank,
        demographicBreakdown: contentVoteMap.get(item.id) || {
          byGender: initGenderCounts(),
          byAgeGroup: initAgeGroupCounts(),
        },
      }));

      const voteCounts = contentItems.map((c) => c.voteCount);
      const sorted = [...voteCounts].sort((a, b) => b - a);
      const rank1Votes = sorted[0] || 0;
      const rank2Votes = sorted[1] || 0;

      const winningMargin = totalVotes > 0 ? ((rank1Votes - rank2Votes) / totalVotes) * 100 : 0;
      const entropy = computeEntropy(voteCounts, totalVotes);
      const numEntries = contentItems.length;
      const normalizedEntropy = numEntries > 1 ? entropy / Math.log2(numEntries) : 0;
      const historicalAlignment = totalVotes > 0 ? rank1Votes / totalVotes : 0;
      const topContentVotePercent = totalVotes > 0 ? (rank1Votes / totalVotes) * 100 : 0;

      const voterUserIds = [...new Set(votes.map((v) => v.userId))];
      let avgParticipantTrustScore = 0.5;
      if (voterUserIds.length > 0) {
        const voterUsers = await prisma.user.findMany({
          where: { id: { in: voterUserIds } },
          select: { trustScore: true },
        });
        const totalTrust = voterUsers.reduce((sum, u) => sum + u.trustScore, 0);
        avgParticipantTrustScore = totalTrust / voterUsers.length;
      }

      const voteCompletionPct = event.capacity ? Math.min(100, (totalVotes / event.capacity) * 100) : 0;

      const viewInteractions = await prisma.eventInteraction.findMany({
        where: { eventId, type: 'VIEW' },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      const viewsOverTime: { timestamp: string; count: number }[] = [];
      if (viewInteractions.length > 0) {
        const hourBuckets = new Map<string, number>();
        for (const v of viewInteractions) {
          const hour = new Date(v.createdAt);
          hour.setMinutes(0, 0, 0);
          const key = hour.toISOString();
          hourBuckets.set(key, (hourBuckets.get(key) || 0) + 1);
        }
        for (const [timestamp, count] of Array.from(hourBuckets.entries()).sort()) {
          viewsOverTime.push({ timestamp, count });
        }
      }

      const votesOverTime: { timestamp: string; count: number }[] = [];
      if (votes.length > 0) {
        const hourBuckets = new Map<string, number>();
        for (const vote of votes) {
          const hour = new Date(vote.createdAt);
          hour.setMinutes(0, 0, 0);
          const key = hour.toISOString();
          hourBuckets.set(key, (hourBuckets.get(key) || 0) + 1);
        }
        for (const [timestamp, count] of Array.from(hourBuckets.entries()).sort()) {
          votesOverTime.push({ timestamp, count });
        }
      }

      return {
        totalViews: analytics?.totalViews || 0,
        totalVotes,
        totalSubmissions: analytics?.totalSubmissions || 0,
        uniqueParticipants: analytics?.uniqueParticipants || 0,
        totalShares: analytics?.totalShares || 0,
        totalClicks: analytics?.totalClicks || 0,
        votesByGender,
        votesByAgeGroup,
        contentMetrics,
        winningMargin,
        entropy,
        normalizedEntropy,
        historicalAlignment,
        avgParticipantTrustScore,
        topContentVotePercent,
        votesOverTime,
        viewsOverTime,
        voteCompletionPct,
        aiSummary: (analytics as any)?.aiSummary || null,
      };
    } catch (error) {
      logger.error('Failed to get detailed event analytics:', error);
      throw error;
    }
  }

  /**
   * Get click breakdown for a specific event
   */
  static async getEventClicksBreakdown(eventId: string) {
    try {
      const clicks = await prisma.eventInteraction.findMany({
        where: { eventId, type: 'CLICK' },
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
      logger.error('Failed to get event clicks breakdown:', error);
      throw error;
    }
  }
}
