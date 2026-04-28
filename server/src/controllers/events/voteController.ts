import logger from '../../lib/logger';
import { Response } from 'express';
import { VoteService } from '../../services/events/voteService';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware';
import { VoteForProposalsRequest, VoteForSubmissionRequest } from '../../types/vote';
import { broadcastToEvent } from '../../socket/index';
import { prisma } from '../../lib/prisma';
import { ExploreService } from '../../services/discovery/exploreService';

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
        const [vote, eventMeta, nextEvent] = await Promise.all([
            VoteService.voteForSubmission(eventId, userId, data),
            prisma.event.findUnique({ where: { id: eventId }, select: { endTime: true, status: true, title: true } }).catch(() => null),
            ExploreService.getNextEventForUser(userId, eventId).catch(() => null),
        ]);

        broadcastToEvent(eventId, 'vote-update', { submissionId, delta: 1 });
        broadcastToEvent(eventId, 'participant-update', { delta: 1 });

        res.status(201).json({
            success: true,
            message: 'Vote cast successfully',
            vote,
            ...(eventMeta && { eventMeta: { endTime: eventMeta.endTime, status: eventMeta.status } }),
            ...(nextEvent && { nextEvent }),
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

        // Run vote + event meta + next-event fetch in parallel (next-event never blocks)
        const [votes, eventMeta, nextEvent] = await Promise.all([
            VoteService.voteForProposals(eventId, userId, data),
            prisma.event.findUnique({ where: { id: eventId }, select: { endTime: true, status: true, title: true } }).catch(() => null),
            ExploreService.getNextEventForUser(userId, eventId).catch(() => null),
        ]);

        if (votes.length > 0) {
            const proposalId = votes[0].proposalId;
            if (proposalId) broadcastToEvent(eventId, 'vote-update', { submissionId: proposalId, delta: 1 });
            broadcastToEvent(eventId, 'participant-update', { delta: 1 });
        }

        res.status(201).json({
            success: true,
            message: 'Votes cast successfully',
            votes,
            // Optional engagement fields — clients that don't use them are unaffected
            ...(eventMeta && { eventMeta: { endTime: eventMeta.endTime, status: eventMeta.status } }),
            ...(nextEvent && { nextEvent }),
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
        const breakdown = await VoteService.getVoterBreakdown(eventId);
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

        const participants = await VoteService.getEventParticipants(eventId, limit);

        return res.status(200).json({ success: true, participants });
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
