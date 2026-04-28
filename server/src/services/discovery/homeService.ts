import { prisma } from '../../lib/prisma.js';
import { calculateEventScore } from './exploreService.js';
import { enforceEventDemographics } from '../../utils/eventUtils.js';

/**
 * Calculates a personalized Home Score for a given user and event.
 * Combines Universal Ranking with user-specific personalization and social proof.
 */
function calculateHomeScore(
    user: any, 
    event: any, 
    followedBrandIds: Set<string>, 
    followedUserIds: Set<string>,
    userStats: { topCategory: string | null }
) {
    // 1. Hard Filters (Strict Exclusion) using central utility
    try {
        enforceEventDemographics(event as any, user as any);
    } catch (e) {
        return -1; // Hide from feed if ineligible
    }

    // 2. Base Universal Score
    let score = calculateEventScore(event);
    if (score < 0) return -1;

    // 3. Priority 1: Followed Brand (+2000)
    if (followedBrandIds.has(event.brandId)) {
        score += 2000;
    }

    // 4. Priority 2: Demographic/Interest Match (Soft Match) (+500)
    const matchesCategory = user.preferredCategories?.some((cat: string) => 
        event.category?.toLowerCase() === cat.toLowerCase() || 
        event.intendedCategories?.includes(cat)
    );
    if (matchesCategory) score += 500;

    // 5. Social Proof (+300)
    // If users the current user follows are participating.
    const followedParticipation = event.submissions?.some((sub: any) => followedUserIds.has(sub.userId));
    if (followedParticipation) score += 300;

    // 6. High "Potential Win" (EV) Boost (+400)
    // PrizePool / (Participants + 1)
    const totalReward = (event.baseReward || 0) + (event.topReward || 0) + (event.leaderboardPool || 0);
    const participants = event._count?.submissions || 0;
    const ev = totalReward / (participants + 1);
    if (ev > 50) score += 400; // Threshold of $50/participant EV

    // 7. Domain Specialty (+400)
    // Boost events in the category where the user has been most active in the past.
    if (userStats.topCategory && event.category === userStats.topCategory) {
        score += 400;
    }

    // 8. Regional Match (+200)
    if (user.region && event.regions?.includes(user.region)) {
        score += 200;
    }

    return score;
}

export class HomeService {
    static async getHomeFeed(userId: string) {
        const startTime = Date.now();
        logger.info(`[HomeService.getHomeFeed] Starting feed generation for user: ${userId}`);

        // 1. Fetch user + brand/social info
        console.time(`[HomeService.getHomeFeed] Query 1: User + Brand + Following - ${userId}`);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                brandSubscriptions: { select: { brandId: true } },
                following: { select: { followingId: true } },
            }
        });
        console.timeEnd(`[HomeService.getHomeFeed] Query 1: User + Brand + Following - ${userId}`);

        if (!user) return { curated: [], voteEvents: [], postEvents: [] };

        // 2. Efficiently calculate top category using groupBy
        console.time(`[HomeService.getHomeFeed] Query 2: Top Category Aggregation - ${userId}`);
        const categoryStats = await prisma.submission.groupBy({
            by: ['eventId'],
            where: { userId },
            _count: true,
        });
        // We need category, but Submission doesn't have category directly. 
        // It's linked to Event. This is a bit tricky with Prisma groupBy.
        // Let's use a simpler approach: fetch unique categories from recently participated events.
        const recentSubmissions = await prisma.submission.findMany({
            where: { userId },
            take: 20,
            select: { event: { select: { category: true } } }
        });
        const categoriesCount: Record<string, number> = {};
        recentSubmissions.forEach(s => {
            if (s.event?.category) {
                categoriesCount[s.event.category] = (categoriesCount[s.event.category] || 0) + 1;
            }
        });
        const topCategory = Object.entries(categoriesCount).sort((a,b) => b[1] - a[1])[0]?.[0] || null;
        console.timeEnd(`[HomeService.getHomeFeed] Query 2: Top Category Aggregation - ${userId}`);

        const followedBrandIds = new Set(user.brandSubscriptions.map(s => s.brandId));
        const followedUserIds = new Set(user.following.map(f => f.followingId));

        // 3. Fetch active events
        console.time(`[HomeService.getHomeFeed] Query 3: Active Events + Brands - ${userId}`);
        const events = await prisma.event.findMany({
            where: { status: { in: ['posting', 'voting'] }, isDeleted: false, blockchainStatus: 'ACTIVE' },
            include: {
                brand: { select: { name: true, level: true, isVerified: true, logoCid: true } },
                _count: { select: { submissions: true, votes: true } },
                // Social proof: check if friends are in this event
                submissions: {
                    where: { userId: { in: Array.from(followedUserIds) } },
                    select: { userId: true },
                    take: 5
                }
            }
        });
        console.timeEnd(`[HomeService.getHomeFeed] Query 3: Active Events + Brands - ${userId}`);

        // 4. Fetch avatar cloud (limited sample to avoid massive RTT)
        console.time(`[HomeService.getHomeFeed] Query 4: Avatar Cloud - ${userId}`);
        const eventIds = events.map(e => e.id);
        const topSubmissions = await prisma.submission.findMany({
            where: { eventId: { in: eventIds }, status: 'approved' },
            select: { eventId: true, userId: true, user: { select: { id: true, avatarUrl: true } } },
            take: 100, // Limit global sample
            orderBy: { createdAt: 'desc' },
        });
        const avatarsByEvent = new Map<string, Array<{ id: string; avatarUrl: string | null }>>();
        for (const sub of topSubmissions) {
            if (!avatarsByEvent.has(sub.eventId)) avatarsByEvent.set(sub.eventId, []);
            const arr = avatarsByEvent.get(sub.eventId)!;
            if (arr.length < 5 && !arr.find(a => a.id === sub.userId)) {
                arr.push({ id: sub.userId, avatarUrl: sub.user?.avatarUrl ?? null });
            }
        }
        console.timeEnd(`[HomeService.getHomeFeed] Query 4: Avatar Cloud - ${userId}`);

        // 5. Ranking
        const rankedEvents = events
            .map(event => ({
                ...event,
                participantAvatars: avatarsByEvent.get(event.id) ?? [],
                homeScore: calculateHomeScore(user, event, followedBrandIds, followedUserIds, { topCategory })
            }))
            .filter(e => e.homeScore >= 0)
            .sort((a,b) => b.homeScore - a.homeScore);

        const totalTime = Date.now() - startTime;
        logger.info(`[HomeService.getHomeFeed] Completed in ${totalTime}ms for user ${userId}`);

        return {
            curated: rankedEvents.slice(0, 15),
            voteEvents: rankedEvents.filter(e => e.eventType === 'vote_only').slice(0, 10),
            postEvents: rankedEvents.filter(e => e.eventType === 'post_and_vote').slice(0, 10)
        };
    }

    static async getHomeContent(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                following: { select: { followingId: true } }
            }
        });

        if (!user) return [];

        const followedUserIds = user.following.map(f => f.followingId);

        // Prioritize content from:
        // 1. Followed Creators
        // 2. High engagement content in matching domains
        return prisma.submission.findMany({
            where: {
                status: 'approved',
                OR: [
                    { userId: { in: followedUserIds } },
                    { event: { category: { in: user.preferredCategories } } }
                ]
            },
            include: {
                user: { select: { username: true, avatarUrl: true, trustScore: true, level: true } },
                event: { select: { title: true, category: true } },
                _count: { select: { votes: true } }
            },
            orderBy: [
                { voteCount: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 50
        });
    }
}
