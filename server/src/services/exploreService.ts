import { prisma } from '../lib/prisma.js';

export const ExploreService = {
    /**
     * Get explore events including trending, domain-grouped events, and closed events.
     */
    async getExploreEvents() {
        try {
            // 1. Trending (live events order by reward/potential)
            const trending = await prisma.event.findMany({
                where: {
                    isDeleted: false,
                    status: { in: ['posting', 'voting'] }
                },
                orderBy: {
                    topReward: 'desc'
                },
                take: 10,
                include: {
                    brand: { select: { id: true, name: true, logoCid: true, categories: true } },
                    _count: { select: { submissions: true, votes: true } }
                }
            });

            // 2. Closed events
            const closed = await prisma.event.findMany({
                where: {
                    isDeleted: false,
                    status: 'completed'
                },
                orderBy: {
                    endTime: 'desc'
                },
                take: 10,
                include: {
                    brand: { select: { id: true, name: true, logoCid: true, categories: true } },
                    _count: { select: { submissions: true, votes: true } }
                }
            });

            // 3. Domain grouped
            const allLive = await prisma.event.findMany({
                where: {
                    isDeleted: false,
                    status: { in: ['posting', 'voting'] }
                },
                include: {
                    brand: { select: { id: true, name: true, logoCid: true, categories: true } },
                    _count: { select: { submissions: true, votes: true } }
                }
            });

            // Group by domain (brand category)
            const domainMap = new Map<string, any[]>();
            allLive.forEach((event: any) => {
                const categories: string[] = event.brand?.categories || ['OTHER'];
                categories.forEach(category => {
                    const cat = category.toUpperCase();
                    if (!domainMap.has(cat)) domainMap.set(cat, []);
                    domainMap.get(cat)!.push(event);
                });
            });

            const domains = Array.from(domainMap.entries()).map(([domain, events]) => ({
                domain,
                events
            }));

            return { trending, domains, closed };
        } catch (error) {
            console.error('Failed to get explore events:', error);
            throw error;
        }
    },

    /**
     * Get ranked brands (by total live reward size)
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

            // Calculate active reward size per brand
            const rankedBrands = brands.map((brand: any) => {
                const liveRewardSize = (brand.events || []).reduce((acc: number, ev: any) => acc + (ev.leaderboardPool || 0) + (ev.topReward || 0) + (ev.baseReward || 0), 0);
                return { ...brand, liveRewardSize };
            });

            // Sort by liveRewardSize DESC
            rankedBrands.sort((a, b) => b.liveRewardSize - a.liveRewardSize);

            // Return top brands with their events
            return rankedBrands.slice(0, 15);
        } catch (error) {
            console.error('Failed to get explore brands:', error);
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
