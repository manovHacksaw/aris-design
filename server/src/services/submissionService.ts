import { prisma } from '../lib/prisma.js';
import { NotificationService } from './notificationService.js';
import { Submission, MilestoneCategory } from '@prisma/client';
import {
  CreateSubmissionRequest,
  UpdateSubmissionRequest,
  SubmissionWithDetails,
} from '../types/submission.js';
import { EventStatus } from '../types/event.js';
import { getIPFSUrl } from './ipfsService.js';
import { XpService } from './xpService.js';

// ---------------------------------------------------------------------------
// Demographic eligibility helpers
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

/**
 * Throws if the user does not meet the event's demographic requirements.
 * event.preferredGender: "All" | "M" | "F"
 * event.ageGroup:        "All Ages" | "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+"
 * event.regions:         [] (all) | ["north","south","east","west"] subsets
 */
function enforceEventDemographics(
  event: { preferredGender: string | null; ageGroup: string | null; regions: string[] },
  user: { gender: string | null; dateOfBirth: Date | null; region: string | null }
): void {
  // --- Gender ---
  const genderFilter = (event.preferredGender ?? 'All').trim();
  if (genderFilter !== 'All') {
    const userGender = (user.gender ?? '').trim().toUpperCase();
    if (userGender !== genderFilter.toUpperCase()) {
      throw new Error('You do not meet the gender requirement for this event');
    }
  }

  // --- Age ---
  const ageFilter = (event.ageGroup ?? 'All Ages').trim();
  if (ageFilter !== 'All Ages') {
    // Map range label from event (e.g. "18-24") to our computed bucket
    const ageGroupLabel = getAgeGroupLabel(user.dateOfBirth);
    if (ageGroupLabel === 'unknown') {
      throw new Error('Your date of birth is required to participate in this event');
    }
    // Normalise: event stores "18-24", bucket is "18_24"
    const normalisedFilter = ageFilter.replace('-', '_').replace('+', '_plus');
    if (ageGroupLabel !== normalisedFilter) {
      throw new Error('You do not meet the age requirement for this event');
    }
  }

  // --- Region check disabled ---
}

// ---------------------------------------------------------------------------

export class SubmissionService {
  /**
   * Validate IPFS CID format
   */
  private static validateImageCid(imageCid: string): void {
    if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(imageCid)) {
      throw new Error('Invalid IPFS CID format');
    }
  }

  /**
   * Transform submission with optimized IPFS image URLs
   */
  private static addImageUrls(submission: any): any {
    if (!submission) return submission;

    const transformed = { ...submission };

    // Prefer Cloudinary imageUrl; fall back to IPFS CID
    if (submission.imageUrl) {
      transformed.imageUrls = {
        thumbnail: submission.imageUrl,
        medium: submission.imageUrl,
        large: submission.imageUrl,
        full: submission.imageUrl,
      };
    } else if (submission.imageCid) {
      transformed.imageUrls = {
        thumbnail: getIPFSUrl(submission.imageCid, 'thumbnail'),
        medium: getIPFSUrl(submission.imageCid, 'medium'),
        large: getIPFSUrl(submission.imageCid, 'large'),
        full: getIPFSUrl(submission.imageCid, 'full'),
      };
    }

    // Add user avatar URL if user is included
    if (submission.user?.avatarUrl) {
      transformed.user = {
        ...submission.user,
        avatarUrlFull: submission.user.avatarUrl,
      };
    }

    return transformed;
  }

  /**
   * Create a submission for an event
   */
  static async createSubmission(
    eventId: string,
    userId: string,
    data: CreateSubmissionRequest
  ): Promise<Submission> {
    // 1. Fetch event with brand and existing submissions
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        brand: true,
        submissions: {
          where: { userId },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.isDeleted) {
      throw new Error('Event not found');
    }

    // 2. Only POST_VOTE events allow submissions
    if (event.eventType !== 'post_and_vote') {
      throw new Error('Submissions are only allowed for POST_VOTE events');
    }

    // 3. Must be in POSTING status
    if (event.status !== EventStatus.POSTING) {
      throw new Error('Event is not accepting submissions. Event must be in POSTING phase.');
    }

    // 4. Check if submissions are allowed
    if (!event.allowSubmissions) {
      throw new Error('Submissions are not allowed for this event');
    }

    // 5. Brand owners cannot submit to their own events
    if (event.brand.ownerId === userId) {
      throw new Error('Brand owners cannot submit to their own events');
    }

    // 6. One submission per user per event
    if (event.submissions.length > 0) {
      throw new Error('You have already submitted to this event');
    }

    // 7. Demographic eligibility check
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true, dateOfBirth: true, region: true },
    });
    if (!user) throw new Error('User not found');
    enforceEventDemographics(event, user);

    // 8. Require either imageCid or imageUrl
    if (!data.imageCid && !data.imageUrl) {
      throw new Error('An image is required (imageCid or imageUrl)');
    }
    if (data.imageCid) {
      this.validateImageCid(data.imageCid);
    }

    // 9. Create submission, update analytics and create stats in transaction
    const submission = await prisma.$transaction(async (tx) => {
      const submission = await tx.submission.create({
        data: {
          eventId,
          userId,
          imageCid: data.imageCid || null,
          imageUrl: data.imageUrl || null,
          caption: data.caption || null,
          status: 'active',
        },
      });

      // Increment user's totalSubmissions counter
      await tx.user.update({
        where: { id: userId },
        data: { totalSubmissions: { increment: 1 } }
      });

      // Update Event Analytics
      await tx.eventAnalytics.update({
        where: { eventId },
        data: {
          totalSubmissions: { increment: 1 },
        },
      });

      // Create Submission Stats
      await tx.submissionStats.create({
        data: {
          submissionId: submission.id,
          votes: 0,
          clicks: 0,
          viewTime: 0,
        },
      });

      return submission;
    }, {
      maxWait: 20000,
      timeout: 30000,
    });

    // Send anonymous submission notification to brand owner
    try {
      await NotificationService.createEventSubmissionNotification(eventId);
    } catch (error) {
      console.error('Failed to send submission notification:', error);
      // Don't fail the submission if notification fails
    }

    // Check posts_created milestone (async, don't block submission)
    (async () => {
      try {
        const totalPosts = await prisma.submission.count({ where: { userId } });
        await XpService.checkAndClaimMilestones(userId, MilestoneCategory.POSTS_CREATED, totalPosts);
      } catch (error) {
        console.error('Failed to check post milestones:', error);
      }
    })();

    return submission;
  }

  /**
   * Update a submission
   */
  static async updateSubmission(
    submissionId: string,
    userId: string,
    data: UpdateSubmissionRequest
  ): Promise<Submission> {
    // 1. Fetch submission with event
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { event: true },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // 2. Ownership check
    if (submission.userId !== userId) {
      throw new Error('Forbidden: You do not own this submission');
    }

    // 3. Can only edit during POSTING phase
    if (submission.event.status !== EventStatus.POSTING) {
      throw new Error('Cannot edit submission after posting phase ends');
    }

    // 4. Validate imageCid if provided
    if (data.imageCid) {
      this.validateImageCid(data.imageCid);
    }

    // 5. Update submission
    const updateData: any = {};
    if (data.imageCid !== undefined) {
      updateData.imageCid = data.imageCid;
    }
    if (data.imageUrl !== undefined) {
      updateData.imageUrl = data.imageUrl;
    }
    if (data.caption !== undefined) {
      updateData.caption = data.caption;
    }

    return prisma.submission.update({
      where: { id: submissionId },
      data: updateData,
    });
  }

  /**
   * Delete a submission
   */
  static async deleteSubmission(submissionId: string, userId: string): Promise<void> {
    // 1. Fetch submission with event
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { event: true },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // 2. Ownership check
    if (submission.userId !== userId) {
      throw new Error('Forbidden: You do not own this submission');
    }

    // 3. Can only delete during POSTING phase
    if (submission.event.status !== EventStatus.POSTING) {
      throw new Error('Cannot delete submission after posting phase ends');
    }

    // 4. Delete submission and update analytics in transaction
    await prisma.$transaction(async (tx) => {
      await tx.submission.delete({ where: { id: submissionId } });

      // Update Event Analytics
      await tx.eventAnalytics.update({
        where: { eventId: submission.eventId },
        data: {
          totalSubmissions: { decrement: 1 },
        },
      });
    });
  }

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
        ...this.addImageUrls(s),
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
      ...this.addImageUrls(s),
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
  ): Promise<Submission | null> {
    const submission = await prisma.submission.findFirst({
      where: { eventId, userId },
    });

    return submission ? this.addImageUrls(submission) : null;
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

    return submission ? this.addImageUrls(submission) : null;
  }

  static async getSubmissionsByUser(userId: string): Promise<any[]> {
    const submissions = await prisma.submission.findMany({
      where: {
        userId,
        status: 'active',
        event: {
          isDeleted: false
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
        ...this.addImageUrls(s),
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
