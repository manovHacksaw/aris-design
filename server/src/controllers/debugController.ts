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
        console.error('Error in checkVotingState:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
