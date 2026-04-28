import { prisma } from '../../lib/prisma';
import { UserRole } from '@prisma/client';

export class BrandService {
  /**
   * Verified if a user owns a specific brand or is an admin
   */
  static async verifyBrandOwnership(brandId: string, userId: string, userRole?: string): Promise<boolean> {
    if (userRole === UserRole.ADMIN) return true;

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { ownerId: true }
    });

    return brand?.ownerId === userId;
  }

  /**
   * Gets a brand ID for a user, or throws if not found
   */
  static async getBrandByOwnerId(userId: string) {
    return prisma.brand.findFirst({
      where: { ownerId: userId }
    });
  }

  /**
   * verify if user owns the brand that owns this event
   */
  static async verifyEventOwnership(eventId: string, userId: string, userRole?: string): Promise<boolean> {
    if (userRole === UserRole.ADMIN) return true;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { brand: { select: { ownerId: true } } }
    });

    return event?.brand?.ownerId === userId;
  }
}
