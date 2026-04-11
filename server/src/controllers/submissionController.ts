import { Response } from 'express';
import { SubmissionService } from '../services/submissionService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { CreateSubmissionRequest, UpdateSubmissionRequest } from '../types/submission.js';

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

        const submission = await SubmissionService.createSubmission(eventId, userId, data);

        res.status(201).json({
            success: true,
            message: 'Submission created successfully',
            submission,
        });
    } catch (error: any) {
        console.error('Error in createSubmission:', error);
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

        const submission = await SubmissionService.updateSubmission(id, userId, data);

        res.status(200).json({
            success: true,
            message: 'Submission updated successfully',
            submission,
        });
    } catch (error: any) {
        console.error('Error in updateSubmission:', error);
        res.status(error.message.includes('Forbidden') ? 403 : 400).json({
            success: false,
            error: error.message,
        });
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

        await SubmissionService.deleteSubmission(id, userId);

        res.status(200).json({
            success: true,
            message: 'Submission deleted successfully',
        });
    } catch (error: any) {
        console.error('Error in deleteSubmission:', error);
        res.status(error.message.includes('Forbidden') ? 403 : 400).json({
            success: false,
            error: error.message,
        });
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

        const submissions = await SubmissionService.getSubmissionsByEvent(eventId, userId);

        res.status(200).json({
            success: true,
            submissions,
        });
    } catch (error: any) {
        console.error('Error in getSubmissionsByEvent:', error);
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

        const submission = await SubmissionService.getUserSubmission(eventId, userId);

        res.status(200).json({
            success: true,
            hasSubmitted: !!submission,  // Boolean flag
            submission,
        });
    } catch (error: any) {
        console.error('Error in getUserSubmission:', error);
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
        console.error('Error in checkIfUserHasSubmitted:', error);
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

        const submissions = await SubmissionService.getSubmissionsByUser(userId, requestingUserId);

        res.status(200).json({
            success: true,
            submissions,
        });
    } catch (error: any) {
        console.error('Error in getSubmissionsByUser:', error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};
