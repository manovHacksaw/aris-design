import { Router } from 'express';
import {
    createProposal,
    updateProposal,
    deleteProposal,
    getProposalsByEvent,
} from '../controllers/proposalController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = Router({ mergeParams: true });

// GET /api/events/:eventId/proposals
router.get('/', getProposalsByEvent);

// POST /api/events/:eventId/proposals
router.post('/', authenticateJWT, createProposal);

// PUT /api/proposals/:id
router.put('/:id', authenticateJWT, updateProposal);

// DELETE /api/proposals/:id
router.delete('/:id', authenticateJWT, deleteProposal);

export default router;
