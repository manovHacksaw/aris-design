import { Router } from 'express';
import {
    voteForSubmission,
    voteForProposals,
    getUserVotesForEvent,
    checkIfUserHasVoted,
    getEventParticipants,
    getVoterBreakdown,
} from '../../controllers/events/voteController.js';
import { authenticateJWT } from '../../middlewares/authMiddleware.js';
import { arcjetMiddleware } from '../../middlewares/arcjetMiddleware';
import aj from '../../lib/arcjet';
import { fixedWindow } from '@arcjet/node';

const router = Router({ mergeParams: true });

// 30 votes per minute per user (feed browsing can trigger rapid votes)
const voteRateLimit = arcjetMiddleware(
  aj.withRule(fixedWindow({ mode: 'LIVE', window: '1m', max: 30, characteristics: ['userId'] })),
  (req) => ({ userId: req.user?.id ?? req.ip ?? 'anon' }),
);

router.get('/participants', getEventParticipants);
router.get('/voter-breakdown', getVoterBreakdown);
router.get('/my-votes', authenticateJWT, getUserVotesForEvent);
router.get('/has-voted', authenticateJWT, checkIfUserHasVoted);
router.post('/proposals/vote', authenticateJWT, voteRateLimit, voteForProposals);
router.post('/submissions/:submissionId/vote', authenticateJWT, voteRateLimit, voteForSubmission);

export default router;
