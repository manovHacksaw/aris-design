import { Router } from 'express';
import {
  createEvent,
  getEvents,
  getEventById,
  getBrandEvents,
  updateEvent,
  updateEventStatus,
  publishEvent,
  deleteEvent,
  cancelEvent,
  stopEventEarly,
  getEventsVotedByUser,
  updateBlockchainStatus,
  failBlockchainStatus,
} from '../controllers/eventController.js';
import { authenticateJWT, authenticateOptional } from '../middlewares/authMiddleware.js';
import { apiCacheHeaders } from '../middlewares/cacheMiddleware.js';
import proposalRoutes from './proposalRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import voteRoutes from './voteRoutes.js';

const router = Router();

// ==================== PUBLIC ROUTES ====================

// List all events with filters
router.get('/', apiCacheHeaders, getEvents);

// ==================== PROTECTED ROUTES (JWT Required) ====================

// Get events for authenticated brand (MUST come before /:id)
router.get('/brand/me', authenticateJWT, apiCacheHeaders, getBrandEvents);

// Get list of events voted by user
router.get('/user/:userId/voted', apiCacheHeaders, getEventsVotedByUser);



// Get single event by ID
router.get('/:id', authenticateOptional, apiCacheHeaders, getEventById);

// Create new event
router.post('/', authenticateJWT, createEvent);

// Update event
router.put('/:id', authenticateJWT, updateEvent);

// Update event status
router.patch('/:id/status', authenticateJWT, updateEventStatus);

// Update blockchain status (Success)
router.patch('/:id/blockchain', authenticateJWT, updateBlockchainStatus);

// Update blockchain status (Failed)
router.patch('/:id/blockchain-failed', authenticateJWT, failBlockchainStatus);

// Publish event (DRAFT → SCHEDULED)
router.post('/:id/publish', authenticateJWT, publishEvent);

// Cancel event
router.post('/:id/cancel', authenticateJWT, cancelEvent);

// Stop event early (VOTE_ONLY)
router.post('/:id/stop', authenticateJWT, stopEventEarly);

// Delete event
router.delete('/:id', authenticateJWT, deleteEvent);

// ==================== NESTED ROUTES ====================

// Proposals
router.use('/:eventId/proposals', proposalRoutes);

// Submissions
router.use('/:eventId/submissions', submissionRoutes);

// Votes
router.use('/:eventId', voteRoutes);

export default router;
