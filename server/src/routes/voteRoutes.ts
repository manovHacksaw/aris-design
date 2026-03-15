import { Router } from 'express';
import {
    voteForSubmission,
    voteForProposals,
    getUserVotesForEvent,
    checkIfUserHasVoted,
} from '../controllers/voteController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = Router({ mergeParams: true });

// GET /api/events/:eventId/my-votes
router.get('/my-votes', authenticateJWT, getUserVotesForEvent);

// GET /api/events/:eventId/has-voted
router.get('/has-voted', authenticateJWT, checkIfUserHasVoted);

// POST /api/events/:eventId/proposals/vote
router.post('/proposals/vote', authenticateJWT, voteForProposals);

// POST /api/events/:eventId/submissions/:submissionId/vote
router.post('/submissions/:submissionId/vote', authenticateJWT, voteForSubmission);

export default router;
