import logger from '../lib/logger';
import { Request, Response } from 'express';
import { BrandClaimService } from '../services/brandClaimService';

/**
 * Generate email template for admin to copy-paste
 */
function generateEmailTemplate(brandName: string, claimUrl: string, _brandOwnerEmail: string): string {
  return `Subject: Your Brand "${brandName}" Has Been Approved - Activate Your Account

Hi,

Congratulations! Your brand "${brandName}" has been verified and approved on Aris.

To activate your brand account and get started, please click the link below:

${claimUrl}

Important: This activation link will expire in 7 days. Please complete your account setup before then.

If the link doesn't work, copy and paste it directly into your browser.

If you didn't apply for a brand on Aris, please ignore this email.

Best regards,
The Aris Team`;
}

/**
 * Approve brand application and generate claim token
 * POST /api/admin/brands/:id/approve
 * Admin only
 */
export const approveBrandAndGenerateToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: applicationId } = req.params;

    if (!applicationId) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
      return;
    }

    // Get admin username
    const adminReq = req as any; // Using any to avoid importing AdminRequest interface if not easily available, or import it
    const reviewedBy = adminReq.admin?.username || 'admin';

    // Generate claim token
    const { claimToken, applicationId: appId } = await BrandClaimService.generateClaimToken(applicationId, reviewedBy);

    // Get application details
    const application = await BrandClaimService.getApplicationByClaimToken(claimToken);

    if (!application) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve application after token generation',
      });
      return;
    }

    const claimUrl = `${process.env.FRONTEND_URL || 'https://aris.com'}/claim-brand/${claimToken}`;
    const emailTemplate = generateEmailTemplate(application.brandName, claimUrl, application.contactEmail || '');

    res.status(200).json({
      success: true,
      message: 'Brand approved and claim token generated',
      data: {
        applicationId: appId,
        brandName: application.brandName,
        claimToken,
        claimUrl,
        brandOwnerEmail: application.contactEmail,
        expiresAt: application.claimTokenExpiry,
        emailTemplate, // Copy-paste ready email template
      },
    });
  } catch (error: any) {
    logger.error('Error approving brand:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error.message.includes('must be')) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: `Failed to approve brand: ${error.message}`,
    });
  }
};

/**
 * Get email template for brand claim (for admin to manually send)
 * GET /api/admin/applications/:id/claim-email-template
 * Admin only
 */
export const getClaimEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: applicationId } = req.params;

    if (!applicationId) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
      return;
    }

    // Get application by ID
    const { prisma } = await import('../lib/prisma');
    const application = await prisma.brandApplication.findUnique({
      where: { id: applicationId },
      include: {
        brand: true,
      },
    });

    if (!application) {
      res.status(404).json({
        success: false,
        error: 'Application not found',
      });
      return;
    }

    if (!application.claimToken) {
      res.status(400).json({
        success: false,
        error: 'No active claim token for this application',
      });
      return;
    }

    if (!application.contactEmail) {
      res.status(400).json({
        success: false,
        error: 'No brand owner email configured',
      });
      return;
    }

    if (application.brand && application.brand.ownerId) {
      res.status(400).json({
        success: false,
        error: 'Brand has already been claimed',
      });
      return;
    }

    const claimUrl = `${process.env.FRONTEND_URL || 'https://aris.com'}/claim-brand/${application.claimToken}`;
    const emailTemplate = generateEmailTemplate(application.brandName, claimUrl, application.contactEmail);

    res.json({
      success: true,
      data: {
        applicationId: application.id,
        brandName: application.brandName,
        brandOwnerEmail: application.contactEmail,
        claimUrl,
        expiresAt: application.claimTokenExpiry,
        emailTemplate,
      },
    });
  } catch (error: any) {
    logger.error('Error getting email template:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get email template',
    });
  }
};
