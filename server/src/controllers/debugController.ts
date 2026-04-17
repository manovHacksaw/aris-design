import logger from '../lib/logger';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { prisma } from '../lib/prisma';

/**
 * Debug endpoint to check voting state for current user
 * GET /api/debug/voting-state/:eventId
 */
export const checkVotingState = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { eventId } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Get current user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
            },
        });

        // Get all votes for this event by this user
        const userVotes = await prisma.vote.findMany({
            where: {
                eventId,
                userId,
            },
            include: {
                proposal: {
                    select: {
                        id: true,
                        title: true,
                        voteCount: true,
                    },
                },
            },
        });

        // Get all votes for this event (all users)
        const allVotes = await prisma.vote.findMany({
            where: { eventId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                    },
                },
                proposal: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            debug: {
                currentUser: user,
                hasVoted: userVotes.length > 0,
                userVoteCount: userVotes.length,
                userVotes: userVotes,
                totalVotesInEvent: allVotes.length,
                allVotesBreakdown: allVotes.map(v => ({
                    votedBy: v.user?.email,
                    proposalTitle: v.proposal?.title,
                    createdAt: v.createdAt,
                })),
            },
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in checkVotingState:');
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * GET /api/debug/rewards-pending
 * Development-only debug endpoint to inspect users with PENDING/CREDITED reward claims
 */
export const getPendingRewardUsers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const claims = await prisma.rewardClaim.findMany({
            where: {
                status: { in: ['PENDING', 'CREDITED'] }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        walletAddress: true,
                        eoaAddress: true,
                    }
                },
                pool: {
                    include: {
                        event: {
                            select: {
                                id: true,
                                title: true,
                            }
                        }
                    }
                }
            },
            orderBy: [
                { userId: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        const byUser = new Map<string, {
            userId: string;
            username: string | null;
            email: string | null;
            walletAddress: string | null;
            eoaAddress: string | null;
            totalAmount: number;
            statuses: string[];
            claims: Array<{
                id: string;
                status: string;
                claimType: string;
                finalAmount: number;
                eventId: string;
                eventTitle: string;
            }>;
        }>();

        for (const claim of claims) {
            const key = claim.userId;
            if (!byUser.has(key)) {
                byUser.set(key, {
                    userId: claim.user.id,
                    username: claim.user.username,
                    email: claim.user.email,
                    walletAddress: claim.user.walletAddress,
                    eoaAddress: claim.user.eoaAddress,
                    totalAmount: 0,
                    statuses: [],
                    claims: [],
                });
            }

            const entry = byUser.get(key)!;
            entry.totalAmount += claim.finalAmount;
            if (!entry.statuses.includes(claim.status)) {
                entry.statuses.push(claim.status);
            }
            entry.claims.push({
                id: claim.id,
                status: claim.status,
                claimType: claim.claimType,
                finalAmount: claim.finalAmount,
                eventId: claim.pool.event.id,
                eventTitle: claim.pool.event.title,
            });
        }

        res.json({
            success: true,
            totalUsers: byUser.size,
            totalClaims: claims.length,
            users: Array.from(byUser.values()),
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in getPendingRewardUsers:');
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
