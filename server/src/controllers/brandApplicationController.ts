import logger from '../lib/logger';
import { Request, Response } from 'express';
import { BrandApplicationService } from '../services/brandApplicationService';
import { ApplicationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Submit brand application (No authentication required)
 */
export const submitApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      brandName,
      companyName,
      tagline,
      description,
      categories,
      logoCid,
      websiteUrl,
      contactEmail,
      contactPersonName,
      contactRole,
      phoneNumber,
      telegramHandle,
      socialLinks,
      gstNumber,
      panNumber,
      platformUsageReason,
      agreementAuthorized,
      agreementAccurate
    } = req.body;

    // Validate required fields
    if (!brandName || !contactEmail || !contactPersonName || !contactRole || !platformUsageReason) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
      return;
    }

    // Validate agreements
    if (!agreementAuthorized || !agreementAccurate) {
      res.status(400).json({
        success: false,
        error: 'You must agree to the terms and confirm authorization',
      });
      return;
    }

    // Create application
    const application = await prisma.brandApplication.create({
      data: {
        brandName,
        companyName,
        tagline,
        description,
        categories,
        logoCid,
        websiteUrl,
        contactEmail,
        contactPersonName,
        contactRole,
        phoneNumber,
        telegramHandle,
        socialLinks,
        gstNumber,
        panNumber,
        platformUsageReason,
        agreementAuthorized,
        agreementAccurate,
        status: ApplicationStatus.PENDING,
      },
    });

    res.status(201).json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully. You will receive an email once reviewed.',
      application: {
        id: application.id,
        brandName: application.brandName,
        contactEmail: application.contactEmail,
        status: application.status,
        submittedAt: application.submittedAt,
      },
    });
  } catch (error: any) {
    logger.error('Error submitting brand application:', error);

    // Handle known errors
    if (error.message.includes('already')) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      res.status(409).json({
        success: false,
        error: `A record with this ${field} already exists`,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit application. Please try again later.',
    });
  }
};

/**
 * Get application by ID
 */
export const getApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Application ID is required' });
      return;
    }

    const application = await BrandApplicationService.getApplicationById(id);

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    res.json(application);
  } catch (error) {
    logger.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
};

/**
 * Get all applications (with optional status filter)
 */
export const getApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit } = req.query;

    const validStatuses = Object.values(ApplicationStatus);
    let statusFilter: ApplicationStatus | undefined;

    if (status) {
      if (!validStatuses.includes(status as ApplicationStatus)) {
        res.status(400).json({
          error: `Invalid status. Valid values are: ${validStatuses.join(', ')}`,
        });
        return;
      }
      statusFilter = status as ApplicationStatus;
    }

    const limitNumber = limit ? parseInt(limit as string, 10) : 50;

    const applications = await BrandApplicationService.getApplications(statusFilter, limitNumber);

    res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    logger.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

/**
 * Approve application (Admin only)
 */
export const approveApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reviewedBy } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Application ID is required' });
      return;
    }

    if (!reviewedBy) {
      res.status(400).json({ error: 'Reviewer ID is required' });
      return;
    }

    const application = await BrandApplicationService.approveApplication(id, reviewedBy);

    res.json({
      success: true,
      message: 'Application approved successfully',
      application,
    });
  } catch (error: any) {
    logger.error('Error approving application:', error);

    if (error.message === 'Application not found') {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Cannot approve')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to approve application' });
  }
};

/**
 * Reject application (Admin only)
 */
export const rejectApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reviewedBy, reason } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Application ID is required' });
      return;
    }

    if (!reviewedBy) {
      res.status(400).json({ error: 'Reviewer ID is required' });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const application = await BrandApplicationService.rejectApplication(id, reviewedBy, reason);

    res.json({
      success: true,
      message: 'Application rejected',
      application,
    });
  } catch (error: any) {
    logger.error('Error rejecting application:', error);

    if (error.message === 'Application not found') {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Cannot reject') || error.message.includes('required')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to reject application' });
  }
};

/**
 * Get application by email (for checking status)
 */
export const getApplicationByEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const application = await BrandApplicationService.getApplicationByEmail(email);

    if (!application) {
      res.status(404).json({ error: 'No application found for this email' });
      return;
    }

    // Return limited info for privacy
    res.json({
      id: application.id,
      brandName: application.brandName,
      status: application.status,
      submittedAt: application.submittedAt,
      reviewedAt: application.reviewedAt,
      rejectionReason: application.rejectionReason,
    });
  } catch (error) {
    logger.error('Error fetching application by email:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
};
