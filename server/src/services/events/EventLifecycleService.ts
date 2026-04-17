import { EventValidationService } from './EventValidationService.js';import { RewardsPoolService } from '../rewards/RewardsPoolService.js';
import { RewardsDistributionService } from '../rewards/RewardsDistributionService.js';

import { EventQueryService } from './EventQueryService.js';

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
import { NotificationService } from '../notificationService.js';
import { getIPFSUrl } from '../ipfsService.js';
import { MilestoneService } from '../milestoneService.js';
import { BrandXpService } from '../brandXpService.js';

import { TrustService } from '../trustService.js';

export class EventLifecycleService {


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

    if (!event || (event as any).isDeleted) throw new NotFoundError('Event not found');

    if (event.brandId !== brandId) throw new ForbiddenError('You do not own this event');

    // 3. Validate transition
    if (!EventValidationService.isValidStatusTransition(event.status, newStatus)) {
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

    if (!event || (event as any).isDeleted) throw new NotFoundError('Event not found');

    if (event.brandId !== brandId) throw new ForbiddenError('You do not own this event');

    // 3. Can only publish DRAFT events
    if (event.status !== EventStatus.DRAFT) {
      throw new ValidationError('Only DRAFT events can be published');
    }

    // 4. Validate event is complete before publishing
    if (!event.title || !event.eventType || !event.startTime || !event.endTime) {
      throw new ValidationError('Event must have title, type, start time, and end time before publishing');
    }

    // 5. For post_and_vote events, require posting times, leaderboard pool, and samples
    if (event.eventType === 'post_and_vote') {
      if (!event.postingStart || !event.postingEnd) {
        throw new ValidationError('Post and vote events must have posting start and end times before publishing');
      }
      if (event.leaderboardPool === null || event.leaderboardPool === undefined) {
        throw new ValidationError('Post and vote events must have a leaderboard pool before publishing');
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


  /**
   * Transition event to completed status with rankings
   */
  static async transitionToCompleted(eventId: string): Promise<Event> {
    // Compute rankings first
    await EventRankingService.computeRankings(eventId);

    // Update status to completed
    const completedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.COMPLETED },
    });

    // Update trust scores for all voters (async, don't block completion)
    TrustService.updateTrustScores(eventId).catch((error) => {
      logger.error('Failed to update trust scores:', error);
    });

    // Process event completion milestones (async, don't block completion)
    // This checks TOP_VOTES, TOP_3_CONTENT, and VOTES_RECEIVED milestones
    MilestoneService.processEventCompletion(eventId).catch((error) => {
      logger.error('Failed to process event completion milestones:', error);
    });

    // Recalculate brand level after event completion (async, don't block completion)
    BrandXpService.recalculateBrandLevel(
      completedEvent.brandId,
      'event_completion',
      eventId
    ).catch((error) => {
      logger.error('Failed to recalculate brand level:', error);
    });

    // Process USDC rewards (async, don't block completion)
    // Creates claim records for all eligible participants
    RewardsDistributionService.processEventRewards(eventId).catch((error) => {
      logger.error(`🚨 REWARDS FAILED for event ${eventId}: ${error.message}`, error);
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
    return EventLifecycleService.transitionToCompleted(id);
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
      logger.info(`⚠️ AutoTransition: Skipping ${eventId} - blockchainStatus is ${event.blockchainStatus}`);
      return null;
    }

    // Idempotency guard: only transition if the event is still in a transitionable state.
    // Prevents double-firing when multiple server instances run the interval simultaneously.
    const transitionableStatuses = [EventStatus.SCHEDULED, EventStatus.POSTING, EventStatus.VOTING];
    if (!transitionableStatuses.includes(event.status as EventStatusType)) {
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
        const completedEvent = await EventLifecycleService.transitionToCompleted(eventId);

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
            logger.error('Failed to send event completion notifications:', error);
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
          const { BlockchainService } = await import('../../lib/blockchain.js');

          logger.info(`🔄 AutoTransition: Cancelling event ${eventId} on-chain for refund...`);
          const txHash = await BlockchainService.cancelEventOnChain(eventId);
          logger.info(`✅ AutoTransition: Event cancelled on-chain. TxHash: ${txHash}`);

          // Update pool status in database
          await RewardsPoolService.cancelPool(eventId);

        } catch (error: any) {
          logger.error(`❌ AutoTransition: Failed to cancel event on-chain:`, error);
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
            logger.error('Failed to send cancellation notifications:', error);
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
            logger.error('Failed to send voting live notification:', error);
          }
        })();
      }

      // Send Brand Post notification if transitioning from SCHEDULED (Event is now live)
      if (event.status === EventStatus.SCHEDULED && (newStatus === EventStatus.POSTING || newStatus === EventStatus.VOTING)) {
        (async () => {
          try {
            await NotificationService.createBrandPostNotification(event.brandId, eventId);
          } catch (error) {
            logger.error('Failed to send brand post notification on transition:', error);
          }
        })();
      }

      // Send Phase Change notification to brand owner
      (async () => {
        try {
          await NotificationService.createEventPhaseChangeNotification(eventId, event.status, newStatus!);
        } catch (error) {
          logger.error('Failed to send phase change notification:', error);
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
            logger.error('Failed to send brand post notification (blockchain confirmed):', error);
          }
        })();

        // If Voting is live, send that too
        if (updatedEvent.status === EventStatus.VOTING) {
          (async () => {
            try {
              await NotificationService.createVotingLiveNotification(eventId);
            } catch (error) {
              logger.error('Failed to send voting live notification (blockchain confirmed):', error);
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
