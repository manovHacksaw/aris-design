import logger from '../lib/logger';
import { Response } from 'express';
import { VoteService } from '../services/voteService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { VoteForProposalsRequest, VoteForSubmissionRequest } from '../types/vote.js';
import { prisma } from '../lib/prisma.js';
import { broadcastToEvent } from '../socket/index.js';

/**
 * Vote for a submission (POST_VOTE events)
 * POST /api/events/:eventId/submissions/:submissionId/vote
 */
export const voteForSubmission = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { eventId, submissionId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const data: VoteForSubmissionRequest = { submissionId };
        const vote = await VoteService.voteForSubmission(eventId, userId, data);

        broadcastToEvent(eventId, 'vote-update', { submissionId, delta: 1 });
        broadcastToEvent(eventId, 'participant-update', { delta: 1 });

        res.status(201).json({
            success: true,
            message: 'Vote cast successfully',
            vote,
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in voteForSubmission:');
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Vote for proposals (VOTE_ONLY events)
 * POST /api/events/:eventId/proposals/vote
 */
export const voteForProposals = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { eventId } = req.params;
        const data: VoteForProposalsRequest = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const votes = await VoteService.voteForProposals(eventId, userId, data);

        if (votes.length > 0) {
            const proposalId = votes[0].proposalId;
            if (proposalId) broadcastToEvent(eventId, 'vote-update', { submissionId: proposalId, delta: 1 });
            broadcastToEvent(eventId, 'participant-update', { delta: 1 });
        }

        res.status(201).json({
            success: true,
            message: 'Votes cast successfully',
            votes,
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in voteForProposals:');
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get user's votes for an event
 * GET /api/events/:eventId/my-votes
 */
export const getUserVotesForEvent = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { eventId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const votes = await VoteService.getUserVotesForEvent(eventId, userId);

        res.status(200).json({
            success: true,
            votes,
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in getUserVotesForEvent:');
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};

/**
 * Get voter avatars grouped by submissionId / proposalId for completed events
 * GET /api/events/:eventId/voter-breakdown
 */
export const getVoterBreakdown = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const { eventId } = req.params;

        const votes = await prisma.vote.findMany({
            where: { eventId },
            select: {
                submissionId: true,
                proposalId: true,
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // Group by submissionId or proposalId
        const breakdown: Record<string, { id: string; displayName: string | null; username: string | null; avatarUrl: string | null }[]> = {};
        for (const v of votes) {
            const key = v.submissionId ?? v.proposalId;
            if (!key) continue;
            if (!breakdown[key]) breakdown[key] = [];
            breakdown[key].push(v.user);
        }

        return res.status(200).json({ success: true, breakdown });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in getVoterBreakdown:');
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Get distinct participants (voters) for an event
 * GET /api/events/:eventId/participants
 */
export const getEventParticipants = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const { eventId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        const votes = await prisma.vote.findMany({
            where: { eventId },
            distinct: ['userId'],
            take: limit,
            orderBy: { createdAt: 'asc' },
            select: {
                userId: true,
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return res.status(200).json({ success: true, participants: votes.map((v) => v.user) });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in getEventParticipants:');
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Check if user has voted in an event
 * GET /api/events/:eventId/has-voted
 */
export const checkIfUserHasVoted = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { eventId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const hasVoted = await VoteService.hasVotedInEvent(eventId, userId);

        res.status(200).json({
            success: true,
            hasVoted,
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error in checkIfUserHasVoted:');
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};
