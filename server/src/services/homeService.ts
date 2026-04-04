import { prisma } from '../lib/prisma.js';
import { calculateEventScore } from './exploreService.js';
import { enforceEventDemographics } from '../utils/eventUtils.js';

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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                brandSubscriptions: { select: { brandId: true } },
                following: { select: { followingId: true } },
                submissions: { select: { event: { select: { category: true } } } }
            }
        });

        if (!user) return { curated: [], voteEvents: [], postEvents: [] };

        const followedBrandIds = new Set(user.brandSubscriptions.map(s => s.brandId));
        const followedUserIds = new Set(user.following.map(f => f.followingId));

        const categoriesCount: Record<string, number> = {};
        user.submissions.forEach(s => {
            if (s.event?.category) {
                categoriesCount[s.event.category] = (categoriesCount[s.event.category] || 0) + 1;
            }
        });
        const topCategory = Object.entries(categoriesCount).sort((a,b) => b[1] - a[1])[0]?.[0] || null;

        const events = await prisma.event.findMany({
            where: { status: { in: ['posting', 'voting'] }, isDeleted: false },
            include: {
                brand: { select: { name: true, level: true, isVerified: true } },
                _count: { select: { submissions: true, votes: true } },
                submissions: { where: { userId: { in: Array.from(followedUserIds) } }, select: { userId: true } }
            }
        });

        const rankedEvents = events
            .map(event => ({
                ...event,
                homeScore: calculateHomeScore(user, event, followedBrandIds, followedUserIds, { topCategory })
            }))
            .filter(e => e.homeScore >= 0)
            .sort((a,b) => b.homeScore - a.homeScore);

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
