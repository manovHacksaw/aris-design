import { EventValidationService } from './EventValidationService.js';
import { EventQueryService } from './EventQueryService.js';
import { EventLifecycleService } from './EventLifecycleService.js';

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

export class EventRankingService {


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
}
