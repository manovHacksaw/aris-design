import logger from '../lib/logger';
import { Response } from 'express';
import { SubmissionQueryService } from '../services/submissions/SubmissionQueryService.js';
import { SubmissionMutationService } from '../services/submissions/SubmissionMutationService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { CreateSubmissionRequest, UpdateSubmissionRequest } from '../types/submission.js';
import { AppError } from '../utils/errors.js';

/**
 * Create a submission for an event
 * POST /api/events/:eventId/submissions
 */
export const createSubmission = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { eventId } = req.params;
        const data: CreateSubmissionRequest = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const submission = await SubmissionMutationService.createSubmission(eventId, userId, data);

        res.status(201).json({
            success: true,
            message: 'Submission created successfully',
            submission,
        });
    } catch (error: any) {
        logger.error('Error in createSubmission:', error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Update a submission
 * PUT /api/submissions/:id
 */
export const updateSubmission = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const data: UpdateSubmissionRequest = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const submission = await SubmissionMutationService.updateSubmission(id, userId, data);

        res.status(200).json({
            success: true,
            message: 'Submission updated successfully',
            submission,
        });
    } catch (error: any) {
        if (error instanceof AppError) return res.status(error.status).json({ success: false, error: error.message });
        logger.error('Error in updateSubmission:', error);
        res.status(500).json({ success: false, error: 'Failed to update submission' });
    }
};

/**
 * Delete a submission
 * DELETE /api/submissions/:id
 */
export const deleteSubmission = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        await SubmissionMutationService.deleteSubmission(id, userId);

        res.status(200).json({
            success: true,
            message: 'Submission deleted successfully',
        });
    } catch (error: any) {
        if (error instanceof AppError) return res.status(error.status).json({ success: false, error: error.message });
        logger.error('Error in deleteSubmission:', error);
        res.status(500).json({ success: false, error: 'Failed to delete submission' });
    }
};

/**
 * Get all submissions for an event
 * GET /api/events/:eventId/submissions
 */
export const getSubmissionsByEvent = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id; // Optional - may be undefined for unauthenticated requests

        const submissions = await SubmissionQueryService.getSubmissionsByEvent(eventId, userId);

        res.status(200).json({
            success: true,
            submissions,
        });
    } catch (error: any) {
        logger.error('Error in getSubmissionsByEvent:', error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get user's submission for an event
 * GET /api/events/:eventId/submissions/me
 */
export const getUserSubmission = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { eventId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const submission = await SubmissionQueryService.getUserSubmission(eventId, userId);

        res.status(200).json({
            success: true,
            hasSubmitted: !!submission,  // Boolean flag
            submission,
        });
    } catch (error: any) {
        logger.error('Error in getUserSubmission:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};

/**
 * Check if user has submitted to an event
 * GET /api/events/:eventId/submissions/has-submitted
 */
export const checkIfUserHasSubmitted = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { eventId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const submission = await SubmissionService.getUserSubmission(eventId, userId);

        res.status(200).json({
            success: true,
            hasSubmitted: !!submission,
        });
    } catch (error: any) {
        logger.error('Error in checkIfUserHasSubmitted:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};

/**
 * Get all submissions by a specific user
 * GET /api/users/:userId/submissions
 */
export const getSubmissionsByUser = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user?.id;

        const submissions = await SubmissionQueryService.getSubmissionsByUser(userId, requestingUserId);

        res.status(200).json({
            success: true,
            submissions,
        });
    } catch (error: any) {
        logger.error('Error in getSubmissionsByUser:', error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};
