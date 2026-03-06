import { Response } from 'express';
import { VoteService } from '../services/voteService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { VoteForProposalsRequest, VoteForSubmissionRequest } from '../types/vote.js';
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

        // Broadcast real-time vote update to all viewers of this event
        broadcastToEvent(eventId, 'vote-update', { submissionId, delta: 1 });

        res.status(201).json({
            success: true,
            message: 'Vote cast successfully',
            vote,
        });
    } catch (error: any) {
        console.error('Error in voteForSubmission:', error);
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

        // Broadcast real-time vote update for each voted proposal
        for (const vote of votes) {
            if (vote.proposalId) {
                broadcastToEvent(eventId, 'vote-update', { submissionId: vote.proposalId, delta: 1 });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Votes cast successfully',
            votes,
        });
    } catch (error: any) {
        console.error('Error in voteForProposals:', error);
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
        console.error('Error in getUserVotesForEvent:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
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
        console.error('Error in checkIfUserHasVoted:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};
