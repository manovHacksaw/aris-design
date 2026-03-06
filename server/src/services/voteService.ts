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

        // 3. Business Rule: Must be in VOTING status
        console.log(`DEBUG: event.status=${event.status}, expected=${EventStatus.VOTING}, match=${event.status === EventStatus.VOTING}`);
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
