import { prisma } from '../../lib/prisma.js';
import { UserRole } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { addBrandLogoUrls } from '../brands/BrandQueryService.js';
import { EventQueryService } from '../events/EventQueryService.js';

export interface SearchOptions {
  q: string;
  limit?: number;
}

function parseOptions(q: unknown, limitStr: unknown): { searchTerm: string; limitNum: number } {
  if (!q || typeof q !== 'string') throw new ValidationError('Search query is required');
  const searchTerm = (q as string).trim();
  if (searchTerm.length < 2) throw new ValidationError('Search term must be at least 2 characters');
  const limitNum = Math.min(parseInt((limitStr as string) || '10') || 10, 50);
  return { searchTerm, limitNum };
}

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  xp: true,
  isOnboarded: true,
  createdAt: true,
};

const BRAND_SELECT = {
  id: true,
  name: true,
  tagline: true,
  description: true,
  logoCid: true,
  categories: true,
  websiteUrl: true,
  socialLinks: true,
  createdAt: true,
  _count: { select: { subscriptions: true } },
};

export class SearchService {
  static async searchUsers(q: unknown, limitStr: unknown) {
    const { searchTerm, limitNum } = parseOptions(q, limitStr);

    return prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: searchTerm, mode: 'insensitive' } },
              { displayName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          { role: UserRole.USER, isOnboarded: true },
        ],
      },
      select: USER_SELECT,
      take: limitNum,
      orderBy: [{ xp: 'desc' }, { createdAt: 'desc' }],
    });
  }

  static async searchBrands(q: unknown, limitStr: unknown) {
    const { searchTerm, limitNum } = parseOptions(q, limitStr);

    const brands = await prisma.brand.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { tagline: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { categories: { hasSome: [searchTerm] } },
        ],
      },
      select: BRAND_SELECT,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    });

    return brands.map(addBrandLogoUrls);
  }

  static async searchEvents(q: unknown, limitStr: unknown) {
    const { searchTerm, limitNum } = parseOptions(q, limitStr);

    const events = await prisma.event.findMany({
      where: {
        isDeleted: false,
        blockchainStatus: { in: ['ACTIVE', 'PENDING', 'PENDING_BLOCKCHAIN', 'COMPLETED'] },
        title: { contains: searchTerm, mode: 'insensitive' },
        status: { in: ['posting', 'voting', 'completed'] },
      },
      include: {
        brand: { select: { id: true, name: true, logoCid: true } },
      },
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    });

    return events.map(e => EventQueryService.addImageUrls(e));
  }

  static async searchAll(q: unknown, limitStr: unknown) {
    const { searchTerm, limitNum } = parseOptions(q, limitStr);
    const perCategory = Math.ceil(limitNum / 2);

    const [users, brands, events] = await Promise.all([
      prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { username: { contains: searchTerm, mode: 'insensitive' } },
                { displayName: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
            { role: UserRole.USER, isOnboarded: true },
          ],
        },
        select: USER_SELECT,
        take: perCategory,
        orderBy: [{ xp: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.brand.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { tagline: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { categories: { hasSome: [searchTerm] } },
          ],
        },
        select: BRAND_SELECT,
        take: perCategory,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.findMany({
        where: {
          isDeleted: false,
          blockchainStatus: { in: ['ACTIVE', 'PENDING', 'PENDING_BLOCKCHAIN', 'COMPLETED'] },
          title: { contains: searchTerm, mode: 'insensitive' },
          status: { in: ['posting', 'voting', 'completed'] },
        },
        include: { brand: { select: { id: true, name: true, logoCid: true } } },
        take: perCategory,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      users,
      brands: brands.map(addBrandLogoUrls),
      events: events.map(e => EventQueryService.addImageUrls(e)),
    };
  }

  static async getUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        xp: true,
        isOnboarded: true,
        socialLinks: true,
        preferredBrands: true,
        preferredCategories: true,
        createdAt: true,
        _count: { select: { followers: true, following: true } },
      },
    });

    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  static async getBrandByIdentifier(identifier: string) {
    const brand = await prisma.brand.findFirst({
      where: {
        OR: [
          { id: identifier },
          { name: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      select: BRAND_SELECT,
    });

    if (!brand) throw new NotFoundError('Brand not found');
    return addBrandLogoUrls(brand);
  }
}
