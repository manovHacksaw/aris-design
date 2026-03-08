import { prisma } from '../lib/prisma.js';
import { Event, EventType } from '@prisma/client';
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
} from '../types/event.js';
import { NotificationService } from './notificationService.js';
import { getIPFSUrl } from './ipfsService.js';
import { MilestoneService } from './milestoneService.js';
import { BrandXpService } from './brandXpService.js';
import { RewardsService } from './rewardsService.js';
import { TrustService } from './trustService.js';

export class EventService {
  // ==================== VALIDATION HELPERS ====================

  /**
   * Validate event data fields
   */
  private static validateEventData(
    data: Partial<CreateEventRequest>,
    eventType: EventType
  ): ValidationResult {
    const errors: string[] = [];

    // Title validation
    if (data.title !== undefined) {
      const trimmedTitle = data.title.trim();
      if (trimmedTitle.length === 0) {
        errors.push('Title cannot be empty');
      }
      if (trimmedTitle.length > 200) {
        errors.push('Title must be 200 characters or less');
      }
    }

    // Description validation
    if (data.description !== undefined && data.description.length > 2000) {
      errors.push('Description must be 2000 characters or less');
    }

    // Event type specific validations
    if (eventType === 'post_and_vote') {
      if (data.postingStart === undefined && data.title !== undefined) {
        // Only check if this is creation (title is present)
        errors.push('postingStart is required for post_and_vote events');
      }
      if (data.postingEnd === undefined && data.title !== undefined) {
        errors.push('postingEnd is required for post_and_vote events');
      }
      if (data.leaderboardPool === undefined && data.title !== undefined) {
        errors.push('leaderboardPool is required for post_and_vote events');
      } else if (data.leaderboardPool !== undefined && (data.leaderboardPool as any) < 0) {
        errors.push('leaderboardPool cannot be negative');
      }
    }

    // Samples validation for post_and_vote
    if (eventType === 'post_and_vote') {
      if (data.title !== undefined && (!data.samples || data.samples.length === 0)) {
        errors.push('At least one sample image is required for post_and_vote events');
      }
      if (data.samples && data.samples.length > 10) {
        errors.push('Maximum 10 sample images allowed');
      }

      // Validate sample CIDs
      if (data.samples && data.samples.length > 0) {
        const invalidCids = data.samples.some(cid => !/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(cid));
        if (invalidCids) {
          errors.push('One or more sample CIDs are invalid');
        }
      }
    }

    // IPFS CID validation (basic format check)
    if (data.imageCid !== undefined && data.imageCid.length > 0) {
      // Basic CID validation: should start with 'Qm' or 'bafy' for CIDv0/v1
      if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(data.imageCid)) {
        errors.push('Invalid IPFS CID format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate timestamp logic and ordering
   */
  private static validateTimestamps(
    data: TimestampData,
    eventType: EventType
  ): ValidationResult {
    const errors: string[] = [];
    const now = new Date();

    const { startTime, endTime, postingStart, postingEnd } = data;

    // Start time must be in the future (with 5 minute buffer for clock drift)
    if (startTime <= new Date(now.getTime() - 300000)) {
      errors.push('startTime must be in the future');
    }

    // End time must be after start time
    if (endTime <= startTime) {
      errors.push('endTime must be after startTime');
    }

    // Validate posting phase timestamps for post_and_vote events
    if (eventType === 'post_and_vote') {
      if (!postingStart || !postingEnd) {
        errors.push('postingStart and postingEnd are required for post_and_vote events');
        return { isValid: false, errors };
      }

      // Posting start must be before or equal to event start
      if (postingStart > startTime) {
        errors.push('postingStart must be before or equal to startTime');
      }

      // Posting end must be after posting start
      if (postingEnd <= postingStart) {
        errors.push('postingEnd must be after postingStart');
      }

      // Posting end must be before or equal to event end
      if (postingEnd > endTime) {
        errors.push('postingEnd must be before or equal to endTime');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get locked fields for a given event status
   */
  public static getLockedFields(status: string): string[] {
    return LOCKED_FIELDS_MAP[status as EventStatusType] || [];
  }

  /**
   * Check if a status transition is valid
   */
  private static isValidStatusTransition(
    currentStatus: string,
    newStatus: string
  ): boolean {
    const validNextStatuses = VALID_TRANSITIONS[currentStatus as EventStatusType];
    return validNextStatuses?.includes(newStatus as EventStatusType) ?? false;
  }

  /**
   * Parse ISO 8601 date string to Date object
   */
  private static parseDate(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateString}`);
    }
    return date;
  }

  // ==================== IPFS URL HELPERS ====================

  /**
   * Transform event with optimized IPFS image URLs
   */
  private static addImageUrls(event: any): any {
    if (!event) return event;

    const transformed = { ...event };

    // Add event image URLs
    if (event.imageCid) {
      transformed.imageUrls = {
        thumbnail: getIPFSUrl(event.imageCid, 'thumbnail'),
        medium: getIPFSUrl(event.imageCid, 'medium'),
        large: getIPFSUrl(event.imageCid, 'large'),
        full: getIPFSUrl(event.imageCid, 'full'),
      };
    }

    // Add brand logo URLs if brand is included
    if (event.brand?.logoCid) {
      transformed.brand = {
        ...event.brand,
        logoUrls: {
          thumbnail: getIPFSUrl(event.brand.logoCid, 'thumbnail'),
          medium: getIPFSUrl(event.brand.logoCid, 'medium'),
          full: getIPFSUrl(event.brand.logoCid, 'full'),
        },
      };
    }

    // Add submission image URLs if submissions are included
    if (event.submissions && Array.isArray(event.submissions)) {
      transformed.submissions = event.submissions.map((submission: any) => ({
        ...submission,
        ...(submission.imageCid && {
          imageUrls: {
            thumbnail: getIPFSUrl(submission.imageCid, 'thumbnail'),
            medium: getIPFSUrl(submission.imageCid, 'medium'),
            large: getIPFSUrl(submission.imageCid, 'large'),
            full: getIPFSUrl(submission.imageCid, 'full'),
          },
        }),
      }));
    }

    // Add proposal image URLs if proposals are included
    if (event.proposals && Array.isArray(event.proposals)) {
      transformed.proposals = event.proposals.map((proposal: any) => ({
        ...proposal,
        ...(proposal.imageCid && {
          imageUrls: {
            thumbnail: getIPFSUrl(proposal.imageCid, 'thumbnail'),
            medium: getIPFSUrl(proposal.imageCid, 'medium'),
            large: getIPFSUrl(proposal.imageCid, 'large'),
            full: getIPFSUrl(proposal.imageCid, 'full'),
          },
        }),
      }));
    }

    // Add samples URLs if present
    if (event.samples && Array.isArray(event.samples) && event.samples.length > 0) {
      transformed.sampleUrls = event.samples.map((cid: string) => ({
        cid,
        urls: {
          thumbnail: getIPFSUrl(cid, 'thumbnail'),
          medium: getIPFSUrl(cid, 'medium'),
          large: getIPFSUrl(cid, 'large'),
          full: getIPFSUrl(cid, 'full'),
        }
      }));
    }

    return transformed;
  }

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
    const startTime = this.parseDate(data.startTime);
    const endTime = this.parseDate(data.endTime);
    const postingStart = data.postingStart ? this.parseDate(data.postingStart) : null;
    const postingEnd = data.postingEnd ? this.parseDate(data.postingEnd) : null;
    const nextPhaseAt = data.nextPhaseAt ? this.parseDate(data.nextPhaseAt) : null;

    // 4. Validate event data
    const dataValidation = this.validateEventData(data, data.eventType);
    if (!dataValidation.isValid) {
      throw new Error(`Validation failed: ${dataValidation.errors.join(', ')}`);
    }

    // 5. Validate timestamps
    const timestampValidation = this.validateTimestamps(
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
          console.error('Failed to send brand post notification:', error);
        }
      })();
    }

    return event;
  }

  // ==================== READ ====================

  /**
   * Get event by ID
   * Applies visibility rules for submissions based on event status and user role
   */
  static async getEventById(id: string, userId?: string): Promise<any | null> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logoCid: true,
            ownerId: true,
          },
        },
        eventAnalytics: true,
        proposals: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
            votes: true,
          },
        },
      },
    });

    if (event && event.eventAnalytics && event._count) {
      // Ensure _count reflects eventAnalytics if it's higher (sometimes Prisma count can be out of sync with manual increments)
      if (event.eventAnalytics.totalVotes > event._count.votes) {
        (event as any)._count.votes = event.eventAnalytics.totalVotes;
      }
      if (event.eventAnalytics.totalSubmissions > event._count.submissions) {
        (event as any)._count.submissions = event.eventAnalytics.totalSubmissions;
      }
    }

    // Exclude soft-deleted events
    if (!event || (event as any).isDeleted) {
      return null;
    }

    // CRITICAL: Hide events not yet confirmed on blockchain (except for brand owners)
    if (event.blockchainStatus !== 'ACTIVE') {
      const isBrandOwner = userId && event.brand.ownerId === userId;
      if (!isBrandOwner) {
        return null;
      }
    }

    // Apply submission visibility rules
    let submissions: any[] = [];

    if (event.status === EventStatus.POSTING) {
      // POSTING phase: Special visibility rules
      const isBrandOwner = userId && event.brand.ownerId === userId;

      if (!isBrandOwner && userId) {
        // Regular users can only see their own submission during POSTING
        submissions = await prisma.submission.findMany({
          where: {
            eventId: id,
            userId,
            status: 'active',
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: { votes: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
      // Brand owners see no submissions during POSTING (submissions remains [])
    } else if ([EventStatus.VOTING, EventStatus.COMPLETED].includes(event.status as any)) {
      // VOTING and COMPLETED: All submissions visible to everyone
      submissions = await prisma.submission.findMany({
        where: {
          eventId: id,
          status: 'active',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: { votes: true },
          },
        },
        orderBy: event.status === EventStatus.COMPLETED
          ? { finalRank: 'asc' }
          : { createdAt: 'desc' },
      });
    }
    // For other states (DRAFT, SCHEDULED, CANCELLED), submissions remains []

    // Calculate total joined (unique users who voted OR submitted)
    // This is distinct from 'uniqueParticipants' in analytics which tracks views
    const [uniqueVoters, uniquePosters] = await Promise.all([
      prisma.vote.findMany({
        where: { eventId: id },
        select: { userId: true },
        distinct: ['userId']
      }),
      event.eventType === 'post_and_vote'
        ? prisma.submission.findMany({
          where: { eventId: id, status: 'active' },
          select: { userId: true },
          distinct: ['userId']
        })
        : Promise.resolve([])
    ]);

    const participantSet = new Set([
      ...uniqueVoters.map(v => v.userId),
      ...uniquePosters.map(p => p.userId)
    ]);
    const totalParticipants = participantSet.size;

    // If userId is provided, check for user's votes and submissions
    if (userId) {
      const [userVotes, userSubmission] = await Promise.all([
        prisma.vote.findMany({
          where: {
            eventId: id,
            userId,
          },
        }),
        prisma.submission.findFirst({
          where: {
            eventId: id,
            userId,
          },
        }),
      ]);

      return this.addImageUrls({
        ...event,
        submissions,
        userVotes,
        hasVoted: userVotes.length > 0,
        hasSubmitted: !!userSubmission,
        userSubmission: userSubmission || null,
        totalParticipants,
      });
    }

    return this.addImageUrls({
      ...event,
      submissions,
      totalParticipants,
    });
  }

  /**
   * Get events with filters and pagination
   */
  static async getEvents(
    filters: EventFilters,
    userBrandId?: string,
    viewingUserId?: string
  ): Promise<{ events: Event[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Max 100
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isDeleted: false, // Exclude soft-deleted
    };

    // Apply search query if present
    if (filters.q && typeof filters.q === 'string') {
      where.title = { contains: filters.q, mode: 'insensitive' };
    }

    // CRITICAL: Filter out pending/failed blockchain events for public listing
    // We'll override this for brand owners below
    if (!userBrandId) {
      where.blockchainStatus = 'ACTIVE';
    }

    // MILESTONE 3: Visibility filtering
    // SCHEDULED events only visible to brand owner
    // CANCELLED events hidden from everyone
    if (!userBrandId) {
      // Regular users: only see posting, voting, completed
      where.status = filters.status
        ? filters.status
        : { in: [EventStatus.POSTING, EventStatus.VOTING, EventStatus.COMPLETED] };
    } else {
      // Brand owners: see their own events (any status except cancelled) + public events
      if (filters.status) {
        // If filtering by status, respect it but still apply ownership rules
        if (filters.status === EventStatus.SCHEDULED) {
          // SCHEDULED: only their own events
          where.brandId = userBrandId;
          where.status = EventStatus.SCHEDULED;
        } else if (filters.status === EventStatus.CANCELLED) {
          // CANCELLED: never shown
          where.status = EventStatus.CANCELLED;
          where.brandId = userBrandId; // Only their own cancelled events
        } else {
          // Other statuses: their events OR public events
          where.OR = [
            { brandId: userBrandId },
            { status: filters.status },
          ];
        }
      } else {
        // No status filter: their events OR public events (not scheduled/cancelled)
        where.OR = [
          { brandId: userBrandId },
          { status: { in: [EventStatus.POSTING, EventStatus.VOTING, EventStatus.COMPLETED] } },
        ];
      }
    }

    // Apply other filters
    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.brandId) {
      // Override visibility logic if filtering by specific brand
      where.brandId = filters.brandId;
      delete where.OR;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    // Execute query with transaction for consistency
    const [events, total] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              logoCid: true,
            },
          },
          proposals: {
            take: 3,
            orderBy: { order: 'asc' },
          },
          submissions: {
            where: {
              status: 'active',
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
          eventAnalytics: true,
          _count: {
            select: {
              submissions: true,
              votes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    // Check for user votes and submissions if viewingUserId provided
    if (viewingUserId && events.length > 0) {
      const eventIds = events.map(e => e.id);

      const [votes, submissions] = await Promise.all([
        prisma.vote.findMany({
          where: {
            userId: viewingUserId,
            eventId: { in: eventIds }
          },
          select: { eventId: true }
        }),
        prisma.submission.findMany({
          where: {
            userId: viewingUserId,
            eventId: { in: eventIds },
            status: 'active'
          },
          select: { eventId: true }
        })
      ]);

      const votedEventIds = new Set(votes.map(v => v.eventId));
      const submittedEventIds = new Set(submissions.map(s => s.eventId));

      // Update events in place
      events.forEach((event: any) => {
        event.hasVoted = votedEventIds.has(event.id);
        event.hasSubmitted = submittedEventIds.has(event.id);
      });
    }

    return {
      events: events.map(event => this.addImageUrls(event)),
      total
    };
  }

  /**
   * Get events voted by user
   */
  static async getEventsVotedByUser(userId: string): Promise<any[]> {
    const events = await prisma.event.findMany({
      where: {
        votes: {
          some: {
            userId: userId
          }
        },
        isDeleted: false
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logoCid: true,
            ownerId: true,
          }
        },
        votes: {
          where: { userId: userId },
          take: 3,
          include: {
            submission: {
              select: { imageCid: true }
            },
            proposal: {
              select: { imageCid: true }
            }
          }
        },
        _count: {
          select: {
            submissions: true,
            votes: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Post-process to extract images and add IPFS URLs
    return events.map(event => {
      // Extract images from votes
      const voteImages = event.votes
        .map(v => v.submission?.imageCid || v.proposal?.imageCid)
        .filter((cid): cid is string => !!cid);

      return this.addImageUrls({
        ...event,
        previewImages: voteImages
      });
    });
  }

  /**
   * Get events for a specific brand
   */
  static async getEventsByBrand(
    brandId: string,
    status?: string
  ): Promise<Event[]> {
    const where: any = {
      brandId,
      isDeleted: false,
    };

    if (status) {
      where.status = status;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        eventAnalytics: true,
        _count: {
          select: {
            submissions: true,
            votes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return events.map(event => this.addImageUrls(event));
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

    if (!event) {
      throw new Error('Event not found');
    }

    // Check if soft-deleted
    if ((event as any).isDeleted) {
      throw new Error('Event not found');
    }

    // Check ownership
    if (event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this event');
    }

    // Check locked fields
    const lockedFields = this.getLockedFields(event.status);

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

    if (!lockedFields.includes('allowSubmissions') && data.allowSubmissions !== undefined) {
      updateData.allowSubmissions = data.allowSubmissions;
    }

    if (!lockedFields.includes('allowVoting') && data.allowVoting !== undefined) {
      updateData.allowVoting = data.allowVoting;
    }

    if (!lockedFields.includes('autoTransition') && data.autoTransition !== undefined) {
      updateData.autoTransition = data.autoTransition;
    }

    // Handle timestamp updates
    const timestampUpdates: any = {};
    let hasTimestampUpdates = false;

    if (!lockedFields.includes('startTime') && data.startTime !== undefined) {
      timestampUpdates.startTime = this.parseDate(data.startTime);
      hasTimestampUpdates = true;
    }

    if (!lockedFields.includes('endTime') && data.endTime !== undefined) {
      timestampUpdates.endTime = this.parseDate(data.endTime);
      hasTimestampUpdates = true;
    }

    if (!lockedFields.includes('postingStart') && data.postingStart !== undefined) {
      timestampUpdates.postingStart = this.parseDate(data.postingStart);
      hasTimestampUpdates = true;
    }

    if (!lockedFields.includes('postingEnd') && data.postingEnd !== undefined) {
      timestampUpdates.postingEnd = this.parseDate(data.postingEnd);
      hasTimestampUpdates = true;
    }

    if (!lockedFields.includes('nextPhaseAt') && data.nextPhaseAt !== undefined) {
      timestampUpdates.nextPhaseAt = this.parseDate(data.nextPhaseAt);
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

      const timestampValidation = this.validateTimestamps(mergedTimestamps, eventType);
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
    const dataValidation = this.validateEventData(mergedData, mergedData.eventType);
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

  /**
   * Update event status
   */
  static async updateEventStatus(
    id: string,
    brandId: string,
    newStatus: EventStatusType
  ): Promise<Event> {
    // 1. Fetch event
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new Error('Event not found');
    }

    // Check if soft-deleted
    if ((event as any).isDeleted) {
      throw new Error('Event not found');
    }

    // 2. Ownership check
    if (event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this event');
    }

    // 3. Validate transition
    if (!this.isValidStatusTransition(event.status, newStatus)) {
      throw new Error(
        `Invalid status transition: ${event.status} -> ${newStatus}`
      );
    }

    // 4. Event type compatibility check
    if (newStatus === EventStatus.POSTING && event.eventType === 'vote_only') {
      throw new Error('Cannot transition vote_only event to posting phase');
    }

    // 5. Validate timestamps for transition
    const now = new Date();

    if (newStatus === EventStatus.VOTING && event.postingEnd && now < event.postingEnd) {
      throw new Error('Cannot transition to voting before posting period ends');
    }

    // 6. Update status
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: newStatus },
    });

    return updatedEvent;
  }

  /**
   * Publish event (transition from DRAFT to SCHEDULED)
   */
  static async publishEvent(id: string, brandId: string): Promise<Event> {
    // 1. Fetch event with brand and proposals
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        brand: true,
        proposals: true,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Check if soft-deleted
    if ((event as any).isDeleted) {
      throw new Error('Event not found');
    }

    // 2. Ownership check
    if (event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this event');
    }

    // 3. Can only publish DRAFT events
    if (event.status !== EventStatus.DRAFT) {
      throw new Error('Only DRAFT events can be published');
    }

    // 4. Validate event is complete before publishing
    if (!event.title || !event.eventType || !event.startTime || !event.endTime) {
      throw new Error('Event must have title, type, start time, and end time before publishing');
    }

    // 5. For post_and_vote events, require posting times, leaderboard pool, and samples
    if (event.eventType === 'post_and_vote') {
      if (!event.postingStart || !event.postingEnd) {
        throw new Error('Post and vote events must have posting start and end times before publishing');
      }
      if (event.leaderboardPool === null || event.leaderboardPool === undefined) {
        throw new Error('Post and vote events must have a leaderboard pool before publishing');
      }
      if (!event.samples || event.samples.length === 0) {
        throw new Error('Post and vote events must have at least one sample image before publishing');
      }
    }

    // 6. For vote_only events, require at least 2 proposals
    // Each proposal is ONE voting option now (no more MCQ with multiple choices)
    if (event.eventType === 'vote_only') {
      if (!event.proposals || event.proposals.length < 2) {
        throw new Error('Vote only events must have at least 2 proposals before publishing');
      }
    }

    // 7. Validate timestamps one more time
    const now = new Date();
    if (event.startTime <= new Date(now.getTime() - 60000)) {
      throw new Error('Start time must be in the future');
    }
    if (event.endTime <= event.startTime) {
      throw new Error('End time must be after start time');
    }

    // 8. Publish (transition to SCHEDULED)
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: EventStatus.SCHEDULED },
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

  // ==================== MILESTONE 3: RANKING & TRANSITIONS ====================

  /**
   * Compute and assign rankings for submissions or proposals
   * Sort by voteCount DESC, then createdAt ASC (tie-breaker)
   */
  static async computeRankings(eventId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        submissions: {
          include: {
            _count: { select: { votes: true } },
          },
        },
        proposals: {
          include: {
            _count: { select: { votes: true } },
          },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Fetch last vote timestamps for tie-breaking
    const lastVotes = await prisma.vote.groupBy({
      by: ['submissionId', 'proposalId'],
      where: { eventId },
      _max: { createdAt: true },
    });

    const lastVoteMap = new Map<string, Date>();
    lastVotes.forEach((lv) => {
      const id = lv.submissionId || lv.proposalId;
      if (id && lv._max.createdAt) {
        lastVoteMap.set(id, lv._max.createdAt);
      }
    });

    await prisma.$transaction(async (tx) => {
      if (event.eventType === 'post_and_vote') {
        const ranked = event.submissions
          .map((s) => ({
            id: s.id,
            voteCount: s._count.votes,
            lastVoteAt: lastVoteMap.get(s.id) || s.createdAt,
          }))
          .sort((a, b) => {
            if (b.voteCount !== a.voteCount) {
              return b.voteCount - a.voteCount;
            }
            // Tie-breaker: Whichever reached the vote count FIRST wins (earlier lastVoteAt)
            return a.lastVoteAt.getTime() - b.lastVoteAt.getTime();
          });

        for (let i = 0; i < ranked.length; i++) {
          await tx.submission.update({
            where: { id: ranked[i].id },
            data: {
              finalRank: i + 1,
              voteCount: ranked[i].voteCount,
            },
          });
        }
      } else if (event.eventType === 'vote_only') {
        const ranked = event.proposals
          .map((p) => ({
            id: p.id,
            voteCount: p._count.votes,
            lastVoteAt: lastVoteMap.get(p.id) || p.createdAt,
          }))
          .sort((a, b) => {
            if (b.voteCount !== a.voteCount) {
              return b.voteCount - a.voteCount;
            }
            return a.lastVoteAt.getTime() - b.lastVoteAt.getTime();
          });

        for (let i = 0; i < ranked.length; i++) {
          await tx.proposal.update({
            where: { id: ranked[i].id },
            data: {
              finalRank: i + 1,
              voteCount: ranked[i].voteCount,
            },
          });
        }
      }
    });
  }

  /**
   * Transition event to completed status with rankings
   */
  static async transitionToCompleted(eventId: string): Promise<Event> {
    // Compute rankings first
    await this.computeRankings(eventId);

    // Update status to completed
    const completedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.COMPLETED },
    });

    // Update trust scores for all voters (async, don't block completion)
    TrustService.updateTrustScores(eventId).catch((error) => {
      console.error('Failed to update trust scores:', error);
    });

    // Process event completion milestones (async, don't block completion)
    // This checks TOP_VOTES, TOP_3_CONTENT, and VOTES_RECEIVED milestones
    MilestoneService.processEventCompletion(eventId).catch((error) => {
      console.error('Failed to process event completion milestones:', error);
    });

    // Recalculate brand level after event completion (async, don't block completion)
    BrandXpService.recalculateBrandLevel(
      completedEvent.brandId,
      'event_completion',
      eventId
    ).catch((error) => {
      console.error('Failed to recalculate brand level:', error);
    });

    // Process USDC rewards (async, don't block completion)
    // Creates claim records for all eligible participants
    RewardsService.processEventRewards(eventId).catch((error) => {
      console.error(`🚨 REWARDS FAILED for event ${eventId}: ${error.message}`, error);
    });

    return completedEvent;
  }

  /**
   * Cancel an event with validation rules
   */
  static async cancelEvent(id: string, brandId: string): Promise<Event> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { submissions: true, votes: true },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.isDeleted) {
      throw new Error('Event not found');
    }

    // Ownership check
    if (event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this event');
    }

    // Cannot cancel completed events
    if (event.status === EventStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed event');
    }

    // Already cancelled
    if (event.status === EventStatus.CANCELLED) {
      throw new Error('Event is already cancelled');
    }

    // Cancellation rules by event type
    if (event.eventType === 'vote_only') {
      // Can cancel before voting ends, but not if votes exist
      if (event.status === EventStatus.VOTING && event._count.votes > 0) {
        throw new Error('Cannot cancel VOTE_ONLY event after votes have been cast');
      }
    } else {
      // POST_VOTE: can only cancel if no submissions
      if (event._count.submissions > 0) {
        throw new Error('Cannot cancel POST_VOTE event after submissions exist');
      }
    }

    // Update status to cancelled
    return prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
    });
  }

  /**
   * Stop a VOTE_ONLY event early (after 24hr minimum)
   */
  static async stopEventEarly(id: string, brandId: string): Promise<Event> {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.isDeleted) {
      throw new Error('Event not found');
    }

    // Ownership check
    if (event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this event');
    }

    // Only VOTE_ONLY events can be stopped early
    if (event.eventType !== 'vote_only') {
      throw new Error('Only VOTE_ONLY events can be stopped early');
    }

    // Must be in voting status
    if (event.status !== EventStatus.VOTING) {
      throw new Error('Event must be in voting status to stop early');
    }

    // Check minimum 24 hours have passed
    const votingDuration = Date.now() - event.startTime.getTime();
    const MIN_VOTING_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (votingDuration < MIN_VOTING_DURATION) {
      const hoursRemaining = Math.ceil((MIN_VOTING_DURATION - votingDuration) / (60 * 60 * 1000));
      throw new Error(
        `Event must run for at least 24 hours before stopping early. ${hoursRemaining} hours remaining.`
      );
    }

    // Transition to completed with rankings
    return this.transitionToCompleted(id);
  }

  /**
   * Automatically transition event based on timestamps
   * Idempotent - safe to run multiple times
   */
  static async autoTransitionEvent(eventId: string): Promise<Event | null> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event || event.isDeleted || event.status === EventStatus.CANCELLED) {
      return null;
    }

    // CRITICAL: Prevent auto-transition for unverified events
    if (event.blockchainStatus !== 'ACTIVE') {
      console.log(`⚠️ AutoTransition: Skipping ${eventId} - blockchainStatus is ${event.blockchainStatus}`);
      return null;
    }

    const now = new Date();
    let newStatus: EventStatusType | null = null;

    // State machine: check current status and determine transition
    if (event.status === EventStatus.SCHEDULED) {
      // POST_VOTE: transition to posting
      if (event.eventType === 'post_and_vote' && event.postingStart && now >= event.postingStart) {
        newStatus = EventStatus.POSTING;
      }
      // VOTE_ONLY: skip posting, go straight to voting
      else if (event.eventType === 'vote_only' && now >= event.startTime) {
        newStatus = EventStatus.VOTING;
      }
    } else if (event.status === EventStatus.POSTING) {
      // Posting ends
      if (event.postingEnd && now >= event.postingEnd) {
        // Check submission count for post_and_vote events
        if (event.eventType === 'post_and_vote') {
          const submissionCount = await prisma.submission.count({
            where: {
              eventId: eventId,
              status: 'active'
            }
          });

          // Cancel if 1 or fewer submissions
          if (submissionCount <= 1) {
            newStatus = EventStatus.CANCELLED;
          } else {
            newStatus = EventStatus.VOTING;
          }
        } else {
          newStatus = EventStatus.VOTING;
        }
      }
    } else if (event.status === EventStatus.VOTING) {
      // Voting ends, event completes
      if (now >= event.endTime) {
        const completedEvent = await this.transitionToCompleted(eventId);

        // Send event result notification (async)
        (async () => {
          try {
            // Notify participants
            await NotificationService.createEventResultNotification(eventId);

            // Notify brand owner about completion
            await NotificationService.createEventPhaseChangeNotification(
              eventId,
              EventStatus.VOTING,
              EventStatus.COMPLETED
            );
          } catch (error) {
            console.error('Failed to send event completion notifications:', error);
          }
        })();

        return completedEvent;
      }
    }

    // Perform transition if needed
    if (newStatus) {
      const updateData: any = { status: newStatus };

      // If cancelling due to lack of posts, handle refund and notifications
      if (newStatus === EventStatus.CANCELLED) {
        updateData.description = (event.description || "") + "\n\n[System]: Cancelled: Didn't get enough posts.";

        // Cancel event on blockchain to trigger refund (async but awaited for critical path)
        try {
          const { BlockchainService } = await import('../lib/blockchain.js');

          console.log(`🔄 AutoTransition: Cancelling event ${eventId} on-chain for refund...`);
          const txHash = await BlockchainService.cancelEventOnChain(eventId);
          console.log(`✅ AutoTransition: Event cancelled on-chain. TxHash: ${txHash}`);

          // Update pool status in database
          await RewardsService.cancelPool(eventId);

        } catch (error: any) {
          console.error(`❌ AutoTransition: Failed to cancel event on-chain:`, error);
          // Continue with DB update even if blockchain call fails
          // The brand can manually trigger refund later
        }

        // Update event status in DB
        const updatedEvent = await prisma.event.update({
          where: { id: eventId },
          data: updateData,
        });

        // Send cancellation notifications to brand owner and subscribers (async)
        (async () => {
          try {
            await NotificationService.createEventCancellationNotification(eventId, 'INSUFFICIENT_POSTS');
          } catch (error) {
            console.error('Failed to send cancellation notifications:', error);
          }
        })();

        return updatedEvent;
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: updateData,
      });

      // Send voting live notification when transitioning to VOTING (async)
      if (newStatus === EventStatus.VOTING) {
        (async () => {
          try {
            await NotificationService.createVotingLiveNotification(eventId);
          } catch (error) {
            console.error('Failed to send voting live notification:', error);
          }
        })();
      }

      // Send Brand Post notification if transitioning from SCHEDULED (Event is now live)
      if (event.status === EventStatus.SCHEDULED && (newStatus === EventStatus.POSTING || newStatus === EventStatus.VOTING)) {
        (async () => {
          try {
            await NotificationService.createBrandPostNotification(event.brandId, eventId);
          } catch (error) {
            console.error('Failed to send brand post notification on transition:', error);
          }
        })();
      }

      // Send Phase Change notification to brand owner
      (async () => {
        try {
          await NotificationService.createEventPhaseChangeNotification(eventId, event.status, newStatus!);
        } catch (error) {
          console.error('Failed to send phase change notification:', error);
        }
      })();

      return updatedEvent;
    }

    return null;
  }

  /**
   * Update blockchain status and create rewards pool
   */
  static async updateBlockchainStatus(
    eventId: string,
    brandId: string,
    txHash: string,
    onChainEventId: string
  ): Promise<Event> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) throw new Error('Event not found');
    if (event.brandId !== brandId) throw new Error('Forbidden');

    // Create Rewards Pool
    // Calculate values based on event data
    const maxParticipants = event.capacity || 0;
    const basePoolUsdc = (event.baseReward || 0) * maxParticipants;
    const topPoolUsdc = event.topReward || 0;
    // Match smart contract logic: leaderboard pool is 50% of top pool if not explicitly provided
    const leaderboardPoolUsdc = event.eventType === 'post_and_vote'
      ? ((event as any).leaderboardPool || (topPoolUsdc / 2))
      : 0;
    // Platform fee: $0.02 for post_and_vote, $0.015 for vote_only
    const platformFeeUsdc = maxParticipants * (event.eventType === 'post_and_vote' ? 0.02 : 0.015);
    // Creator base pool: $0.05 per vote for post_and_vote (capacity × $0.05)
    const creatorPoolUsdc = event.eventType === 'post_and_vote' ? maxParticipants * 0.05 : 0;

    // Use transaction to ensure event update and pool creation happen together
    return await prisma.$transaction(async (tx) => {
      // Create Rewards Pool
      await tx.eventRewardsPool.create({
        data: {
          eventId,
          maxParticipants,
          basePoolUsdc,
          topPoolUsdc,
          leaderboardPoolUsdc,
          platformFeeUsdc,
          creatorPoolUsdc,
          status: 'ACTIVE',
        },
      });

      // Update Event
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: {
          blockchainStatus: 'ACTIVE', // Or 'CONFIRMED'
          poolTxHash: txHash,
          onChainEventId: onChainEventId,
        },
      });

      // Trigger notifications if event is now live
      if (updatedEvent.status === EventStatus.POSTING || updatedEvent.status === EventStatus.VOTING) {
        // Send Brand Post Notification (since we skipped it at creation)
        (async () => {
          try {
            await NotificationService.createBrandPostNotification(brandId, eventId);
          } catch (error) {
            console.error('Failed to send brand post notification (blockchain confirmed):', error);
          }
        })();

        // If Voting is live, send that too
        if (updatedEvent.status === EventStatus.VOTING) {
          (async () => {
            try {
              await NotificationService.createVotingLiveNotification(eventId);
            } catch (error) {
              console.error('Failed to send voting live notification (blockchain confirmed):', error);
            }
          })();
        }
      }

      return updatedEvent;
    });
  }

  /**
   * Mark blockchain transaction as failed
   */
  static async failBlockchainStatus(
    eventId: string,
    brandId: string,
    reason?: string
  ): Promise<Event> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) throw new Error('Event not found');
    if (event.brandId !== brandId) throw new Error('Forbidden');

    return await prisma.event.update({
      where: { id: eventId },
      data: {
        blockchainStatus: 'FAILED',
        status: 'draft', // Set to draft so brand can edit/retry
      },
    });
  }
}
