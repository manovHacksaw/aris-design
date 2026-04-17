import logger from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { LoginStreakService } from '../loginStreakService.js';

export class UserStatsService {
    /**
     * Get user statistics with high accuracy
     */
    static async getUserStats(userId: string) {
        try {
            logger.info(`[UserStatsService.getUserStats] Fetching stats for user: ${userId}`);

            // 1. Fetch user to verify existence and get denormalized counters
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { 
                    id: true, 
                    email: true,
                    xp: true,
                    totalSubmissions: true,
                    totalVotes: true,
                    totalEarnings: true
                },
            });

            if (!user) {
                logger.error(`[UserStatsService.getUserStats] User not found: ${userId}`);
                throw new Error('User not found');
            }

            // Update login streak in background
            LoginStreakService.recordDailyLogin(userId).catch((err) => {
                logger.error('[UserStatsService.getUserStats] Streak update failed:', err);
            });

            // 2. Aggregate all metrics in parallel
            // We use direct counts where possible to ensure accuracy even if counters are out of sync
            
            // Debug: check first 3 submissions to see if they exist for this user
            const sampleSubmissions = await prisma.submission.findMany({
                where: { userId },
                take: 3,
                select: { id: true, eventId: true }
            });
            logger.info(`[UserStatsService.getUserStats] Sample submissions for ${userId}:`, JSON.stringify(sampleSubmissions));

            const sampleVotes = await prisma.vote.findMany({
                where: { userId },
                take: 3,
                select: { id: true, eventId: true }
            });
            logger.info(`[UserStatsService.getUserStats] Sample votes for ${userId}:`, JSON.stringify(sampleVotes));

            const [
                followersCount,
                followingCount,
                brandSubscriptionsCount,
                submissionsCount,
                votesCastCount,
                votesReceivedSum,
                votedEvents,
                submittedEvents,
                rewardClaimsSum,
                otherEarningsSum,
                referralsCount,
                loginStreakData,
                topRankedEvents,
            ] = await Promise.all([
                // Followers
                prisma.userFollowers.count({ where: { followingId: userId } }),
                // Following (users)
                prisma.userFollowers.count({ where: { followerId: userId } }),
                // Following (brands)
                prisma.brandSubscription.count({ where: { userId } }),

                // Posts (Submissions)
                prisma.submission.count({ where: { userId } }),

                // Votes Cast
                prisma.vote.count({ where: { userId } }),

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

                // Reward Earnings — includes PENDING so users see what they've earned even pre-claim
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

                // Referrals
                prisma.referral.count({ where: { referrerId: userId } }),

                // Login streak
                prisma.userLoginStreak.findUnique({
                    where: { userId },
                    select: { currentStreak: true },
                }).catch(() => null),

                // Top 3 finishes (submissions where finalRank is 1, 2, or 3)
                prisma.submission.count({
                    where: { userId, finalRank: { gte: 1, lte: 3 } },
                }),
            ]);

            // Combine event sets to get unique events participated in
            const uniqueEventIds = new Set([
                ...votedEvents.map(e => e.eventId),
                ...submittedEvents.map(e => e.eventId)
            ]);

            const votesReceivedAggregate = votesReceivedSum;
            const totalEarnings = (rewardClaimsSum._sum.finalAmount || 0) + (otherEarningsSum._sum.amount || 0);
            
            // Log if there's a significant mismatch with denormalized fields (for debugging)
            if (submissionsCount !== user.totalSubmissions || votesCastCount !== user.totalVotes) {
                logger.warn(`[UserStatsService.getUserStats] Counter mismatch for ${userId}: ` + 
                    `Submissions Query: ${submissionsCount} vs Cache: ${user.totalSubmissions}, ` +
                    `Votes Query: ${votesCastCount} vs Cache: ${user.totalVotes}`);
            }

            const stats = {
                subscribers: followersCount,
                subscriptions: followingCount + brandSubscriptionsCount,
                posts: submissionsCount,
                votes: votesCastCount,
                votesCast: votesCastCount,
                votesReceived: votesReceivedAggregate,
                events: uniqueEventIds.size,
                earnings: totalEarnings,
                referrals: referralsCount,
                loginStreak: loginStreakData?.currentStreak ?? 0,
                topRankedEvents,
            };

            logger.info(`[UserStatsService.getUserStats] Resulting Stats:`, JSON.stringify(stats, null, 2));

            return stats;
        } catch (error) {
            logger.error('[UserStatsService.getUserStats] Critical error:', error);
            throw error;
        }
    }
}
