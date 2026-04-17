import { prisma } from '../../lib/prisma.js';
import { getIPFSUrl } from '../ipfsService.js';
import { NotFoundError } from '../../utils/errors.js';

export function addBrandLogoUrls(brand: any): any {
  if (!brand) return brand;
  const transformed = { ...brand };
  if (brand.logoCid) {
    transformed.logoUrls = {
      thumbnail: getIPFSUrl(brand.logoCid, 'thumbnail'),
      medium: getIPFSUrl(brand.logoCid, 'medium'),
      full: getIPFSUrl(brand.logoCid, 'full'),
    };
  }
  return transformed;
}

const LOCKED_FIELDS = [
  'name', 'companyName', 'categories', 'websiteUrl',
  'contactEmail', 'contactName', 'contactRole', 'contactPhone',
  'gstNumber', 'panNumber',
];

export class BrandQueryService {
  static async getByOwner(userId: string) {
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
      include: {
        applications: {
          where: { status: 'COMPLETED' },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!brand) throw new NotFoundError('Brand not found');

    const application = brand.applications?.[0];
    const lockedFields = application ? LOCKED_FIELDS : [];

    return addBrandLogoUrls({
      ...brand,
      lockedFields,
      levelInfo: {
        level: brand.level,
        discountPercent: brand.discountPercent,
        totalUsdcGiven: brand.totalUsdcGiven,
        eventsCreated: brand.eventsCreated,
        uniqueParticipants: brand.uniqueParticipants,
      },
      applicationData: application ? {
        companyName: application.companyName,
        gstNumber: application.gstNumber,
        panNumber: application.panNumber,
        contactPersonName: application.contactPersonName,
        contactRole: application.contactRole,
        phoneNumber: application.phoneNumber,
      } : null,
    });
  }

  static async getPublicProfile(identifier: string, requestingUserId?: string) {
    const slugAsName = identifier.replace(/-/g, ' ');

    const brand = await prisma.brand.findFirst({
      where: {
        OR: [
          { id: identifier },
          { name: { equals: identifier, mode: 'insensitive' } },
          { name: { equals: slugAsName, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: {
        events: {
          where: { isDeleted: false },
          orderBy: { startTime: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            subscriptions: true,
            events: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!brand) throw new NotFoundError('Brand not found');

    const transformed = addBrandLogoUrls(brand);

    return {
      id: transformed.id,
      name: transformed.name,
      tagline: transformed.tagline,
      description: transformed.description,
      categories: transformed.categories,
      logoCid: transformed.logoCid,
      logoUrls: transformed.logoUrls,
      websiteUrl: transformed.websiteUrl,
      socialLinks: transformed.socialLinks,
      isVerified: transformed.isVerified,
      isOwner: requestingUserId === transformed.ownerId,
      level: transformed.level,
      totalUsdcGiven: transformed.totalUsdcGiven,
      uniqueParticipants: transformed.uniqueParticipants,
      eventsCreated: transformed._count.events,
      followerCount: transformed._count.subscriptions,
      createdAt: transformed.createdAt,
      events: transformed.events.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        status: e.status,
        eventType: e.eventType,
        category: e.category,
        startTime: e.startTime,
        endTime: e.endTime,
        imageUrl: e.imageUrl,
        imageCid: e.imageCid,
        baseReward: e.baseReward,
        topReward: e.topReward,
        leaderboardPool: e.leaderboardPool,
        capacity: e.capacity,
        _count: { submissions: 0 },
      })),
    };
  }

  static async getMilestones(userId: string) {
    const brand = await prisma.brand.findFirst({
      where: { ownerId: userId },
      include: {
        events: {
          include: { eventAnalytics: true },
        },
      },
    });

    if (!brand) throw new NotFoundError('Brand not found');

    const eventsCreated = brand.eventsCreated || await prisma.event.count({ where: { brandId: brand.id } });

    let uniqueParticipants = brand.uniqueParticipants;
    if (uniqueParticipants === 0 && brand.events.length > 0) {
      uniqueParticipants = brand.events.reduce(
        (sum, e) => sum + (e.eventAnalytics?.uniqueParticipants || 0),
        0,
      );
    }

    const usdcDistributed = brand.totalUsdcGiven;

    const calculateLevel = (value: number, type: 'usdc' | 'events' | 'participants') => {
      const tiers: Record<string, number[]> = {
        usdc: [10000, 25000, 50000, 100000, 250000, 500000, 1000000],
        events: [3, 6, 9, 20, 50, 75, 100],
        participants: [1000, 2000, 5000, 10000, 25000, 50000, 100000],
      };
      let level = 0;
      for (let i = 0; i < tiers[type].length; i++) {
        if (value >= tiers[type][i]) level = i + 1;
        else break;
      }
      return level;
    };

    return {
      eventsCreated,
      uniqueParticipants,
      usdcDistributed,
      milestones: {
        eventsCreatedLevel: calculateLevel(eventsCreated, 'events'),
        uniqueParticipantsLevel: calculateLevel(uniqueParticipants, 'participants'),
        usdcDistributedLevel: calculateLevel(usdcDistributed, 'usdc'),
      },
    };
  }
}
