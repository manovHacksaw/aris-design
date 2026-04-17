import logger from '../lib/logger';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';
import { EventMutationService } from '../services/events/EventMutationService.js';
import { EventQueryService } from '../services/events/EventQueryService.js';
import { EventLifecycleService } from '../services/events/EventLifecycleService.js';
import { EventValidationService } from '../services/events/EventValidationService.js';
import {
  CreateEventRequest,
  UpdateEventRequest,
  UpdateEventStatusRequest,
  EventFilters,
  EventStatus,
  EventStatusType,
} from '../types/event.js';

// ==================== CREATE ====================

/**
 * Create a new event
 * POST /api/events
 */
export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
        message: 'You must own a brand to create events',
      });
    }

    // Create event
    const eventData: CreateEventRequest = req.body;
    const event = await EventMutationService.createEvent(eventData, brand.id);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'An event with this information already exists' });
    }
    logger.error({ err: error }, 'Error in createEvent:');
    res.status(500).json({ success: false, error: 'Failed to create event. Please try again.' });
  }
};

// ==================== READ ====================

/**
 * Get all events with filters and pagination
 * GET /api/events?status=draft&page=1&limit=20
 */
export const getEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters: EventFilters = {
      status: req.query.status as EventStatusType | undefined,
      eventType: req.query.eventType as any,
      brandId: req.query.brandId as string | undefined,
      category: req.query.category as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const userId = req.user?.id;
    // Pass userId as 3rd argument (viewingUserId)
    // We pass undefined for userBrandId (2nd arg) because checking for brand ownership happens inside if we wanted that,
    // but here we are in public getEvents. 
    // Wait, the original code didn't pass userBrandId either? 
    // Ah, logic for userBrandId filtering is:
    // "CRITICAL: Filter out pending/failed blockchain events for public listing... If !userBrandId... else..."
    // In getEvents controller, we need to know if the user is a brand owner to pass it?
    // The previous implementation of getEvents controller (lines 134-170) did NOT fetch brand or pass userBrandId.
    // It filters: const filters = ...
    // const { events, total } = await EventQueryService.getEvents(filters);
    // So it was always treated as "public viewer" (no brand owner logic applied for visibility of Scheduled events).
    // If I want to correctly identifying user, I should just pass userId as 3rd arg.

    // I need to make sure I don't break the existing call signature until I update the service.
    // userBrandId is optional 2nd arg.

    const { events, total } = await EventQueryService.getEvents(filters, undefined, userId);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in getEvents:');

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch events',
    });
  }
};

/**
 * Get event by ID
 * GET /api/events/:id
 */
export const getEventById = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const event = await EventQueryService.getEventById(id, userId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    const lockedFields = EventValidationService.getLockedFields(event.status);

    res.status(200).json({
      success: true,
      event,
      lockedFields,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in getEventById:');

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch event',
    });
  }
};

/**
 * Get events for authenticated brand
 * GET /api/events/brand/me
 */
export const getBrandEvents = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
        message: 'You must own a brand to view brand events',
      });
    }

    // Get events for brand
    const status = req.query.status as string | undefined;
    const events = await EventQueryService.getEventsByBrand(brand.id, status);

    res.status(200).json({
      success: true,
      events,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in getBrandEvents:');

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch brand events',
    });
  }
};

// ==================== UPDATE ====================

/**
 * Update event
 * PUT /api/events/:id
 */
export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
        message: 'You must own a brand to update events',
      });
    }

    // Update event
    const updateData: UpdateEventRequest = req.body;
    const event = await EventMutationService.updateEvent(id, brand.id, updateData);

    // Get locked fields for response
    const lockedFields = EventValidationService.getLockedFields(event.status);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event,
      lockedFields,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Duplicate entry' });
    }
    logger.error({ err: error }, 'Error in updateEvent:');
    res.status(500).json({ success: false, error: 'Failed to update event' });
  }
};

/**
 * Update event status
 * PATCH /api/events/:id/status
 */
export const updateEventStatus = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body as UpdateEventStatusRequest;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate status value
    const validStatuses = Object.values(EventStatus);
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
        message: 'You must own a brand to update event status',
      });
    }

    // Update status
    const event = await EventLifecycleService.updateEventStatus(id, brand.id, status);

    res.status(200).json({
      success: true,
      message: `Event status updated to ${status}`,
      event,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    logger.error({ err: error }, 'Error in updateEventStatus:');
    res.status(500).json({ success: false, error: 'Failed to update event status' });
  }
};

/**
 * Publish event (DRAFT → SCHEDULED)
 * POST /api/events/:id/publish
 */
export const publishEvent = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
        message: 'You must own a brand to publish events',
      });
    }

    // Publish event
    const event = await EventLifecycleService.publishEvent(id, brand.id);

    res.status(200).json({
      success: true,
      message: 'Event published successfully',
      event,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    logger.error({ err: error }, 'Error in publishEvent:');
    res.status(500).json({ success: false, error: 'Failed to publish event' });
  }
};

// ==================== DELETE ====================

/**
 * Delete event (soft delete)
 * DELETE /api/events/:id
 */
export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
        message: 'You must own a brand to delete events',
      });
    }

    // Delete event
    await EventMutationService.deleteEvent(id, brand.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in deleteEvent:');

    // Ownership error
    if (error.message.includes('Forbidden') || error.message.includes('do not own')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    // Not found
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete event',
    });
  }
};
/**
 * Cancel an event
 * POST /api/events/:id/cancel
 */
export const cancelEvent = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
      });
    }

    const event = await EventLifecycleService.cancelEvent(id, brand.id);

    res.status(200).json({
      success: true,
      message: 'Event cancelled successfully',
      event,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in cancelEvent:');
    res.status(error.message.includes('Forbidden') ? 403 : 400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Stop an event early (VOTE_ONLY only)
 * POST /api/events/:id/stop
 */
export const stopEventEarly = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
      });
    }

    const event = await EventLifecycleService.stopEventEarly(id, brand.id);

    res.status(200).json({
      success: true,
      message: 'Event stopped early and rankings computed',
      event,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in stopEventEarly:');
    res.status(error.message.includes('Forbidden') ? 403 : 400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get events voted by user
 * GET /api/events/user/:userId/voted
 */
export const getEventsVotedByUser = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const events = await EventQueryService.getEventsVotedByUser(userId);

    res.status(200).json({
      success: true,
      events,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in getEventsVotedByUser:');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch voted events',
    });
  }
};

// ==================== BLOCKCHAIN UPDATES ====================

/**
 * Update blockchain status (success)
 * PATCH /api/events/:id/blockchain
 */
export const updateBlockchainStatus = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { txHash, onChainEventId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!txHash || !onChainEventId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: txHash and onChainEventId are required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
      });
    }

    const event = await EventLifecycleService.updateBlockchainStatus(id, brand.id, txHash, onChainEventId);

    res.status(200).json({
      success: true,
      message: 'Blockchain status updated successfully',
      event,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in updateBlockchainStatus:');

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('Forbidden')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Event rewards pool already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to update blockchain status',
    });
  }
};

/**
 * Mark blockchain transaction as failed
 * PATCH /api/events/:id/blockchain-failed
 */
export const failBlockchainStatus = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get brand owned by authenticated user
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
      });
    }

    const event = await EventLifecycleService.failBlockchainStatus(id, brand.id, reason);

    res.status(200).json({
      success: true,
      message: 'Blockchain status marked as failed',
      event,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error in failBlockchainStatus:');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update blockchain status',
    });
  }
};
