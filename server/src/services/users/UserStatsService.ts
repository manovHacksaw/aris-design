import logger from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { LoginStreakService } from './loginStreakService.js';

export class UserStatsService {
    /**
     * Get user statistics with high accuracy
     */
    static async getUserStats(userId: string) {
        const startTime = Date.now();
        try {
            logger.info(`[UserStatsService.getUserStats] Fetching stats for user: ${userId}`);

            // 1. Fetch user + consolidate counts in ONE round-trip
            console.time(`[UserStatsService.getUserStats] Query 1: User + Counts - ${userId}`);
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { 
                    id: true, 
                    email: true,
                    xp: true,
                    totalSubmissions: true,
                    totalVotes: true,
                    totalEarnings: true,
                    _count: {
                        select: {
                            followers: true,
                            following: true,
                            brandSubscriptions: true,
                            submissions: true,
                            votes: true,
                            referralsMade: true,
                        }
                    },
                    loginStreak: {
                        select: { currentStreak: true }
                    }
                },
            });
            console.timeEnd(`[UserStatsService.getUserStats] Query 1: User + Counts - ${userId}`);

            if (!user) {
                logger.error(`[UserStatsService.getUserStats] User not found: ${userId}`);
                throw new Error('User not found');
            }

            // Update login streak in background
            LoginStreakService.recordDailyLogin(userId).catch((err) => {
                logger.error(err, '[UserStatsService.getUserStats] Streak update failed:');
            });

            // 2. Parallel block for complex aggregations
            console.time(`[UserStatsService.getUserStats] Query Block 2: Parallel Aggregations - ${userId}`);
            const [
                votesReceivedSum,
                votedEvents,
                submittedEvents,
                rewardClaimsSum,
                otherEarningsSum,
                topRankedEvents,
                firstRankedEvents,
            ] = await Promise.all([
                // Votes Received (total votes on user's submissions)
                prisma.vote.count({
                    where: { submission: { userId } }
                }),

                // Events Participated - Voted
                prisma.vote.groupBy({
                    by: ['eventId'],
                    where: { userId },
                }),

                // Events Participated - Submitted
                prisma.submission.groupBy({
                    by: ['eventId'],
                    where: { userId },
                }),

                // Reward Earnings
                prisma.rewardClaim.aggregate({
                    where: {
                        userId,
                        status: { in: ['PENDING', 'CLAIMED', 'CREDITED'] as any },
                    },
                    _sum: { finalAmount: true },
                }),

                // Other Earnings (AIRDROP, REFERRAL_BONUS, etc)
                prisma.tokenActivityLog.aggregate({
                    where: {
                        userId,
                        actionType: { in: ['EARNING', 'AIRDROP', 'REFERRAL_BONUS'] },
                    },
                    _sum: { amount: true },
                }),

                // Top 3 finishes
                prisma.submission.count({
                    where: { userId, finalRank: { gte: 1, lte: 3 } },
                }),
                // #1 finishes
                prisma.submission.count({
                    where: { userId, finalRank: 1 },
                }),
            ]);
            console.timeEnd(`[UserStatsService.getUserStats] Query Block 2: Parallel Aggregations - ${userId}`);

            // Combine event sets to get unique events participated in
            const uniqueEventIds = new Set([
                ...votedEvents.map(e => e.eventId),
                ...submittedEvents.map(e => e.eventId)
            ]);

            const totalEarnings = (rewardClaimsSum._sum.finalAmount || 0) + (otherEarningsSum._sum.amount || 0);
            
            const stats = {
                subscribers: user._count.followers,
                subscriptions: user._count.following + user._count.brandSubscriptions,
                posts: user._count.submissions,
                votes: user._count.votes,
                votesCast: user._count.votes,
                votesReceived: votesReceivedSum,
                events: uniqueEventIds.size,
                earnings: totalEarnings,
                referrals: user._count.referralsMade,
                loginStreak: user.loginStreak?.currentStreak ?? 0,
                topRankedEvents,
                firstRankedEvents,
            };

            const totalTime = Date.now() - startTime;
            logger.info(`[UserStatsService.getUserStats] Completed in ${totalTime}ms for user ${userId}`);

            return stats;

        } catch (error: any) {
            logger.error({ 
                err: error,
                message: error.message,
                stack: error.stack,
                userId 
            }, '[UserStatsService.getUserStats] Critical error:');
            throw error;
        }
    }
}
