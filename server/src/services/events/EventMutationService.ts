import { EventValidationService } from './EventValidationService.js';
import { EventQueryService } from './EventQueryService.js';
import { EventLifecycleService } from './EventLifecycleService.js';
import { EventRankingService } from './EventRankingService.js';
import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma.js';
import { Event, EventType } from '@prisma/client';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors.js';
import {
  CreateEventRequest,
  UpdateEventRequest,
  EventFilters,
  EventStatus,
  EventStatusType,
  VALID_TRANSITIONS,
  LOCKED_FIELDS_MAP,
  TimestampData,
  ValidationResult,
} from '../../types/event.js';
import { NotificationService } from '../social/notificationService.js';
import { getIPFSUrl } from '../ipfsService.js';
import { MilestoneService } from '../xp/milestoneService.js';
import { BrandXpService } from '../brands/brandXpService.js';

import { TrustService } from '../trustService.js';

export class EventMutationService {


  // ==================== CREATE ====================

  /**
   * Create a new event
   */
  static async createEvent(
    data: CreateEventRequest,
    brandId: string
  ): Promise<Event> {
    // 1. Validate required fields
    if (!data.title || !data.eventType || !data.startTime || !data.endTime) {
      throw new Error(
        'Missing required fields: title, eventType, startTime, and endTime are required'
      );
    }

    // 2. Trim title
    const trimmedTitle = data.title.trim();

    // 3. Parse dates
    const startTime = EventValidationService.parseDate(data.startTime);
    const endTime = EventValidationService.parseDate(data.endTime);
    const nextPhaseAt = data.nextPhaseAt ? EventValidationService.parseDate(data.nextPhaseAt) : null;

    // For post_and_vote: auto-derive postingStart/postingEnd if not provided.
    // Default: postingStart = startTime, postingEnd = midpoint between start and end.
    let postingStart: Date | null = data.postingStart ? EventValidationService.parseDate(data.postingStart) : null;
    let postingEnd: Date | null = data.postingEnd ? EventValidationService.parseDate(data.postingEnd) : null;
    if (data.eventType === 'post_and_vote') {
      if (!postingStart) postingStart = startTime;
      if (!postingEnd) {
        const midMs = startTime.getTime() + (endTime.getTime() - startTime.getTime()) / 2;
        postingEnd = new Date(midMs);
      }
    }

    // 4. Validate event data
    const dataValidation = EventValidationService.validateEventData(data, data.eventType);
    if (!dataValidation.isValid) {
      throw new Error(`Validation failed: ${dataValidation.errors.join(', ')}`);
    }

    // 5. Validate timestamps
    const timestampValidation = EventValidationService.validateTimestamps(
      { startTime, endTime, postingStart, postingEnd },
      data.eventType
    );
    if (!timestampValidation.isValid) {
      throw new Error(`Timestamp validation failed: ${timestampValidation.errors.join(', ')}`);
    }

    // 6. Validate nextPhaseAt if autoTransition is enabled
    if (data.autoTransition && nextPhaseAt) {
      if (nextPhaseAt <= new Date()) {
        throw new Error('nextPhaseAt must be in the future when autoTransition is enabled');
      }
    }

    // Validate rewards and capacity
    if (data.baseReward && data.baseReward < 0) throw new Error("Base reward cannot be negative");
    if (data.topReward && data.topReward < 0) throw new Error("Top reward cannot be negative");

    // Enforce reward pool minimums:
    // All event types: topReward >= 1× (baseReward × capacity)
    if (data.capacity && data.baseReward && data.topReward !== undefined) {
      const basePool = data.capacity * data.baseReward;
      const multiplier = 1;
      const minTopReward = basePool * multiplier;
      if (data.topReward < minTopReward) {
        throw new Error(
          `Top reward must be at least ${multiplier}× the base reward pool ($${minTopReward.toFixed(2)} USDC)`
        );
      }
    }

    // Capacity check: Must be present and > 4
    if (!data.capacity || data.capacity < 5) {
      throw new Error("Capacity is required and must be at least 5");
    }

    // Minimum duration check: 10 minutes
    const durationMs = endTime.getTime() - startTime.getTime();
    if (durationMs < 10 * 60 * 1000) {
      throw new Error("Event duration must be at least 10 minutes");
    }

    // 7. Validate proposals for VOTE_ONLY events
    if (data.eventType === 'vote_only') {
      // VOTE_ONLY events MUST have proposals if being created as SCHEDULED
      const willBeScheduled = !data.status || data.status === EventStatus.SCHEDULED;

      if (willBeScheduled) {
        // Enforce proposals requirement for SCHEDULED vote_only events
        // Each proposal is now ONE voting option, so we need at least 2
        if (!data.proposals || data.proposals.length < 2) {
          throw new Error('Vote only events must have at least 2 proposals');
        }

        // Maximum 10 proposals allowed for vote-only events
        if (data.proposals.length > 10) {
          throw new Error('Vote only events can have at most 10 proposals');
        }
      }

    } else if (data.eventType === 'post_and_vote') {
      // Reject proposals for post_and_vote events
      if (data.proposals && data.proposals.length > 0) {
        throw new Error('Proposals are only allowed for VOTE_ONLY events');
      }
    }

    // 8. Create event with proposals and analytics in transaction
    const event = await prisma.$transaction(async (tx) => {
      // Create event - defaults to SCHEDULED for complete events
      const newEvent = await tx.event.create({
        data: {
          id: data.id, // Use provided ID if available (from frontend UUID generation)
          title: trimmedTitle,
          description: data.description || null,
          category: data.category || null,
          eventType: data.eventType,
          status: data.status || EventStatus.SCHEDULED, // Default to SCHEDULED for new events
          startTime,
          endTime,
          postingStart,
          postingEnd,
          imageCid: data.imageCid || null,
          imageUrl: data.imageUrl || null,
          allowSubmissions: data.allowSubmissions ?? true,
          allowVoting: data.allowVoting ?? true,
          autoTransition: data.autoTransition ?? false,
          nextPhaseAt,
          // New fields
          baseReward: data.baseReward || null,
          topReward: data.topReward || null,
          leaderboardPool: data.leaderboardPool || null,
          capacity: data.capacity || null,
          isVerified: false,
          brandId,
          samples: data.samples || [],
          // Audience targeting fields
          preferredGender: data.preferredGender || 'All',
          ageGroup: data.ageGroup || 'All Ages',
          // Content & campaign fields
          tagline: data.tagline || null,
          participantInstructions: data.participantInstructions || null,
          submissionGuidelines: data.submissionGuidelines || null,
          moderationRules: data.moderationRules || null,
          hashtags: data.hashtags || [],
          regions: data.regions || [],
          // Audience Targeting Hard Filters
          ageRestriction: data.ageRestriction || null,
          genderRestriction: data.genderRestriction || null,
          intendedCategories: data.intendedCategories || [],
          // Web3 Fields
          blockchainStatus: data.blockchainStatus || 'PENDING_BLOCKCHAIN',
        },
      });

      // Create proposals if provided
      if (data.proposals && data.proposals.length > 0) {
        await tx.proposal.createMany({
          data: data.proposals.map((p, idx) => ({
            eventId: newEvent.id,
            type: p.type as any,
            title: p.title,
            content: p.content || null,
            imageCid: p.imageCid || null,
            imageUrl: p.imageUrl || null,
            order: p.order ?? idx,
          })),
        });
      }

      // Create analytics record
      await tx.eventAnalytics.create({
        data: {
          eventId: newEvent.id,
          totalViews: 0,
          totalSubmissions: 0,
          totalVotes: 0,
          uniqueParticipants: 0,
        },
      });

      // WEB3 CHANGE: Reward pool is now created AFTER blockchain confirmation
      // We do NOT create EventRewardsPool here anymore.
      // It will be created in updateBlockchainStatus

      return newEvent;
    });

    // Send brand post notification to all subscribers (async, don't block event creation)
    // Send brand post notification to all subscribers (async, don't block event creation)
    // Only send if event is effectively live (POSTING or VOTING) AND verified on blockchain
    const isBlockchainPending = event.blockchainStatus === 'PENDING_BLOCKCHAIN';

    if (!isBlockchainPending && (event.status === EventStatus.POSTING || event.status === EventStatus.VOTING)) {
      (async () => {
        try {
          await NotificationService.createBrandPostNotification(brandId, event.id);
        } catch (error) {
          logger.error({ err: error }, 'Failed to send brand post notification:');
        }
      })();
    }

    return event;
  }


  // ==================== UPDATE ====================

  /**
   * Update event
   */
  /**
   * Update event
   */
  static async updateEvent(
    id: string,
    brandId: string,
    data: UpdateEventRequest
  ): Promise<Event> {
    // 1. Fetch current event
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event || (event as any).isDeleted) throw new NotFoundError('Event not found');

    if (event.brandId !== brandId) throw new ForbiddenError('You do not own this event');

    // Check locked fields
    const lockedFields = EventValidationService.getLockedFields(event.status);

    // Check if user is trying to update locked fields
    const attemptedLocked = lockedFields.includes('*')
      ? Object.keys(data).filter(key => data[key as keyof UpdateEventRequest] !== undefined)
      : Object.keys(data).filter((key) =>
        lockedFields.includes(key) && data[key as keyof UpdateEventRequest] !== undefined
      );

    if (attemptedLocked.length > 0) {
      throw new Error(
        `Cannot update locked fields: ${attemptedLocked.join(', ')}`
      );
    }

    // Build update data object (only unlocked fields)
    const updateData: any = {};

    if (!lockedFields.includes('title') && data.title !== undefined) {
      const trimmedTitle = data.title.trim();
      if (trimmedTitle.length === 0) {
        throw new Error('Title cannot be empty');
      }
      if (trimmedTitle.length > 200) {
        throw new Error('Title must be 200 characters or less');
      }
      updateData.title = trimmedTitle;
    }

    if (!lockedFields.includes('description') && data.description !== undefined) {
      if (data.description.length > 2000) {
        throw new Error('Description must be 2000 characters or less');
      }
      updateData.description = data.description;
    }

    if (!lockedFields.includes('category') && data.category !== undefined) {
      updateData.category = data.category;
    }

    if (!lockedFields.includes('eventType') && data.eventType !== undefined) {
      updateData.eventType = data.eventType;
    }

    if (!lockedFields.includes('imageCid') && data.imageCid !== undefined) {
      // Validate CID if provided
      if (data.imageCid.length > 0) {
        if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(data.imageCid)) {
          throw new Error('Invalid IPFS CID format');
        }
      }
      updateData.imageCid = data.imageCid;
    }
    if (!lockedFields.includes('imageUrl') && data.imageUrl !== undefined) {
      updateData.imageUrl = data.imageUrl;
    }

    if (!lockedFields.includes('imageUrl') && data.imageUrl !== undefined) {
      updateData.imageUrl = data.imageUrl;
    }

    if (!lockedFields.includes('allowSubmissions') && data.allowSubmissions !== undefined) {
      updateData.allowSubmissions = data.allowSubmissions;
    }

    if (!lockedFields.includes('allowVoting') && data.allowVoting !== undefined) {
      updateData.allowVoting = data.allowVoting;
    }

    if (!lockedFields.includes('autoTransition') && data.autoTransition !== undefined) {
      updateData.autoTransition = data.autoTransition;
    }

    if (!lockedFields.includes('ageRestriction') && data.ageRestriction !== undefined) {
      updateData.ageRestriction = data.ageRestriction;
    }

    if (!lockedFields.includes('genderRestriction') && data.genderRestriction !== undefined) {
      updateData.genderRestriction = data.genderRestriction;
    }

    if (!lockedFields.includes('intendedCategories') && data.intendedCategories !== undefined) {
      updateData.intendedCategories = data.intendedCategories;
    }

    // Handle timestamp updates
    const timestampUpdates: any = {};
    let hasTimestampUpdates = false;

    if (!lockedFields.includes('startTime') && data.startTime !== undefined) {
      timestampUpdates.startTime = EventValidationService.parseDate(data.startTime);
      hasTimestampUpdates = true;
    }

    if (!lockedFields.includes('endTime') && data.endTime !== undefined) {
      timestampUpdates.endTime = EventValidationService.parseDate(data.endTime);
      hasTimestampUpdates = true;
    }

    if (!lockedFields.includes('postingStart') && data.postingStart !== undefined) {
      timestampUpdates.postingStart = EventValidationService.parseDate(data.postingStart);
      hasTimestampUpdates = true;
    }

    if (!lockedFields.includes('postingEnd') && data.postingEnd !== undefined) {
      timestampUpdates.postingEnd = EventValidationService.parseDate(data.postingEnd);
      hasTimestampUpdates = true;
    }

    if (!lockedFields.includes('nextPhaseAt') && data.nextPhaseAt !== undefined) {
      timestampUpdates.nextPhaseAt = EventValidationService.parseDate(data.nextPhaseAt);
      hasTimestampUpdates = true;
    }

    // Validate timestamps if any were updated
    if (hasTimestampUpdates) {
      const mergedTimestamps = {
        startTime: timestampUpdates.startTime || event.startTime,
        endTime: timestampUpdates.endTime || event.endTime,
        postingStart: timestampUpdates.postingStart !== undefined
          ? timestampUpdates.postingStart
          : event.postingStart,
        postingEnd: timestampUpdates.postingEnd !== undefined
          ? timestampUpdates.postingEnd
          : event.postingEnd,
      };

      const eventType = updateData.eventType || event.eventType;

      const timestampValidation = EventValidationService.validateTimestamps(mergedTimestamps, eventType);
      if (!timestampValidation.isValid) {
        throw new Error(
          `Timestamp validation failed: ${timestampValidation.errors.join(', ')}`
        );
      }

      // Add timestamp updates to updateData
      Object.assign(updateData, timestampUpdates);
    }

    // Validate merged event data
    const mergedData = { ...event, ...updateData };
    const dataValidation = EventValidationService.validateEventData(mergedData, mergedData.eventType);
    if (!dataValidation.isValid) {
      throw new Error(`Validation failed: ${dataValidation.errors.join(', ')}`);
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    return updatedEvent;
  }


  // ==================== DELETE ====================

  /**
   * Delete event (soft delete)
   */
  static async deleteEvent(id: string, brandId: string): Promise<void> {
    // 1. Fetch event
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Check if already soft-deleted
    if ((event as any).isDeleted) {
      throw new Error('Event not found');
    }

    // 2. Ownership check
    if (event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this event');
    }

    // 3. Hard delete allowed ONLY for draft events with no submissions
    if (event.status === EventStatus.DRAFT && event._count.submissions === 0) {
      await prisma.event.delete({ where: { id } });
      return;
    }

    // 4. Soft delete for all other cases
    await prisma.event.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}
