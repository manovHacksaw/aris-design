import { prisma } from '../lib/prisma.js';
import { NotificationService } from './notificationService.js';
import { Vote, MilestoneCategory } from '@prisma/client';
import {
    VoteForProposalsRequest,
    VoteForSubmissionRequest,
    VoteWithDetails,
} from '../types/vote.js';
import { EventStatus } from '../types/event.js';
import { XpService } from './xpService.js';
import { EventService } from './eventService.js';

// ---------------------------------------------------------------------------
// Demographic eligibility helpers (duplicated from submissionService for isolation)
// ---------------------------------------------------------------------------

function getAgeGroupLabel(dateOfBirth: Date | null): string {
  if (!dateOfBirth) return 'unknown';
  const age = Math.floor((Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 18) return 'under_18';
  if (age <= 24) return '18_24';
  if (age <= 34) return '25_34';
  if (age <= 44) return '35_44';
  if (age <= 54) return '45_54';
  if (age <= 64) return '55_64';
  return '65_plus';
}

function enforceEventDemographics(
  event: { 
    preferredGender: string | null; 
    ageGroup: string | null; 
    regions: string[];
    ageRestriction: number | null;
    genderRestriction: string | null;
  },
  user: { gender: string | null; dateOfBirth: Date | null; region: string | null }
): void {
  // --- New Hard Gender Filter ---
  if (event.genderRestriction) {
    const userGender = (user.gender ?? '').trim().toUpperCase();
    if (userGender !== event.genderRestriction.toUpperCase()) {
      throw new Error(`This event is restricted to ${event.genderRestriction.toLowerCase()} participants only`);
    }
  }

  // --- New Hard Age Filter ---
  if (event.ageRestriction) {
    if (!user.dateOfBirth) {
      throw new Error('Your date of birth is required to participate in this event');
    }
    const age = (Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < event.ageRestriction) {
      throw new Error(`You must be at least ${event.ageRestriction} years old to participate in this event`);
    }
  }

  // --- Legacy Gender (Soft/Preferred) ---
  const genderFilter = (event.preferredGender ?? 'All').trim();
  if (genderFilter !== 'All' && !event.genderRestriction) {
    const userGender = (user.gender ?? '').trim().toUpperCase();
    if (userGender !== genderFilter.toUpperCase()) {
      throw new Error('You do not meet the gender requirement for this event');
    }
  }

  // --- Legacy Age (Soft/Preferred) ---
  const ageFilter = (event.ageGroup ?? 'All Ages').trim();
  if (ageFilter !== 'All Ages' && !event.ageRestriction) {
    const ageGroupLabel = getAgeGroupLabel(user.dateOfBirth);
    if (ageGroupLabel === 'unknown') {
      throw new Error('Your date of birth is required to participate in this event');
    }
    const normalisedFilter = ageFilter.replace('-', '_').replace('+', '_plus');
    if (ageGroupLabel !== normalisedFilter) {
      throw new Error('You do not meet the age requirement for this event');
    }
  }

  // --- Region ---
  if (event.regions && event.regions.length > 0) {
    const userRegion = (user.region ?? '').trim().toLowerCase();
    if (!userRegion) {
      throw new Error('Your region is required to participate in this event');
    }
    const allowed = event.regions.map((r) => r.trim().toLowerCase());
    if (!allowed.includes(userRegion)) {
      throw new Error('You do not meet the region requirement for this event');
    }
  }
}

// ---------------------------------------------------------------------------

export class VoteService {
    /**
     * Vote for a submission (POST_VOTE events)
     */
    static async voteForSubmission(
        eventId: string,
        userId: string,
        data: VoteForSubmissionRequest
    ): Promise<Vote> {
        const { submissionId } = data;

        // 1. Fetch event and submission
        const [event, submission] = await prisma.$transaction([
            prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    eventAnalytics: true,
                    brand: {
                        select: {
                            ownerId: true,
                        },
                    },
                },
            }),
            prisma.submission.findUnique({
                where: { id: submissionId },
            }),
        ]);

        if (!event || event.isDeleted) {
            throw new Error('Event not found');
        }

        if (!submission) {
            throw new Error('Submission not found');
        }

        if (submission.eventId !== eventId) {
            throw new Error('Submission does not belong to this event');
        }

        // 2. Business Rule: Only POST_VOTE events allow submission voting
        if (event.eventType !== 'post_and_vote') {
            throw new Error('This event type does not allow submission voting');
        }

        // 3. Business Rule: Must be in VOTING status and within voting window
        if (event.status !== EventStatus.VOTING && event.status !== EventStatus.COMPLETED) {
            // allow the completed check below to give a better error
        }
        if (event.status === EventStatus.COMPLETED || new Date() > new Date(event.endTime)) {
            throw new Error('Voting has ended for this event');
        }
        if (event.status !== EventStatus.VOTING) {
            throw new Error(`Voting is only allowed during the VOTING phase (Current: ${event.status})`);
        }

        // 4. Business Rule: Event must allow voting
        if (!event.allowVoting) {
            throw new Error('Voting is currently disabled for this event');
        }

        // 5. Business Rule: Brand owners cannot vote in their own events
        if (event.brand.ownerId === userId) {
            throw new Error('Brand owners cannot vote in their own events');
        }

        // 6. Business Rule: Users cannot vote for their own submission
        if (submission.userId === userId) {
            throw new Error('You cannot vote for your own submission');
        }

        // 7. Demographic eligibility check
        const voter = await prisma.user.findUnique({
            where: { id: userId },
            select: { gender: true, dateOfBirth: true, region: true },
        });
        if (!voter) throw new Error('User not found');
        enforceEventDemographics(event, voter);

        // 8. Create vote and update analytics/stats in transaction
        const { vote, shouldClose } = await prisma.$transaction(async (tx) => {
            // Lock event row by updating its updatedAt timestamp to serialize votes
            await tx.event.update({ where: { id: eventId }, data: { updatedAt: new Date() }, select: { id: true } });

            // 7. Atomic check: enforce single vote per user per event
            const userVoteCount = await tx.vote.count({
                where: { eventId, userId },
            });
            if (userVoteCount >= 1) {
                throw new Error('You have already voted in this event. Enforced single vote limit.');
            }

            // Atomic capacity check
            if (event.capacity) {
                const uniqueVoters = await tx.vote.count({ where: { eventId } });
                if (uniqueVoters >= event.capacity) {
                    throw new Error('Event has reached its voting capacity');
                }
            }

            // Check for existing vote (idempotency/prevention)
            const existingVote = await tx.vote.findUnique({
                where: {
                    unique_submission_vote: {
                        eventId,
                        submissionId,
                        userId,
                    },
                },
            });

            if (existingVote) {
                throw new Error('You have already voted for this submission');
            }

            // Create the vote
            const vote = await tx.vote.create({
                data: {
                    eventId,
                    submissionId,
                    userId,
                },
            });

            // Increment user's totalVotes counter
            await tx.user.update({
                where: { id: userId },
                data: { totalVotes: { increment: 1 } }
            });

            // Update Event Analytics
            // Update Event Analytics (upsert to handle missing records)
            await tx.eventAnalytics.upsert({
                where: { eventId },
                create: {
                    eventId,
                    totalViews: 0,
                    totalSubmissions: 0,
                    totalVotes: 1,
                    uniqueParticipants: 0,
                },
                update: {
                    totalVotes: { increment: 1 },
                },
            });

            // Update Submission Stats (denormalized count)
            await tx.submission.update({
                where: { id: submissionId },
                data: {
                    voteCount: { increment: 1 },
                },
            });

            // Update SubmissionStats model if it exists
            await tx.submissionStats.upsert({
                where: { submissionId },
                create: {
                    submissionId,
                    votes: 1,
                },
                update: {
                    votes: { increment: 1 },
                },
            });

            let shouldClose = false;
            // Check if capacity reached (don't update status here - let completeEvent handle it)
            if (event.capacity) {
                const currentVoters = await tx.vote.count({
                    where: { eventId }
                });
                console.log(`DEBUG: Auto-close check. currentVoters=${currentVoters}, capacity=${event.capacity}, shouldClose=${currentVoters >= event.capacity}`);

                if (currentVoters >= event.capacity) {
                    shouldClose = true;
                }
            }

            return { vote, shouldClose };
        }, {
            maxWait: 20000, // 20s to get a connection
            timeout: 30000, // 30s for the transaction
        });

        // Send anonymous vote notification to brand owner and submission owner
        try {
            await NotificationService.createEventVoteNotification(eventId);
            await NotificationService.createSubmissionVoteNotification(submissionId, userId);
        } catch (error) {
            console.error('Failed to send vote notifications:', error);
            // Don't fail the vote if notification fails
        }

        // Check votes_cast milestone (async, don't block vote)
        (async () => {
            try {
                const totalVotes = await prisma.vote.count({ where: { userId } });
                await XpService.checkAndClaimMilestones(userId, MilestoneCategory.VOTES_CAST, totalVotes);
            } catch (error) {
                console.error('Failed to check vote milestones:', error);
            }
        })();

        // Trigger event completion logic if auto-closed (handles rewards and rankings)
        if (shouldClose) {
            console.log(`🎯 Capacity reached for event ${eventId}. Triggering auto-completion...`);
            EventService.transitionToCompleted(eventId).catch(err =>
                console.error(`❌ Failed to process auto-completion for event ${eventId}:`, err)
            );
        }

        return vote;
    }

    /**
     * Vote for proposals (VOTE_ONLY events)
     * Supports batch voting
     */
    static async voteForProposals(
        eventId: string,
        userId: string,
        data: VoteForProposalsRequest
    ): Promise<Vote[]> {
        const { proposalIds } = data;

        if (!proposalIds || proposalIds.length === 0) {
            throw new Error('At least one proposal ID is required');
        }

        // 1. Fetch event
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                proposals: {
                    where: {
                        id: { in: proposalIds },
                    },
                },
                brand: {
                    select: {
                        ownerId: true,
                    },
                },
            },
        });

        if (!event || event.isDeleted) {
            throw new Error('Event not found');
        }

        // 2. Business Rule: Only VOTE_ONLY events allow proposal voting
        if (event.eventType !== 'vote_only') {
            throw new Error('This event type does not allow proposal voting');
        }

        // 3. Business Rule: Must be in VOTING status
        const status = event.status?.toString().toUpperCase();
        if (status !== 'VOTING') {
            throw new Error(`Voting is only allowed during the VOTING phase (Current: ${status})`);
        }

        // 4. Business Rule: Event must allow voting
        if (!event.allowVoting) {
            throw new Error('Voting is currently disabled for this event');
        }

        // 5. Business Rule: Brand owners cannot vote in their own events
        if (event.brand.ownerId === userId) {
            throw new Error('Brand owners cannot vote in their own events');
        }

        // 6. Validate all proposal IDs belong to this event
        if (event.proposals.length !== proposalIds.length) {
            throw new Error('One or more proposal IDs are invalid or do not belong to this event');
        }

        // 7. Business Rule: Enforce single vote per user
        // Users can vote for only 1 proposal
        if (proposalIds.length > 1) {
            throw new Error('You can only vote for 1 proposal.');
        }

        // 8. Demographic eligibility check
        const voter = await prisma.user.findUnique({
            where: { id: userId },
            select: { gender: true, dateOfBirth: true, region: true },
        });
        if (!voter) throw new Error('User not found');
        enforceEventDemographics(event, voter);

        // 9. Create votes in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Lock event row by updating its updatedAt timestamp to serialize votes
            await tx.event.update({ where: { id: eventId }, data: { updatedAt: new Date() }, select: { id: true } });

            const createdVotes: Vote[] = [];
            let shouldClose = false;

            // 8. Atomic: enforce single vote per user per event
            const existingVoteCount = await tx.vote.count({ where: { eventId, userId } });
            if (existingVoteCount > 0) {
                throw new Error('You have already voted in this event. Voting is only allowed once per event.');
            }

            // Atomic capacity check
            if (event.capacity) {
                const uniqueVoters = await tx.vote.count({ where: { eventId } });
                if (uniqueVoters >= event.capacity) {
                    throw new Error('Event has reached its voting capacity');
                }
            }

            for (const proposalId of proposalIds) {
                // Check for existing vote
                const existingVote = await tx.vote.findUnique({
                    where: {
                        unique_proposal_vote: {
                            eventId,
                            proposalId,
                            userId,
                        },
                    },
                });

                if (existingVote) {
                    // Skip if already voted (or could throw error depending on desired UX)
                    continue;
                }

                const vote = await tx.vote.create({
                    data: {
                        eventId,
                        proposalId,
                        userId,
                    },
                });

                // Increment user's totalVotes counter
                await tx.user.update({
                    where: { id: userId },
                    data: { totalVotes: { increment: 1 } }
                });

                // Update Proposal vote count (denormalized)
                await tx.proposal.update({
                    where: { id: proposalId },
                    data: {
                        voteCount: { increment: 1 },
                    },
                });

                createdVotes.push(vote);
            }

            // Update Event Analytics if any votes were cast
            if (createdVotes.length > 0) {
                await tx.eventAnalytics.upsert({
                    where: { eventId },
                    create: {
                        eventId,
                        totalViews: 0,
                        totalSubmissions: 0,
                        totalVotes: createdVotes.length,
                        uniqueParticipants: 0,
                    },
                    update: {
                        totalVotes: { increment: createdVotes.length },
                    },
                });


                // Auto-close event if capacity reached
                if (event.capacity) {
                    const currentVoters = await tx.vote.count({
                        where: { eventId }
                    });

                    if (currentVoters >= event.capacity) {
                        shouldClose = true;
                    }
                }
            }

            return { createdVotes, shouldClose };
        }, {
            maxWait: 20000,
            timeout: 30000,
        });

        // Trigger event completion logic if auto-closed
        if (result.shouldClose) {
            EventService.transitionToCompleted(eventId).catch(err =>
                console.error(`Failed to process auto-completion for event ${eventId}:`, err)
            );
        }

        const createdVotes = result.createdVotes;

        // Send anonymous vote notification to brand owner (if any votes executed)
        if (createdVotes.length > 0) {
            try {
                await NotificationService.createEventVoteNotification(eventId);
            } catch (error) {
                console.error('Failed to send vote notification:', error);
                // Don't fail the vote if notification fails
            }

            // Check votes_cast milestone (async, don't block vote)
            (async () => {
                try {
                    const totalVotes = await prisma.vote.count({ where: { userId } });
                    await XpService.checkAndClaimMilestones(userId, MilestoneCategory.VOTES_CAST, totalVotes);
                } catch (error) {
                    console.error('Failed to check vote milestones:', error);
                }
            })();
        }

        return createdVotes;
    }

    /**
     * Get user's votes for an event
     */
    static async getUserVotesForEvent(
        eventId: string,
        userId: string
    ): Promise<VoteWithDetails[]> {
        return prisma.vote.findMany({
            where: {
                eventId,
                userId,
            },
            include: {
                proposal: {
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        content: true,
                        imageCid: true,
                    },
                },
                submission: {
                    select: {
                        id: true,
                        imageCid: true,
                        caption: true,
                        userId: true,
                    },
                },
            },
        }) as any;
    }

    /**
     * Check if user has voted for a specific submission
     */
    static async hasVotedForSubmission(
        submissionId: string,
        userId: string
    ): Promise<boolean> {
        const vote = await prisma.vote.findFirst({
            where: {
                submissionId,
                userId,
            },
        });
        return !!vote;
    }

    /**
     * Check if user has voted for a specific proposal
     */
    static async hasVotedForProposal(
        proposalId: string,
        userId: string
    ): Promise<boolean> {
        const vote = await prisma.vote.findFirst({
            where: {
                proposalId,
                userId,
            },
        });
        return !!vote;
    }

    /**
     * Check if user has voted in an event (any vote in the event)
     */
    static async hasVotedInEvent(
        eventId: string,
        userId: string
    ): Promise<boolean> {
        const vote = await prisma.vote.findFirst({
            where: {
                eventId,
                userId,
            },
        });
        return !!vote;
    }
}
