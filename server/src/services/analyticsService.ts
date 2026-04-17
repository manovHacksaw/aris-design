import logger from '../lib/logger';
/**
 * Analytics Service
 * 
 * Tracks event views, votes, submissions, and provides analytics data.
 */

import { prisma } from '../lib/prisma';
import { getActiveCount } from '../socket';

/**
 * Track an event view
 * - Increments total views
 * - Logs activity
 * - Updates unique participants on first view
 */
export const trackEventView = async (eventId: string, userId: string | null): Promise<void> => {
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
        logger.error('Failed to track event view:', error);
        // Don't throw - analytics shouldn't break the app
    }
};

/**
 * Get comprehensive analytics for an event
 */
export const getEventAnalytics = async (eventId: string) => {
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
};

/**
 * Update vote count in analytics
 */
export const trackVote = async (eventId: string): Promise<void> => {
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
        logger.error('Failed to track vote:', error);
    }
};

/**
 * Update submission count in analytics
 */
export const trackSubmission = async (eventId: string): Promise<void> => {
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
        logger.error('Failed to track submission:', error);
    }
};

/**
 * Track an event share
 * - Increments totalShares
 * - Logs EventInteraction with type SHARE
 */
export const trackShare = async (eventId: string, userId: string | null): Promise<void> => {
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
        logger.error('Failed to track share:', error);
    }
};

/**
 * Track a click interaction on an event
 * - Increments totalClicks
 * - Logs EventInteraction with type CLICK and target metadata
 * @param target - What was clicked: 'brand', 'image', 'vote_button'
 */
export const trackClick = async (eventId: string, userId: string | null, target: string): Promise<void> => {
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
        logger.error('Failed to track click:', error);
    }
};

/**
 * Get analytics for multiple events (for dashboard)
 */
export const getBulkEventAnalytics = async (eventIds: string[]) => {
    try {
        const analytics = await prisma.eventAnalytics.findMany({
            where: {
                eventId: { in: eventIds },
            },
        });

        // Create a map for easy lookup
        const analyticsMap = new Map(
            analytics.map(a => [a.eventId, a])
        );

        // Return analytics for each event, with defaults if not found
        return eventIds.map(eventId => {
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
};

/**
 * Get top events by views
 */
export const getTopEventsByViews = async (limit: number = 10) => {
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

        return topEvents.map(analytics => ({
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
};

// --- Helper Functions ---

function getAgeGroup(dateOfBirth: Date | null): string {
    if (!dateOfBirth) return 'unknown';
    const now = new Date();
    const age = Math.floor((now.getTime() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age <= 24) return '24_under';
    if (age <= 34) return '25_34';
    if (age <= 44) return '35_44';
    if (age <= 54) return '45_54';
    if (age <= 64) return '55_64';
    return '65_plus';
}

function normalizeGender(gender: string | null): string {
    if (!gender) return 'unknown';
    const g = gender.toLowerCase().trim();
    if (g === 'male') return 'male';
    if (g === 'female') return 'female';
    if (g === 'non-binary') return 'nonBinary';
    if (g === 'prefer not to say') return 'unknown';
    return 'other';
}

function computeEntropy(voteCounts: number[], totalVotes: number): number {
    if (totalVotes === 0) return 0;
    let entropy = 0;
    for (const count of voteCounts) {
        if (count === 0) continue;
        const p = count / totalVotes;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

function initGenderCounts() {
    return { male: 0, female: 0, nonBinary: 0, other: 0, unknown: 0 };
}

function initAgeGroupCounts() {
    return { '24_under': 0, '25_34': 0, '35_44': 0, '45_54': 0, '55_64': 0, '65_plus': 0, unknown: 0 };
}

/**
 * Get detailed analytics for a single event (with demographics & decision metrics)
 */
export const getDetailedEventAnalytics = async (eventId: string) => {
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
            contentItems = submissions.map(s => ({
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
            contentItems = proposals.map(p => ({
                id: p.id,
                title: p.title,
                voteCount: p.voteCount,
                finalRank: p.finalRank,
            }));
        }

        // Aggregate vote demographics
        const votesByGender = initGenderCounts();
        const votesByAgeGroup = initAgeGroupCounts();

        // Build per-content demographic breakdowns
        const contentVoteMap = new Map<string, { byGender: ReturnType<typeof initGenderCounts>; byAgeGroup: ReturnType<typeof initAgeGroupCounts> }>();
        for (const item of contentItems) {
            contentVoteMap.set(item.id, { byGender: initGenderCounts(), byAgeGroup: initAgeGroupCounts() });
        }

        for (const vote of votes) {
            const genderKey = normalizeGender(vote.user.gender) as keyof ReturnType<typeof initGenderCounts>;
            const ageKey = getAgeGroup(vote.user.dateOfBirth) as keyof ReturnType<typeof initAgeGroupCounts>;

            votesByGender[genderKey]++;
            votesByAgeGroup[ageKey]++;

            // Map vote to content
            const contentId = isPostAndVote ? vote.submissionId : vote.proposalId;
            if (contentId && contentVoteMap.has(contentId)) {
                contentVoteMap.get(contentId)!.byGender[genderKey]++;
                contentVoteMap.get(contentId)!.byAgeGroup[ageKey]++;
            }
        }

        const totalVotes = votes.length;

        // Build content metrics
        const contentMetrics = contentItems.map(item => ({
            id: item.id,
            title: item.title,
            voteCount: item.voteCount,
            votePercentage: totalVotes > 0 ? (item.voteCount / totalVotes) * 100 : 0,
            rank: item.finalRank,
            demographicBreakdown: contentVoteMap.get(item.id) || { byGender: initGenderCounts(), byAgeGroup: initAgeGroupCounts() },
        }));

        // Decision confidence metrics
        const voteCounts = contentItems.map(c => c.voteCount);
        const sorted = [...voteCounts].sort((a, b) => b - a);
        const rank1Votes = sorted[0] || 0;
        const rank2Votes = sorted[1] || 0;

        const winningMargin = totalVotes > 0 ? ((rank1Votes - rank2Votes) / totalVotes) * 100 : 0;
        const entropy = computeEntropy(voteCounts, totalVotes);
        const numEntries = contentItems.length;
        const normalizedEntropy = numEntries > 1 ? entropy / Math.log2(numEntries) : 0;
        const historicalAlignment = totalVotes > 0 ? rank1Votes / totalVotes : 0;
        const topContentVotePercent = totalVotes > 0 ? (rank1Votes / totalVotes) * 100 : 0;

        // Compute average trust score of participants for DCS
        const voterUserIds = [...new Set(votes.map(v => v.userId))];
        let avgParticipantTrustScore = 0.5; // default
        if (voterUserIds.length > 0) {
            const voterUsers = await prisma.user.findMany({
                where: { id: { in: voterUserIds } },
                select: { trustScore: true },
            });
            const totalTrust = voterUsers.reduce((sum, u) => sum + u.trustScore, 0);
            avgParticipantTrustScore = totalTrust / voterUsers.length;
        }

        const voteCompletionPct = event.capacity ? Math.min(100, (totalVotes / event.capacity) * 100) : 0;

        // Views over time (hourly buckets)
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

        // Votes over time (hourly buckets)
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
};

/**
 * Get aggregate analytics for a brand across all its events
 */
export const getBrandAnalytics = async (brandId: string) => {
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
        const totalVoteEvents = events.filter(e => e.eventType === 'vote_only').length;
        const totalPostEvents = events.filter(e => e.eventType === 'post_and_vote').length;

        // Get analytics for all events
        const eventIds = events.map(e => e.id);
        const allAnalytics = await prisma.eventAnalytics.findMany({
            where: { eventId: { in: eventIds } },
        });
        const analyticsMap = new Map(allAnalytics.map(a => [a.eventId, a]));

        // Get all votes for all brand events with user demographics
        const allVotes = await prisma.vote.findMany({
            where: { eventId: { in: eventIds } },
            include: {
                user: { select: { id: true, gender: true, dateOfBirth: true } },
            },
        });

        // Unique participants across all events
        const uniqueUserIds = new Set(allVotes.map(v => v.userId));
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
        const poolMap = new Map(allPools.map(p => [p.eventId, p]));

        // Per-event summaries with computed metrics
        const eventsSummary = [];
        let totalHistoricalAlignment = 0;
        let totalEntropy = 0;
        let totalNormalizedEntropy = 0;
        let totalWinningMargin = 0;
        let completedEventsWithVotes = 0;

        for (const event of events) {
            const eventAnalytics = analyticsMap.get(event.id);
            const eventVotes = allVotes.filter(v => v.eventId === event.id);
            const eventTotalVotes = eventVotes.length;

            // Get content for this event
            let contentVoteCounts: number[] = [];
            if (event.eventType === 'post_and_vote') {
                const submissions = await prisma.submission.findMany({
                    where: { eventId: event.id, status: { not: 'rejected' } },
                    select: { voteCount: true },
                });
                contentVoteCounts = submissions.map(s => s.voteCount);
            } else {
                const proposals = await prisma.proposal.findMany({
                    where: { eventId: event.id },
                    select: { voteCount: true },
                });
                contentVoteCounts = proposals.map(p => p.voteCount);
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
        logger.error('Failed to get brand analytics:', error);
        throw error;
    }
};

/**
 * Get high-level stats for a brand
 */
export const getBrandStats = async (ownerId: string) => {
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
        logger.error('Failed to get brand stats:', error);
        throw error;
    }
};

/**
 * Get time-series metrics across all a brand's events
 */
export const getBrandTimeseries = async (brandId: string, metric: string, from?: string, to?: string) => {
    try {
        const events = await prisma.event.findMany({
            where: { brandId, isDeleted: false },
            select: { id: true },
        });
        const eventIds = events.map(e => e.id);

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
            views.forEach(v => {
                const date = new Date(v.createdAt).toISOString().split('T')[0];
                buckets.set(date, (buckets.get(date) || 0) + 1);
            });
        } else if (metric === 'votes') {
            const votes = await prisma.vote.findMany({
                where: { eventId: { in: eventIds }, ...(dateFilter && { createdAt: dateFilter }) },
                select: { createdAt: true },
            });
            votes.forEach(v => {
                const date = new Date(v.createdAt).toISOString().split('T')[0];
                buckets.set(date, (buckets.get(date) || 0) + 1);
            });
        } else if (metric === 'posts') {
            const posts = await prisma.submission.findMany({
                where: { eventId: { in: eventIds }, ...(dateFilter && { createdAt: dateFilter }) },
                select: { createdAt: true },
            });
            posts.forEach(p => {
                const date = new Date(p.createdAt).toISOString().split('T')[0];
                buckets.set(date, (buckets.get(date) || 0) + 1);
            });
        }

        const timeseries = Array.from(buckets.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return timeseries;
    } catch (error) {
        logger.error('Failed to get brand timeseries:', error);
        throw error;
    }
};

/**
 * Get click breakdown for a specific event
 */
export const getEventClicksBreakdown = async (eventId: string) => {
    try {
        const clicks = await prisma.eventInteraction.findMany({
            where: { eventId, type: 'CLICK' },
            select: { metadata: true },
        });

        const breakdown = { vote: 0, event: 0, website: 0, social: 0, other: 0 };
        clicks.forEach(c => {
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
};

/**
 * Get click breakdown for all a brand's events
 */
export const getBrandClicksBreakdown = async (brandId: string) => {
    try {
        const events = await prisma.event.findMany({
            where: { brandId, isDeleted: false },
            select: { id: true },
        });
        const eventIds = events.map(e => e.id);

        const clicks = await prisma.eventInteraction.findMany({
            where: { eventId: { in: eventIds }, type: 'CLICK' },
            select: { metadata: true },
        });

        const breakdown = { vote: 0, event: 0, website: 0, social: 0, other: 0 };
        clicks.forEach(c => {
            const target = (c.metadata as any)?.target as string;
            if (target === 'vote' || target === 'vote_button') breakdown.vote++;
            else if (target === 'event') breakdown.event++;
            else if (target === 'website') breakdown.website++;
            else if (target === 'social') breakdown.social++;
            else breakdown.other++;
        });

        return breakdown;
    } catch (error) {
        logger.error('Failed to get brand clicks breakdown:', error);
        throw error;
    }
};

/**
 * Track a visit to a brand profile
 */
export const trackBrandView = async (brandId: string) => {
    try {
        await prisma.brand.update({
            where: { id: brandId },
            data: {
                profileViews: { increment: 1 },
            },
        });
    } catch (error) {
        logger.error('Failed to track brand view:', error);
    }
};

/**
 * Get brand profile views
 */
export const getBrandViews = async (brandId: string) => {
    try {
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            select: { profileViews: true },
        });
        return { profileViews: brand?.profileViews || 0 };
    } catch (error) {
        logger.error('Failed to get brand views:', error);
        throw error;
    }
};


/**
 * Get follower growth over time
 */
export const getFollowerGrowth = async (brandId: string, from?: string, to?: string, granularity: string = 'day') => {
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

        subscriptions.forEach(s => {
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
        const result = timeline.map(entry => {
            const data = { date: entry.date, count: entry.count, delta: entry.count - previous };
            previous = entry.count;
            return data;
        });

        return result;
    } catch (error) {
        logger.error('Failed to get follower growth:', error);
        throw error;
    }
};

// Export as service
export const AnalyticsService = {
    trackEventView,
    getEventAnalytics,
    trackVote,
    trackSubmission,
    trackShare,
    trackClick,
    getBulkEventAnalytics,
    getTopEventsByViews,
    getDetailedEventAnalytics,
    getBrandAnalytics,
    getBrandStats,
    getBrandTimeseries,
    getEventClicksBreakdown,
    getBrandClicksBreakdown,
    trackBrandView,
    getBrandViews,
    getFollowerGrowth,
};
