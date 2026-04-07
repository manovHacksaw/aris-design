import { prisma } from '../lib/prisma.js';
import { enforceEventDemographics } from '../utils/eventUtils.js';

/**
 * Universal Ranking Algorithm for Events
 * Prioritizes: Active status, Higher Prize Pools, Urgency (ending soon), Trending Engagement, and Recency.
 */
export function calculateEventScore(event: any) {
    let score = 0;

    // 1. Status Weight (Base: 1000)
    // 'posting' means users can submit content, 'voting' means engagement is peaking.
    if (event.status === 'posting') score += 1000;
    else if (event.status === 'voting') score += 800;
    else if (event.status === 'completed') score += 0; // Natural ranking for closed events
    else return -1; 

    // 2. Prize Pool Weight (Max: 500)
    // Total value of the reward pool
    const totalReward = (event.baseReward || 0) + (event.topReward || 0) + (event.leaderboardPool || 0);
    // Logarithmic scale to prevent extreme outliers from dominating. $10k ≈ 500 points.
    score += Math.min(500, Math.log10(totalReward + 1) * 125);

    // 3. Urgency Weight (Max: 300)
    // Boost events that are ending in the next 48 hours to create FOMO.
    const now = Date.now();
    const endTime = new Date(event.endTime).getTime();
    const hoursLeft = (endTime - now) / (1000 * 60 * 60);
    if (hoursLeft > 0 && hoursLeft < 48) {
        score += (48 - hoursLeft) * (300 / 48);
    }

    // 4. Engagement / Trending Weight (Max: 200)
    // Calculate interaction density over current duration.
    const startTime = new Date(event.startTime).getTime();
    const hoursActive = Math.max(1, (now - startTime) / (1000 * 60 * 60));
    const submissionsCount = event._count?.submissions || 0;
    const votesCount = event._count?.votes || 0;
    // Submissions carry more weight than votes.
    const engagementDensity = ((submissionsCount * 5) + votesCount) / hoursActive;
    score += Math.min(200, engagementDensity * 50);

    // 5. Recency Weight (Max: 200)
    // Decay boost for the first 72 hours after creation.
    const createdAt = new Date(event.createdAt).getTime();
    const hoursOld = (now - createdAt) / (1000 * 60 * 60);
    if (hoursOld < 72) {
        score += (72 - hoursOld) * (200 / 72);
    }

    // 6. Brand Factor (Max: 150)
    if (event.brand?.isVerified) score += 100;
    score += (event.brand?.level || 0) * 10;

    return score;
}

/**
 * Universal Ranking Algorithm for Brands
 * Prioritizes: Verification status, Active event scores, and total platform contribution.
 */
export function calculateBrandScore(brand: any) {
    let score = 0;

    // 1. Active Presence (Max: 1000)
    // Sum of scores of all currently active events.
    const eventTotalScore = (brand.events || []).reduce((acc: number, ev: any) => {
        const evScore = calculateEventScore(ev);
        return acc + (evScore > 0 ? evScore : 0);
    }, 0);
    score += Math.min(1000, eventTotalScore);

    // 2. Trust factor (Base: 500)
    if (brand.isVerified) score += 300;
    score += (brand.level || 0) * 40;

    // 3. Historical Impact (Base: 300)
    // Based on total USDC rewards distributed to users.
    score += Math.min(300, Math.log10((brand.totalUsdcGiven || 0) + 1) * 60);

    return score;
}

/**
 * Universal Ranking Algorithm for Creators
 * Prioritizes: Frequency of posts, Quality/Engagement, Trust Score, and Recency.
 */
function calculateCreatorScore(user: any) {
    let score = 0;

    // 1. Frequency (Max: 500)
    // Based on total submissions made.
    score += Math.min(500, (user.totalSubmissions || 0) * 50);

    // 2. Engagement / Quality (Max: 300)
    // Based on total votes received and interaction level.
    score += Math.min(300, (user.totalVotes || 0) * 2);

    // 3. Trust & Rank (Max: 200)
    score += (user.trustScore || 0.5) * 100;
    score += (user.level || 1) * 20;

    // 4. Recency (Max: 200)
    // Boost users who logged in recently to keep the feed fresh.
    if (user.lastLoginAt) {
        const hoursSinceLogin = (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLogin < 168) { // Within 1 week
            score += (168 - hoursSinceLogin) * (200 / 168);
        }
    }

    return score;
}

export const ExploreService = {
    /**
     * Get explore events including trending, domain-grouped events, and closed events.
     * Applies hard filters if userId is provided.
     */
    async getExploreEvents(userId?: string, options: { category?: string, search?: string, sort?: string, status?: string, type?: string } = {}) {
        try {
            // Fetch current user demographics if logged in
            let currentUser = null;
            if (userId) {
                currentUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { gender: true, dateOfBirth: true }
                });
            }

            // 1. Determine base status filter
            // If user explicitly asks for CLOSED, we fetch completed. Otherwise, we fetch posting/voting.
            const isClosedRequest = options.status === 'CLOSED';
            const statusFilter = isClosedRequest ? ['completed'] : ['posting', 'voting'];

            const allLiveWhere: any = {
                isDeleted: false,
                status: { in: statusFilter }
            };

            // 2. Type Filter (Post vs Vote)
            if (options.type === 'POST') {
                allLiveWhere.status = 'posting';
            } else if (options.type === 'VOTE') {
                allLiveWhere.status = 'voting';
            }

            if (options.search) {
                allLiveWhere.OR = [
                    { title: { contains: options.search, mode: 'insensitive' } },
                    { brand: { name: { contains: options.search, mode: 'insensitive' } } }
                ];
            }

            const allLive = await prisma.event.findMany({
                where: allLiveWhere,
                include: {
                    brand: { select: { id: true, name: true, logoCid: true, categories: true, isVerified: true, level: true } },
                    _count: { select: { submissions: true, votes: true } }
                }
            });

            const CATEGORY_ALIASES: Record<string, string> = {
                'TECHNOLOGY': 'TECH',
                'BLOCKCHAIN': 'WEB3',
                'CRYPTO': 'WEB3',
                'ARTIFICIAL INTELLIGENCE': 'AI',
                'MACHINE LEARNING': 'AI',
                'GRAPHIC DESIGN': 'DESIGN',
                'UI/UX': 'DESIGN',
                'FOOD & BEVERAGE': 'FOOD',
                'FOOD AND BEVERAGE': 'FOOD',
            };

            const filteredLive = allLive.filter(event => {
                try {
                    enforceEventDemographics(event as any, currentUser as any);
                    
                    if (options.category && options.category !== 'ALL' && options.category !== 'CLOSED') {
                        const eventCategories = event.brand?.categories || ['OTHER'];
                        const mappedCategories = eventCategories.map((c: string) => CATEGORY_ALIASES[c.toUpperCase()] ?? c.toUpperCase());
                        if (!mappedCategories.includes(options.category.toUpperCase())) {
                            return false;
                        }
                    }

                    return true;
                } catch (e) {
                    return false;
                }
            });

            // 2. Apply Universal Ranking
            const scoredEvents = filteredLive.map(event => ({
                ...event,
                rankScore: calculateEventScore(event)
            })).sort((a, b) => {
                if (options.sort === 'REWARD' || options.sort === 'BUDGET') {
                    const rewardA = (a.baseReward || 0) + (a.topReward || 0) + (a.leaderboardPool || 0);
                    const rewardB = (b.baseReward || 0) + (b.topReward || 0) + (b.leaderboardPool || 0);
                    return rewardB - rewardA || b.rankScore - a.rankScore;
                }
                if (options.sort === 'NEWEST') {
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                }
                return b.rankScore - a.rankScore;
            });

            // 3. Attach participant avatars (top 5 per event, submitters first then voters)
            const liveEventIds = scoredEvents.map((e: any) => e.id);
            const [submitterRows, voterRows] = await Promise.all([
                prisma.submission.findMany({
                    where: { eventId: { in: liveEventIds }, status: 'active' },
                    select: { eventId: true, userId: true, user: { select: { id: true, avatarUrl: true } } },
                    distinct: ['eventId', 'userId'],
                }),
                prisma.vote.findMany({
                    where: { eventId: { in: liveEventIds } },
                    select: { eventId: true, userId: true, user: { select: { id: true, avatarUrl: true } } },
                    distinct: ['eventId', 'userId'],
                }),
            ]);

            const avatarsByEvent = new Map<string, { id: string; avatarUrl: string | null }[]>();
            for (const row of submitterRows) {
                if (!avatarsByEvent.has(row.eventId)) avatarsByEvent.set(row.eventId, []);
                avatarsByEvent.get(row.eventId)!.push({ id: row.userId, avatarUrl: (row as any).user?.avatarUrl ?? null });
            }
            const submitterIdsByEvent = new Map<string, Set<string>>();
            for (const row of submitterRows) {
                if (!submitterIdsByEvent.has(row.eventId)) submitterIdsByEvent.set(row.eventId, new Set());
                submitterIdsByEvent.get(row.eventId)!.add(row.userId);
            }
            for (const row of voterRows) {
                if (submitterIdsByEvent.get(row.eventId)?.has(row.userId)) continue;
                if (!avatarsByEvent.has(row.eventId)) avatarsByEvent.set(row.eventId, []);
                avatarsByEvent.get(row.eventId)!.push({ id: row.userId, avatarUrl: (row as any).user?.avatarUrl ?? null });
            }

            const scoredEventsWithAvatars = scoredEvents.map((e: any) => ({
                ...e,
                participantAvatars: (avatarsByEvent.get(e.id) ?? []).slice(0, 5),
            }));

            // 4. Trending (Top 15 based on filters)
            const trending = scoredEventsWithAvatars.slice(0, 15);

            // 5. Closed events (separate fetch for the footer/sidebar if needed)
            const closed = await prisma.event.findMany({
                where: {
                    isDeleted: false,
                    status: 'completed'
                },
                orderBy: {
                    endTime: 'desc'
                },
                take: 12,
                include: {
                    brand: { select: { id: true, name: true, logoCid: true, categories: true } },
                    _count: { select: { submissions: true, votes: true } }
                }
            });

            // 6. Attach avatars to closed events (for the separate 'closed' result)
            const closedEventIds = closed.map((e: any) => e.id);
            const [closedSubmitterRows, closedVoterRows] = await Promise.all([
                prisma.submission.findMany({
                    where: { eventId: { in: closedEventIds }, status: 'active' },
                    select: { eventId: true, userId: true, user: { select: { id: true, avatarUrl: true } } },
                    distinct: ['eventId', 'userId'],
                }),
                prisma.vote.findMany({
                    where: { eventId: { in: closedEventIds } },
                    select: { eventId: true, userId: true, user: { select: { id: true, avatarUrl: true } } },
                    distinct: ['eventId', 'userId'],
                }),
            ]);

            const closedAvatarsByEvent = new Map<string, { id: string; avatarUrl: string | null }[]>();
            for (const row of closedSubmitterRows) {
                if (!closedAvatarsByEvent.has(row.eventId)) closedAvatarsByEvent.set(row.eventId, []);
                closedAvatarsByEvent.get(row.eventId)!.push({ id: row.userId, avatarUrl: (row as any).user?.avatarUrl ?? null });
            }
            const closedSubmitterIdsByEvent = new Map<string, Set<string>>();
            for (const row of closedSubmitterRows) {
                if (!closedSubmitterIdsByEvent.has(row.eventId)) closedSubmitterIdsByEvent.set(row.eventId, new Set());
                closedSubmitterIdsByEvent.get(row.eventId)!.add(row.userId);
            }
            for (const row of closedVoterRows) {
                if (closedSubmitterIdsByEvent.get(row.eventId)?.has(row.userId)) continue;
                if (!closedAvatarsByEvent.has(row.eventId)) closedAvatarsByEvent.set(row.eventId, []);
                closedAvatarsByEvent.get(row.eventId)!.push({ id: row.userId, avatarUrl: (row as any).user?.avatarUrl ?? null });
            }

            const closedWithAvatars = closed.map((e: any) => ({
                ...e,
                participantAvatars: (closedAvatarsByEvent.get(e.id) ?? []).slice(0, 5),
            }));

            // 7. Domain grouped (using the filtered and ranked list)
            const domainMap = new Map<string, any[]>();
            scoredEventsWithAvatars.forEach((event: any) => {
                const categories: string[] = event.brand?.categories || ['OTHER'];
                categories.forEach(category => {
                    const raw = category.toUpperCase();
                    const cat = CATEGORY_ALIASES[raw] ?? raw;
                    if (!domainMap.has(cat)) domainMap.set(cat, []);
                    domainMap.get(cat)!.push(event);
                });
            });

            const domains = Array.from(domainMap.entries()).map(([domain, events]) => ({
                domain,
                events: events.slice(0, 10) 
            }));

            return { trending, domains, closed: closedWithAvatars, allRanked: scoredEventsWithAvatars };
        } catch (error) {
            console.error('Failed to get explore events:', error);
            throw error;
        }
    },

    /**
     * Get ranked brands (by universal brand score)
     */
    async getExploreBrands() {
        try {
            const brands = await prisma.brand.findMany({
                where: { isActive: true },
                include: {
                    events: {
                        where: { isDeleted: false, status: { in: ['posting', 'voting'] } },
                        include: {
                            _count: { select: { submissions: true, votes: true } }
                        }
                    }
                }
            });

            // Calculate score for each brand
            const rankedBrands = brands.map((brand: any) => ({
                ...brand,
                rankScore: calculateBrandScore(brand),
                // Keep liveRewardSize for UI indicators if needed
                liveRewardSize: (brand.events || []).reduce((acc: number, ev: any) => 
                    acc + (ev.leaderboardPool || 0) + (ev.topReward || 0) + (ev.baseReward || 0), 0)
            })).sort((a, b) => b.rankScore - a.rankScore);

            return rankedBrands.slice(0, 20);
        } catch (error) {
            console.error('Failed to get explore brands:', error);
            throw error;
        }
    },

    /**
     * Get ranked creators (by universal creator score)
     */
    async getExploreCreators() {
        try {
            const creators = await prisma.user.findMany({
                where: { role: 'USER' },
                take: 100, // Consider top 100 recent/active users as candidates
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    level: true,
                    xp: true,
                    trustScore: true,
                    totalSubmissions: true,
                    totalVotes: true,
                    lastLoginAt: true
                }
            });

            // Calculate score for each creator
            const rankedCreators = creators.map((user: any) => ({
                ...user,
                rankScore: calculateCreatorScore(user)
            })).sort((a, b) => b.rankScore - a.rankScore);

            return rankedCreators.slice(0, 20); // Return top 20 creators
        } catch (error) {
            console.error('Failed to get explore creators:', error);
            throw error;
        }
    },

    /**
     * Get content mosaic (past highly voted submissions)
     * Filters out content from restricted events for the current user.
     */
    async getExploreContent(userId?: string) {
        try {
            // Fetch current user demographics
            let currentUser = null;
            if (userId) {
                currentUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { gender: true, dateOfBirth: true }
                });
            }

            const content = await prisma.submission.findMany({
                where: {
                    status: 'active',
                },
                include: {
                    user: { select: { username: true, avatarUrl: true } },
                    event: { select: { title: true, ageRestriction: true, genderRestriction: true } },
                    _count: { select: { votes: true } }
                },
                orderBy: { voteCount: 'desc' },
                take: 50
            });

            // Filter content based on event restrictions
            const filteredContent = content.filter(sub => {
                const event = sub.event as any;
                if (!event) return true;

                try {
                    enforceEventDemographics(event, currentUser as any);
                    return true;
                } catch (e) {
                    return false;
                }
            });

            return filteredContent;
        } catch (error) {
            console.error('Failed to get explore content:', error);
            throw error;
        }
    }
};


