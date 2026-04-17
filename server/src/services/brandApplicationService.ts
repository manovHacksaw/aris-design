import { prisma } from '../lib/prisma';
import { BrandApplicationRequest, DocumentUpload } from '../types/brandApplication';
import { ApplicationStatus } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

export class BrandApplicationService {
  static async submitApplication(data: BrandApplicationRequest) {
    const {
      brandName, companyName, tagline, description, categories, contactEmail,
      contactPersonName, contactRole, phoneNumber, telegramHandle, socialLinks,
      gstNumber, panNumber, platformUsageReason, agreementAuthorized, agreementAccurate, documents,
    } = data;

    if (!brandName || !contactEmail || !categories || categories.length === 0) {
      throw new ValidationError('Brand name, contact email, and at least one category are required');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      throw new ValidationError('Invalid email format');
    }

    if (!documents || documents.length < 4) {
      throw new ValidationError('All 4 required documents must be uploaded (GST Certificate, Incorporation Letter, PAN Card, Trade License)');
    }

    const existingApplication = await prisma.brandApplication.findUnique({ where: { contactEmail } });

    if (existingApplication) {
      if (existingApplication.status === ApplicationStatus.PENDING) {
        throw new ConflictError('An application with this email is already pending review');
      }
      if (existingApplication.status === ApplicationStatus.APPROVED) {
        throw new ConflictError('An application with this email has already been approved. Please check your email for activation instructions');
      }
      if (existingApplication.status === ApplicationStatus.COMPLETED) {
        throw new ConflictError('A brand with this email already exists');
      }
    }

    return prisma.brandApplication.create({
      data: {
        brandName, companyName, tagline, description, categories, contactEmail,
        contactPersonName, contactRole, phoneNumber, telegramHandle,
        socialLinks: socialLinks ? JSON.parse(JSON.stringify(socialLinks)) : undefined,
        gstNumber, panNumber, platformUsageReason, agreementAuthorized, agreementAccurate,
        status: ApplicationStatus.PENDING,
        documents: documents.map((doc: DocumentUpload) => ({
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileCid: doc.fileData,
          fileUrl: doc.fileUrl,
          expiryDate: doc.expiryDate,
        })),
      },
    });
  }

  static async getApplicationById(id: string) {
    return prisma.brandApplication.findUnique({ where: { id } });
  }

  static async getApplications(status?: ApplicationStatus, limit = 50) {
    return prisma.brandApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { submittedAt: 'desc' },
      take: limit,
    });
  }

  static async approveApplication(applicationId: string, reviewedBy: string) {
    const application = await prisma.brandApplication.findUnique({ where: { id: applicationId } });

    if (!application) throw new NotFoundError('Application not found');
    if (application.status !== ApplicationStatus.PENDING) {
      throw new ValidationError(`Cannot approve application with status: ${application.status}`);
    }

    return prisma.brandApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.APPROVED, reviewedAt: new Date(), reviewedBy, rejectionReason: null },
    });
  }

  static async rejectApplication(applicationId: string, reviewedBy: string, reason: string) {
    const application = await prisma.brandApplication.findUnique({ where: { id: applicationId } });

    if (!application) throw new NotFoundError('Application not found');
    if (application.status !== ApplicationStatus.PENDING) {
      throw new ValidationError(`Cannot reject application with status: ${application.status}`);
    }
    if (!reason || reason.trim().length === 0) throw new ValidationError('Rejection reason is required');

    return prisma.brandApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.REJECTED, reviewedAt: new Date(), reviewedBy, rejectionReason: reason },
    });
  }

  static async getApplicationByEmail(email: string) {
    return prisma.brandApplication.findUnique({ where: { contactEmail: email } });
  }
}
