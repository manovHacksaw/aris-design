import { Router } from 'express';
import {
    createSubmission,
    updateSubmission,
    deleteSubmission,
    getSubmissionsByEvent,
    getUserSubmission,
    checkIfUserHasSubmitted,
} from '../../controllers/events/submissionController';
import { authenticateJWT, authenticateOptional } from '../../middlewares/authMiddleware';
import { apiCacheHeaders } from '../../middlewares/cacheMiddleware';

const router = Router({ mergeParams: true });

// GET /api/events/:eventId/submissions
router.get('/', authenticateOptional, apiCacheHeaders, getSubmissionsByEvent);

// GET /api/events/:eventId/submissions/has-submitted
router.get('/has-submitted', authenticateJWT, checkIfUserHasSubmitted);

// GET /api/events/:eventId/submissions/me
router.get('/me', authenticateJWT, apiCacheHeaders, getUserSubmission);

// POST /api/events/:eventId/submissions
router.post('/', authenticateJWT, createSubmission);

// PUT /api/submissions/:id
router.put('/:id', authenticateJWT, updateSubmission);

// DELETE /api/submissions/:id
router.delete('/:id', authenticateJWT, deleteSubmission);

export default router;
