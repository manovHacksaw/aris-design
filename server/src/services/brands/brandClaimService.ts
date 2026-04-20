import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { ApplicationStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';

const CLAIM_TOKEN_EXPIRY_DAYS = 7; // Token valid for 7 days

export class BrandClaimService {
  /**
   * Generate a claim token for an approved brand application
   * This is called after admin approves the application
   * NOTE: This does NOT create the brand record - that happens when the brand owner claims it
   */
  static async generateClaimToken(applicationId: string, reviewedBy: string = 'admin'): Promise<{ claimToken: string; applicationId: string }> {
    try {
      // Get the application
      const application = await prisma.brandApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) throw new NotFoundError('Application not found');

      // Auto-approve if pending
      if (application.status === ApplicationStatus.PENDING) {
        await prisma.brandApplication.update({
          where: { id: applicationId },
          data: {
            status: ApplicationStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedBy: reviewedBy
          },
        });
        // Update local status for subsequent checks
        application.status = ApplicationStatus.APPROVED;
      }

      if (application.status !== ApplicationStatus.APPROVED) {
        throw new ValidationError(`Application status is ${application.status}, must be APPROVED (or PENDING) to generate token`);
      }

      // Generate secure claim token
      const claimToken = randomUUID();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + CLAIM_TOKEN_EXPIRY_DAYS);

      // Store claim token in the application (NOT in a brand record)
      await prisma.brandApplication.update({
        where: { id: applicationId },
        data: {
          claimToken,
          claimTokenExpiry: expiryDate,
        },
      });

      return {
        claimToken,
        applicationId: applicationId,
      };
    } catch (error: any) {
      logger.error({ err: error }, 'Error in generateClaimToken:');
      // Re-throw with more context
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictError(`Duplicate ${field}: An application with this ${field} already exists`);
      }
      throw error;
    }
  }

  /**
   * Validate a claim token and return application details
   */
  static async validateClaimToken(token: string) {
    const application = await prisma.brandApplication.findUnique({
      where: { claimToken: token },
    });

    if (!application) {
      throw new ValidationError('Invalid claim token');
    }

    // Check if token has expired
    if (application.claimTokenExpiry && new Date() > application.claimTokenExpiry) {
      throw new ValidationError('Claim token has expired. Please contact support.');
    }

    // Check if application is approved
    if (application.status !== ApplicationStatus.APPROVED) {
      throw new ValidationError('Application is not approved');
    }

    // Check if brand already exists (already claimed)
    if (application.brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: application.brandId },
      });
      if (brand && brand.ownerId) {
        throw new ConflictError('This brand has already been claimed');
      }
    }

    return {
      applicationId: application.id,
      brandName: application.brandName,
      brandOwnerEmail: application.contactEmail,
      companyName: application.companyName,
      categories: application.categories,
      tagline: application.tagline,
      description: application.description,
    };
  }

  /**
   * Finalize brand claim by creating user account and assigning ownership
   * This creates the brand record in the brands table from the approved application
   */
  static async claimBrand(data: {
    claimToken: string;
    email: string;
    walletAddress: string;
    displayName?: string;
  }) {
    const { claimToken, email, displayName } = data;
    // Normalize wallet address to lowercase for consistent comparison
    const walletAddress = data.walletAddress.toLowerCase();

    // Validate inputs
    logger.info({ claimToken, email, walletAddress, displayName }, 'claimBrand called with');

    if (!claimToken || !email || !walletAddress) {
      throw new ValidationError('Claim token, email, and wallet address are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Find application by claim token
    const application = await prisma.brandApplication.findUnique({
      where: { claimToken },
    });

    if (!application) {
      throw new ValidationError('Invalid claim token');
    }

    // Check if token has expired
    if (application.claimTokenExpiry && new Date() > application.claimTokenExpiry) {
      throw new ValidationError('Claim token has expired. Please contact support.');
    }

    // Check if application is approved
    if (application.status !== ApplicationStatus.APPROVED) {
      throw new ValidationError('Application is not approved');
    }

    // Check if brand already exists (already claimed)
    if (application.brandId) {
      const existingBrand = await prisma.brand.findUnique({
        where: { id: application.brandId },
      });
      if (existingBrand && existingBrand.ownerId) {
        throw new ConflictError('This brand has already been claimed');
      }
    }

    // NOTE: We do NOT enforce that the user email matches the application contact email.
    // The claim token is sufficient proof of ownership.
    // This allows users to claim a brand using their Web3Auth identity (which might have a different email).

    // Wrap all database operations in a transaction to ensure atomicity
    // This prevents "zombie" users if brand claiming fails after user creation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if user exists by Wallet Address (Primary for Web3Auth)
      let user = await tx.user.findUnique({
        where: { walletAddress: walletAddress },
      });

      if (user) {
        logger.info(`Found existing user by wallet: ${user.id}`);

        // User exists with this wallet. We will upgrade this user.
        // If they provided a different email in the form, we might want to update it,
        // but only if that email isn't taken by someone else.
        if (email.toLowerCase() !== user.email.toLowerCase()) {
          const emailTaken = await tx.user.findUnique({
            where: { email: email.toLowerCase() },
          });
          if (!emailTaken) {
            // Update email if not taken
            user = await tx.user.update({
              where: { id: user.id },
              data: { email: email.toLowerCase() }
            });
          } else {
            logger.warn(`User wanted to use email ${email} but it is taken by another user. Keeping ${user.email}`);
            // We proceed with the existing user and their existing email
          }
        }
      } else {
        // 2. Check if user exists by Email (Secondary)
        user = await tx.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (user) {
          logger.info(`Found existing user by email: ${user.id}`);
          // User exists by email. If they have a different wallet, we update it to the new one.
          // This allows migrating from EOA to Smart Account.
          if (user.walletAddress && user.walletAddress.toLowerCase() !== walletAddress) {
            logger.info(`Migrating user ${user.id} wallet from ${user.walletAddress} to ${walletAddress}`);
            user = await tx.user.update({
              where: { id: user.id },
              data: { walletAddress: walletAddress }
            });
          }
        } else {
          // 3. Create NEW User
          logger.info(`Creating new user for brand claim`);
          user = await tx.user.create({
            data: {
              email: email.toLowerCase(),
              displayName: displayName || email.split('@')[0],
              walletAddress: walletAddress,
              role: UserRole.BRAND_OWNER,
              isOnboarded: true, // Auto-onboard
              emailVerified: true,
            },
          });
        }
      }

      // Ensure user is upgraded to BRAND_OWNER
      if (user.role !== UserRole.BRAND_OWNER || !user.isOnboarded) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            role: UserRole.BRAND_OWNER,
            isOnboarded: true,
          }
        });
      }

      // Check if user already owns another brand
      const existingOwnedBrand = await tx.brand.findFirst({
        where: { ownerId: user.id },
      });

      if (existingOwnedBrand) {
        if (!existingOwnedBrand.isActive) {
          logger.info(`User ${user.id} owns inactive brand ${existingOwnedBrand.id}, allowing reclaim/update`);
        } else {
          // If they are claiming the SAME brand again (e.g. retry), that's fine.
          // But if they are claiming a DIFFERENT brand, we might block or allow multiple?
          // Requirement says: "One owner = one brand unless manually overridden"
          // We'll check if it's the same brand application
          if (existingOwnedBrand.applicationId !== application.id) {
            throw new ConflictError('This user account already owns another brand');
          }
        }
      }

      // Check if a brand with this name already exists
      const existingBrandByName = await tx.brand.findUnique({
        where: { name: application.brandName }
      });

      let brand;
      if (existingBrandByName) {
        // Brand already exists - update it with owner
        brand = await tx.brand.update({
          where: { id: existingBrandByName.id },
          data: {
            ownerId: user.id,
            isActive: true,
            applicationId: application.id,
          },
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                displayName: true,
                walletAddress: true,
                role: true,
              },
            },
          },
        });
      } else {
        // Create brand from application data
        const gstNumber = application.gstNumber && application.gstNumber.trim() !== '' ? application.gstNumber : null;

        brand = await tx.brand.create({
          data: {
            name: application.brandName,
            tagline: application.tagline,
            description: application.description,
            categories: application.categories,
            logoCid: application.logoCid,
            websiteUrl: application.websiteUrl,
            socialLinks: application.socialLinks ?? undefined,
            companyName: application.companyName,
            contactName: application.contactPersonName,
            contactRole: application.contactRole,
            contactEmail: application.contactEmail,
            contactPhone: application.phoneNumber,
            gstNumber: gstNumber,
            panNumber: application.panNumber,
            applicationId: application.id,
            isVerified: true,
            isActive: true,
            ownerId: user.id,
          },
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                displayName: true,
                walletAddress: true,
                role: true,
              },
            },
          },
        });
      }

      // Update application: link to brand, mark as completed, clear claim token
      await tx.brandApplication.update({
        where: { id: application.id },
        data: {
          brandId: brand.id,
          status: ApplicationStatus.COMPLETED,
          claimToken: null, // Clear token (one-time use)
          claimTokenExpiry: null,
        },
      });

      return {
        user,
        brand,
      };
    });

    return result;
  }

  /**
   * Get application by claim token (without validating expiry)
   * Used for admin/support purposes
   */
  static async getApplicationByClaimToken(token: string) {
    return prisma.brandApplication.findUnique({
      where: { claimToken: token },
      include: {
        brand: {
          include: {
            owner: true,
          },
        },
      },
    });
  }
  /**
   * Get application with brand details by ID
   */
  static async getApplicationWithBrandById(id: string) {
    return prisma.brandApplication.findUnique({
      where: { id },
      include: {
        brand: true,
      },
    });
  }
}
