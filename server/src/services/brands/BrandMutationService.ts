import { prisma } from '../../lib/prisma.js';
import { UserRole } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';

const LOCKED_FIELDS = [
  'name', 'companyName', 'categories', 'websiteUrl',
  'contactEmail', 'contactName', 'contactRole', 'contactPhone',
  'gstNumber', 'panNumber',
];

export interface UpsertBrandData {
  name?: string;
  tagline?: string;
  description?: string;
  logoCid?: string;
  categories?: string[];
  socialLinks?: Record<string, string>;
}

export class BrandMutationService {
  static async upsert(userId: string, data: UpsertBrandData) {
    const { name, tagline, description, logoCid, categories, socialLinks } = data;

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('User not found');

      // Find brand by owner
      let existingBrand: any = await tx.brand.findFirst({
        where: { ownerId: userId },
        include: {
          applications: {
            where: { status: 'COMPLETED' },
            orderBy: { submittedAt: 'desc' },
            take: 1,
          },
        },
      });

      // Fallback: claim unowned brand by name
      if (!existingBrand && name) {
        const brandByName = await tx.brand.findUnique({
          where: { name },
          include: {
            applications: {
              where: { status: 'COMPLETED' },
              orderBy: { submittedAt: 'desc' },
              take: 1,
            },
          },
        });

        if (brandByName && (!brandByName.ownerId || brandByName.ownerId === userId)) {
          existingBrand = await tx.brand.update({
            where: { id: brandByName.id },
            data: { ownerId: userId },
            include: {
              applications: {
                where: { status: 'COMPLETED' },
                orderBy: { submittedAt: 'desc' },
                take: 1,
              },
            },
          });
        }
      }

      // Fix role if needed
      if (existingBrand && user.role !== UserRole.BRAND_OWNER) {
        await tx.user.update({
          where: { id: userId },
          data: { role: UserRole.BRAND_OWNER },
        });
      }

      const lockedFields = existingBrand?.applications?.[0] ? LOCKED_FIELDS : [];

      const updateData: any = {};
      if (!lockedFields.includes('name') && name) updateData.name = name;
      if (!lockedFields.includes('tagline') && tagline !== undefined) updateData.tagline = tagline;
      if (!lockedFields.includes('description') && description !== undefined) updateData.description = description;
      if (!lockedFields.includes('logoCid') && logoCid !== undefined) updateData.logoCid = logoCid;
      if (!lockedFields.includes('categories') && categories) updateData.categories = categories;

      if (socialLinks) {
        const existing = (existingBrand?.socialLinks as any) || {};
        updateData.socialLinks = { ...existing, ...socialLinks };
        if (lockedFields.includes('websiteUrl') && existingBrand?.websiteUrl) {
          updateData.socialLinks.website = existingBrand.websiteUrl;
        }
      }

      if (existingBrand) {
        if (Object.keys(updateData).length === 0) return existingBrand;
        return tx.brand.update({ where: { id: existingBrand.id }, data: updateData });
      }

      if (!name) throw new ValidationError('Brand name is required to create a new brand');

      return tx.brand.create({
        data: {
          name,
          tagline: tagline || null,
          description: description || null,
          logoCid: logoCid || null,
          categories: categories || [],
          socialLinks: socialLinks || {},
          ownerId: userId,
          isActive: true,
        },
      });
    });
  }

  static async handleDuplicateName(name: string, userId: string) {
    const userBrand = await prisma.brand.findFirst({
      where: { name, ownerId: userId },
    });
    if (userBrand) return userBrand;
    throw new ConflictError('A brand with this name already exists and is owned by another user');
  }
}
