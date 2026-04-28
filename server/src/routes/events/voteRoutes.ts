import { Router } from 'express';
import {
    voteForSubmission,
    voteForProposals,
    getUserVotesForEvent,
    checkIfUserHasVoted,
    getEventParticipants,
    getVoterBreakdown,
} from '../../controllers/events/voteController';
import { authenticateJWT } from '../../middlewares/authMiddleware';
import { voteRateLimit } from '../../config/rateLimits';

const router = Router({ mergeParams: true });

router.get('/participants', authenticateJWT, getEventParticipants);
router.get('/voter-breakdown', authenticateJWT, getVoterBreakdown);
router.get('/my-votes', authenticateJWT, getUserVotesForEvent);
router.get('/has-voted', authenticateJWT, checkIfUserHasVoted);
router.post('/proposals/vote', authenticateJWT, voteRateLimit, voteForProposals);
router.post('/submissions/:submissionId/vote', authenticateJWT, voteRateLimit, voteForSubmission);

export default router;
