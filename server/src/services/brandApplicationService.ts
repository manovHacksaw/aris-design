import { prisma } from '../lib/prisma';
import { BrandApplicationRequest, DocumentUpload } from '../types/brandApplication';
import { ApplicationStatus } from '@prisma/client';

export class BrandApplicationService {
  /**
   * Submit a new brand application
   */
  static async submitApplication(data: BrandApplicationRequest) {
    const {
      brandName,
      companyName,
      tagline,
      description,
      categories,
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
      documents,
    } = data;

    // Validate required fields
    if (!brandName || !contactEmail || !categories || categories.length === 0) {
      throw new Error('Brand name, contact email, and at least one category are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      throw new Error('Invalid email format');
    }

    // Validate documents (at least 4 required)
    if (!documents || documents.length < 4) {
      throw new Error('All 4 required documents must be uploaded (GST Certificate, Incorporation Letter, PAN Card, Trade License)');
    }

    // Check if email already exists
    const existingApplication = await prisma.brandApplication.findUnique({
      where: { contactEmail },
    });

    if (existingApplication) {
      if (existingApplication.status === ApplicationStatus.PENDING) {
        throw new Error('An application with this email is already pending review');
      }
      if (existingApplication.status === ApplicationStatus.APPROVED) {
        throw new Error('An application with this email has already been approved. Please check your email for activation instructions');
      }
      if (existingApplication.status === ApplicationStatus.COMPLETED) {
        throw new Error('A brand with this email already exists');
      }
      // If REJECTED, allow reapplication (we'll update the existing one)
    }

    // Create brand application
    const application = await prisma.brandApplication.create({
      data: {
        brandName,
        companyName,
        tagline,
        description,
        categories,
        contactEmail,
        contactPersonName,
        contactRole,
        phoneNumber,
        telegramHandle,
        socialLinks: socialLinks ? JSON.parse(JSON.stringify(socialLinks)) : undefined,
        gstNumber,
        panNumber,
        platformUsageReason,
        agreementAuthorized,
        agreementAccurate,
        status: ApplicationStatus.PENDING,
        documents: documents.map((doc: DocumentUpload) => ({
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileCid: doc.fileData, // For now, treating fileData as CID
          fileUrl: doc.fileUrl,
          expiryDate: doc.expiryDate,
        })),
      },
    });

    // TODO: Send notification to admin
    // await this.notifyAdmin(application);

    // TODO: Send confirmation email to brand
    // await this.sendConfirmationEmail(application);

    return application;
  }

  /**
   * Get application by ID
   */
  static async getApplicationById(id: string) {
    return prisma.brandApplication.findUnique({
      where: { id },
    });
  }

  /**
   * Get all applications (with optional status filter)
   */
  static async getApplications(status?: ApplicationStatus, limit = 50) {
    return prisma.brandApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: {
        submittedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Approve an application
   */
  static async approveApplication(applicationId: string, reviewedBy: string) {
    const application = await prisma.brandApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error(`Cannot approve application with status: ${application.status}`);
    }

    const updatedApplication = await prisma.brandApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason: null, // Clear any previous rejection reason
      },
    });

    // TODO: Send approval email with activation link
    // await this.sendApprovalEmail(updatedApplication);

    return updatedApplication;
  }

  /**
   * Reject an application
   */
  static async rejectApplication(applicationId: string, reviewedBy: string, reason: string) {
    const application = await prisma.brandApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error(`Cannot reject application with status: ${application.status}`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const updatedApplication = await prisma.brandApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason: reason,
      },
    });

    // TODO: Send rejection email with reason
    // await this.sendRejectionEmail(updatedApplication);

    return updatedApplication;
  }

  /**
   * Get application by email
   */
  static async getApplicationByEmail(email: string) {
    return prisma.brandApplication.findUnique({
      where: { contactEmail: email },
    });
  }

  // TODO: Implement email notification methods
  // private static async notifyAdmin(application: any) { }
  // private static async sendConfirmationEmail(application: any) { }
  // private static async sendApprovalEmail(application: any) { }
  // private static async sendRejectionEmail(application: any) { }
}
