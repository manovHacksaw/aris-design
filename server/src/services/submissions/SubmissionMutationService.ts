import logger from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { NotificationService } from '../notificationService.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors.js';
import { MilestoneCategory } from '@prisma/client';
import { CreateSubmissionRequest, UpdateSubmissionRequest } from '../../types/submission.js';
import { EventStatus } from '../../types/event.js';
import { XpService } from '../xpService.js';
import { enforceEventDemographics } from '../../utils/eventUtils.js';
import { SubmissionUtils } from './SubmissionUtils.js';

export class SubmissionMutationService {
  /**
   * Create a submission for an event
   */
  static async createSubmission(
    eventId: string,
    userId: string,
    data: CreateSubmissionRequest
  ) {
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

    if (!event || event.isDeleted) throw new NotFoundError('Event not found');

    if (event.eventType !== 'post_and_vote') {
      throw new ValidationError('Submissions are only allowed for POST_VOTE events');
    }
    if (event.status !== EventStatus.POSTING) {
      throw new ValidationError('Event is not accepting submissions. Event must be in POSTING phase.');
    }
    if (!event.allowSubmissions) {
      throw new ValidationError('Submissions are not allowed for this event');
    }
    if (event.brand.ownerId === userId) {
      throw new ForbiddenError('Brand owners cannot submit to their own events');
    }
    if (event.submissions.length > 0) {
      throw new ValidationError('You have already submitted to this event');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true, dateOfBirth: true, region: true },
    });
    if (!user) throw new NotFoundError('User not found');
    enforceEventDemographics(event as any, user as any);

    if (!data.imageCid && !data.imageUrl) {
      throw new ValidationError('An image is required (imageCid or imageUrl)');
    }
    if (data.imageCid) {
      SubmissionUtils.validateImageCid(data.imageCid);
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
      logger.error(error, 'Failed to send submission notification:');
      // Don't fail the submission if notification fails
    }

    // Check posts_created milestone (async, don't block submission)
    (async () => {
      try {
        const totalPosts = await prisma.submission.count({ where: { userId } });
        await XpService.checkAndClaimMilestones(userId, MilestoneCategory.POSTS_CREATED, totalPosts);
      } catch (error) {
        logger.error(error, 'Failed to check post milestones:');
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
  ) {
    // 1. Fetch submission with event
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { event: true },
    });

    if (!submission) throw new NotFoundError('Submission not found');
    if (submission.userId !== userId) throw new ForbiddenError('You do not own this submission');
    if (submission.event.status !== EventStatus.POSTING) {
      throw new ValidationError('Cannot edit submission after posting phase ends');
    }

    // 4. Validate imageCid if provided
    if (data.imageCid) {
      SubmissionUtils.validateImageCid(data.imageCid);
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
      throw new NotFoundError('Submission not found');
    }

    if (submission.userId !== userId) throw new ForbiddenError('You do not own this submission');
    if (submission.event.status !== EventStatus.POSTING) {
      throw new ValidationError('Cannot delete submission after posting phase ends');
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
}
