import { prisma } from '../lib/prisma.js';

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
    else return -1; // Status like 'completed' should be excluded from main ranked feeds

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
     */
    async getExploreEvents() {
        try {
            // 1. Fetch all live candidates (posting/voting)
            const allLive = await prisma.event.findMany({
                where: {
                    isDeleted: false,
                    status: { in: ['posting', 'voting'] }
                },
                include: {
                    brand: { select: { id: true, name: true, logoCid: true, categories: true, isVerified: true, level: true } },
                    _count: { select: { submissions: true, votes: true } }
                }
            });

            // 2. Apply Universal Ranking
            const scoredEvents = allLive.map(event => ({
                ...event,
                rankScore: calculateEventScore(event)
            })).sort((a, b) => b.rankScore - a.rankScore);

            // 3. Trending (Top 15 overall)
            const trending = scoredEvents.slice(0, 15);

            // 4. Closed events (separate fetch, no ranking needed among trending)
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

            // 5. Domain grouped (using the ranked list)
            const domainMap = new Map<string, any[]>();
            scoredEvents.forEach((event: any) => {
                const categories: string[] = event.brand?.categories || ['OTHER'];
                categories.forEach(category => {
                    const cat = category.toUpperCase();
                    if (!domainMap.has(cat)) domainMap.set(cat, []);
                    domainMap.get(cat)!.push(event);
                });
            });

            const domains = Array.from(domainMap.entries()).map(([domain, events]) => ({
                domain,
                events: events.slice(0, 10) // Limit per domain to keep it fresh
            }));

            return { trending, domains, closed };
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
     */
    async getExploreContent() {
        try {
            const content = await prisma.submission.findMany({
                orderBy: {
                    voteCount: 'desc'
                },
                take: 30,
                include: {
                    user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
                    event: { select: { id: true, title: true, status: true, brand: { select: { id: true, name: true } } } },
                    _count: { select: { votes: true } }
                }
            });

            return content;
        } catch (error) {
            console.error('Failed to get explore content:', error);
            throw error;
        }
    }
};


