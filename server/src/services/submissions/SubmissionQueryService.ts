import { prisma } from '../../lib/prisma';
import { EventStatus } from '../../types/event';
import { SubmissionWithDetails } from '../../types/submission';
import { SubmissionUtils } from './SubmissionUtils';

export class SubmissionQueryService {
  /**
   * Get all submissions for an event
   * Visibility Rules:
   * - POSTING: Users see only their own submission, brands see nothing
   * - VOTING/COMPLETED: Everyone sees all submissions
   */
  static async getSubmissionsByEvent(
    eventId: string,
    userId?: string
  ): Promise<SubmissionWithDetails[]> {
    // 1. Fetch event to check status and brand ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        brand: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.isDeleted) {
      throw new Error('Event not found');
    }

    // 2. Handle visibility based on event status
    if (event.status === EventStatus.POSTING) {
      // POSTING phase: Special visibility rules

      // Check if caller is the brand owner
      const isBrandOwner = userId && event.brand.ownerId === userId;

      if (isBrandOwner) {
        // Brand owners cannot see any submissions during POSTING
        return [];
      }

      if (!userId) {
        // Unauthenticated users cannot see submissions during POSTING
        return [];
      }

      // Regular users can only see their own submission during POSTING
      const submissions = await prisma.submission.findMany({
        where: {
          eventId,
          userId, // Filter to only user's own submission
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
        orderBy: { createdAt: 'asc' },
      }) as any;

      // Add indicator that this is the user's own submission
      // Vote counts are hidden during POSTING phase
      return submissions.map((s: any) => ({
        ...SubmissionUtils.addImageUrls(s),
        _count: s._count ? { ...s._count, votes: 0 } : s._count,
        isMySubmission: true,  // Flag to show "My Submission" in UI
        canEdit: true,         // User can edit during POSTING phase
        canDelete: true,       // User can delete during POSTING phase
      }));
    }

    // 3. VOTING and COMPLETED: All submissions visible to everyone
    if (![EventStatus.VOTING, EventStatus.COMPLETED].includes(event.status as any)) {
      throw new Error('Submissions are not yet visible');
    }

    // 4. Fetch all submissions with user details
    const submissions = await prisma.submission.findMany({
      where: { eventId },
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
        ? { finalRank: 'asc' } // Show ranked order in completed events
        : { createdAt: 'asc' }, // Show chronological order during voting
    }) as any;

    // Mark user's own submission and add permission flags
    // Vote counts are only revealed after the event is completed
    const hideVotes = event.status !== EventStatus.COMPLETED;
    return submissions.map((s: any) => ({
      ...SubmissionUtils.addImageUrls(s),
      _count: hideVotes && s._count ? { ...s._count, votes: 0 } : s._count,
      isMySubmission: userId ? s.userId === userId : false,
      canEdit: false,   // Cannot edit during VOTING/COMPLETED
      canDelete: false, // Cannot delete during VOTING/COMPLETED
    }));
  }

  /**
   * Get user's submission for an event
   */
  static async getUserSubmission(
    eventId: string,
    userId: string
  ): Promise<any | null> {
    const submission = await prisma.submission.findFirst({
      where: { eventId, userId },
    });

    return submission ? SubmissionUtils.addImageUrls(submission) : null;
  }

  /**
   * Get a single submission by ID
   */
  static async getSubmissionById(submissionId: string): Promise<SubmissionWithDetails | null> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
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
    }) as any;

    return submission ? SubmissionUtils.addImageUrls(submission) : null;
  }

  /**
   * Get submissions by user for public profiles
   */
  static async getSubmissionsByUser(userId: string, requestingUserId?: string): Promise<any[]> {
    const isOwner = requestingUserId === userId;

    const submissions = await prisma.submission.findMany({
      where: {
        userId,
        status: 'active',
        event: {
          isDeleted: false,
          ...(!isOwner && {
            status: { in: [EventStatus.VOTING, EventStatus.COMPLETED] }
          }),
        }
      },
      include: {
        event: {
          include: {
            brand: {
              select: {
                id: true,
                name: true,
                logoCid: true,
                isVerified: true
              }
            },
            eventAnalytics: {
              select: {
                totalSubmissions: true,
                totalVotes: true
              }
            }
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch reward claims for these submissions separately to calculate earnings
    const submissionIds = submissions.map(s => s.id);
    const rewardClaims = await prisma.rewardClaim.findMany({
      where: {
        userId,
        claimType: { in: ['CREATOR', 'LEADERBOARD'] as any },
        pool: {
          event: {
            submissions: {
              some: { id: { in: submissionIds } }
            }
          }
        }
      },
      select: {
        finalAmount: true,
        pool: {
          select: { eventId: true }
        }
      }
    });

    // Map claims to events
    const earningsByEvent = rewardClaims.reduce((acc: any, claim: any) => {
      const eventId = claim.pool.eventId;
      acc[eventId] = (acc[eventId] || 0) + (claim.finalAmount || 0);
      return acc;
    }, {});

    return submissions.map((s: any) => {
      const isCompleted = s.event?.status === EventStatus.COMPLETED;
      const earnings = earningsByEvent[s.eventId] || 0;

      return {
        ...SubmissionUtils.addImageUrls(s),
        earnings,
        _count: !isCompleted && s._count ? { ...s._count, votes: 0 } : s._count,
        event: s.event ? {
          ...s.event,
          eventAnalytics: s.event.eventAnalytics && !isCompleted
            ? { ...s.event.eventAnalytics, totalVotes: 0 }
            : s.event.eventAnalytics,
        } : s.event,
      };
    });
  }
}
