import { prisma } from '../../lib/prisma';
import { Event } from '@prisma/client';
import {
  EventFilters,
  EventStatus,
} from '../../types/event';
import { getIPFSUrl } from '../ipfsService';


export class EventQueryService {


  // ==================== IPFS URL HELPERS ====================

  /**
   * Transform event with optimized IPFS image URLs
   */
  static addImageUrls(event: any): any {
    if (!event) return event;

    const transformed = { ...event };

    // Add event image URLs — prefer Cloudinary imageUrl, fall back to IPFS CID
    if (event.imageUrl) {
      transformed.imageUrls = {
        thumbnail: event.imageUrl,
        medium: event.imageUrl,
        large: event.imageUrl,
        full: event.imageUrl,
      };
    } else if (event.imageCid) {
      transformed.imageUrls = {
        thumbnail: getIPFSUrl(event.imageCid, 'thumbnail'),
        medium: getIPFSUrl(event.imageCid, 'medium'),
        large: getIPFSUrl(event.imageCid, 'large'),
        full: getIPFSUrl(event.imageCid, 'full'),
      };
    }

    // Add brand logo URLs if brand is included
    if (event.brand?.logoCid) {
      transformed.brand = {
        ...event.brand,
        logoUrls: {
          thumbnail: getIPFSUrl(event.brand.logoCid, 'thumbnail'),
          medium: getIPFSUrl(event.brand.logoCid, 'medium'),
          full: getIPFSUrl(event.brand.logoCid, 'full'),
        },
      };
    }

    // Add submission image URLs if submissions are included
    if (event.submissions && Array.isArray(event.submissions)) {
      transformed.submissions = event.submissions.map((submission: any) => ({
        ...submission,
        ...(submission.imageCid && {
          imageUrls: {
            thumbnail: getIPFSUrl(submission.imageCid, 'thumbnail'),
            medium: getIPFSUrl(submission.imageCid, 'medium'),
            large: getIPFSUrl(submission.imageCid, 'large'),
            full: getIPFSUrl(submission.imageCid, 'full'),
          },
        }),
      }));
    }

    // Add proposal image URLs if proposals are included
    if (event.proposals && Array.isArray(event.proposals)) {
      transformed.proposals = event.proposals.map((proposal: any) => ({
        ...proposal,
        ...(proposal.imageCid && {
          imageUrls: {
            thumbnail: getIPFSUrl(proposal.imageCid, 'thumbnail'),
            medium: getIPFSUrl(proposal.imageCid, 'medium'),
            large: getIPFSUrl(proposal.imageCid, 'large'),
            full: getIPFSUrl(proposal.imageCid, 'full'),
          },
        }),
      }));
    }

    // Add samples URLs if present
    if (event.samples && Array.isArray(event.samples) && event.samples.length > 0) {
      transformed.sampleUrls = event.samples.map((cid: string) => ({
        cid,
        urls: cid.startsWith('http') ? {
          thumbnail: cid,
          medium: cid,
          large: cid,
          full: cid,
        } : {
          thumbnail: getIPFSUrl(cid, 'thumbnail'),
          medium: getIPFSUrl(cid, 'medium'),
          large: getIPFSUrl(cid, 'large'),
          full: getIPFSUrl(cid, 'full'),
        }
      }));
    }

    return transformed;
  }


  // ==================== READ ====================

  /**
   * Get event by ID
   * Applies visibility rules for submissions based on event status and user role
   */
  static async getEventById(id: string, userId?: string): Promise<any | null> {
    const startTime = Date.now();
    logger.info(`[getEventById] Starting fetch for event ${id}`);

    // Round-trip 1: fetch the event itself + related entities + avatar samples
    console.time(`[getEventById] Query 1: Event + Brand + Proposals + Avatars - ${id}`);
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logoCid: true,
            ownerId: true,
            socialLinks: true,
            websiteUrl: true,
          },
        },
        eventAnalytics: true,
        proposals: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
            votes: true,
          },
        },
        // NEW: Fetch avatar samples in the first round-trip to eliminate 2 queries from the next step
        submissions: {
          where: { status: 'active' },
          select: { user: { select: { id: true, avatarUrl: true, username: true } } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        votes: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          distinct: ['userId'], // We want unique voters for the avatar cloud
          select: { user: { select: { id: true, avatarUrl: true, username: true } } },
        }
      },
    });
    console.timeEnd(`[getEventById] Query 1: Event + Brand + Proposals + Avatars - ${id}`);

    // Early-exit checks
    if (!event || (event as any).isDeleted) return null;

    if (event.blockchainStatus !== 'ACTIVE') {
      const isBrandOwner = userId && event.brand.ownerId === userId;
      if (!isBrandOwner) return null;
    }

    // Logic to sync analytics counts
    if (event.eventAnalytics && event._count) {
      if (event.eventAnalytics.totalVotes > event._count.votes) {
        (event as any)._count.votes = event.eventAnalytics.totalVotes;
      }
      if (event.eventAnalytics.totalSubmissions > event._count.submissions) {
        (event as any)._count.submissions = event.eventAnalytics.totalSubmissions;
      }
    }

    // Determine which submissions list we need
    const isBrandOwner = userId && event.brand.ownerId === userId;
    const needsAllSubmissions = [EventStatus.VOTING, EventStatus.COMPLETED].includes(event.status as any);
    const needsOwnSubmission = event.status === EventStatus.POSTING && !isBrandOwner && !!userId;

    // Round-trip 2: run remaining queries in parallel
    console.time(`[getEventById] Query Block 2: Parallel Submissions + UserData - ${id}`);
    const [
      allSubmissions,
      uniqueVoters,
      uniquePosters,
      userVotes,
      userSubmission,
    ] = await Promise.all([
      // Submissions list (conditional on status)
      needsAllSubmissions
        ? prisma.submission.findMany({
            where: { eventId: id, status: 'active' },
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              _count: { select: { votes: true } },
            },
            orderBy: event.status === EventStatus.COMPLETED ? { finalRank: 'asc' } : { createdAt: 'desc' },
          })
        : needsOwnSubmission
        ? prisma.submission.findMany({
            where: { eventId: id, userId, status: 'active' },
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              _count: { select: { votes: true } },
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      // Unique participant counts - POTENTIALLY SLOW DUE TO DISTINCT
      prisma.vote.findMany({
        where: { eventId: id },
        select: { userId: true, user: { select: { id: true, avatarUrl: true, username: true, displayName: true } } },
        distinct: ['userId'],
        take: 50,
      }),
      event.eventType === 'post_and_vote'
        ? prisma.submission.findMany({
            where: { eventId: id, status: 'active' },
            select: { userId: true, user: { select: { id: true, avatarUrl: true, username: true, displayName: true } } },
            distinct: ['userId'],
            take: 50,
          })
        : Promise.resolve([]),
      // User-specific data
      userId
        ? prisma.vote.findMany({ where: { eventId: id, userId } })
        : Promise.resolve([]),
      userId
        ? prisma.submission.findFirst({ where: { eventId: id, userId } })
        : Promise.resolve(null),
    ]);
    console.timeEnd(`[getEventById] Query Block 2: Parallel Submissions + UserData - ${id}`);

    // Extract recent data from the FIRST round-trip's includes
    const recentSubmissions = event.submissions || [];
    const recentVotes = event.votes || [];

    // Build participantAvatars
    const avatarMap = new Map();
    [...recentSubmissions, ...recentVotes].forEach((p: any) => {
      if (p.user && !avatarMap.has(p.user.id)) {
        avatarMap.set(p.user.id, { id: p.user.id, avatarUrl: p.user.avatarUrl, username: p.user.username });
      }
    });
    (event as any).participantAvatars = Array.from(avatarMap.values()).slice(0, 5);

    let submissions: any[] = allSubmissions as any[];

    // Build full participant list (voters + submitters)
    const submitterIds = new Set((uniquePosters as any[]).map((p: any) => p.userId));
    const avatarList = [
      ...(uniquePosters as any[]).map((p: any) => ({
        id: p.userId,
        avatarUrl: p.user?.avatarUrl ?? null,
        username: p.user?.username ?? 'user',
        displayName: p.user?.displayName ?? null,
      })),
      ...(uniqueVoters as any[])
        .filter((v: any) => !submitterIds.has(v.userId))
        .map((v: any) => ({
          id: v.userId,
          avatarUrl: v.user?.avatarUrl ?? null,
          username: v.user?.username ?? 'user',
          displayName: v.user?.displayName ?? null,
        })),
    ];
    const participantAvatars = avatarList.slice(0, 50);

    const participantSet = new Set([
      ...(uniqueVoters as any[]).map((v: any) => v.userId),
      ...(uniquePosters as any[]).map((p: any) => p.userId),
    ]);
    const totalParticipants = participantSet.size;

    const totalTime = Date.now() - startTime;
    logger.info(`[getEventById] Completed in ${totalTime}ms for event ${id}`);

    // Strip vote counts for non-completed events.
    if (event.status !== EventStatus.COMPLETED) {
      if ((event as any)._count) (event as any)._count.votes = 0;
      if ((event as any).eventAnalytics) (event as any).eventAnalytics.totalVotes = 0;
      (event as any).proposals = ((event as any).proposals || []).map((p: any) => ({
        ...p,
        voteCount: 0,
        _count: p._count ? { ...p._count, votes: 0 } : p._count,
      }));
      submissions = submissions.map((s: any) => ({
        ...s,
        voteCount: 0,
        _count: s._count ? { ...s._count, votes: 0 } : s._count,
      }));
    }

    if (userId) {
      return EventQueryService.addImageUrls({
        ...event,
        submissions,
        userVotes: userVotes ?? [],
        hasVoted: (userVotes?.length ?? 0) > 0,
        hasSubmitted: !!userSubmission,
        userSubmission: userSubmission ?? null,
        totalParticipants,
        participantAvatars,
      });
    }

    return EventQueryService.addImageUrls({
      ...event,
      submissions,
      totalParticipants,
      participantAvatars,
    });
  }


  /**
   * Get events with filters and pagination
   */
  static async getEvents(
    filters: EventFilters,
    userBrandId?: string,
    viewingUserId?: string
  ): Promise<{ events: Event[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Max 100
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isDeleted: false, // Exclude soft-deleted
    };

    // Apply search query if present
    if (filters.q && typeof filters.q === 'string') {
      where.title = { contains: filters.q, mode: 'insensitive' };
    }

    // CRITICAL: Filter out pending/failed blockchain events for public listing
    // We'll override this for brand owners below
    if (!userBrandId) {
      where.blockchainStatus = 'ACTIVE';
    }

    // MILESTONE 3: Visibility filtering
    // SCHEDULED events only visible to brand owner
    // CANCELLED events hidden from everyone
    if (!userBrandId) {
      // Regular users: only see posting, voting, completed
      where.status = filters.status
        ? filters.status
        : { in: [EventStatus.POSTING, EventStatus.VOTING, EventStatus.COMPLETED] };
    } else {
      // Brand owners: see their own events (any status except cancelled) + public events
      if (filters.status) {
        // If filtering by status, respect it but still apply ownership rules
        if (filters.status === EventStatus.SCHEDULED) {
          // SCHEDULED: only their own events
          where.brandId = userBrandId;
          where.status = EventStatus.SCHEDULED;
        } else if (filters.status === EventStatus.CANCELLED) {
          // CANCELLED: never shown
          where.status = EventStatus.CANCELLED;
          where.brandId = userBrandId; // Only their own cancelled events
        } else {
          // Other statuses: their events OR public events
          where.OR = [
            { brandId: userBrandId },
            { status: filters.status },
          ];
        }
      } else {
        // No status filter: their events OR public events (not scheduled/cancelled)
        where.OR = [
          { brandId: userBrandId },
          { status: { in: [EventStatus.POSTING, EventStatus.VOTING, EventStatus.COMPLETED] } },
        ];
      }
    }

    // Apply other filters
    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.brandId) {
      // Override visibility logic if filtering by specific brand
      where.brandId = filters.brandId;
      delete where.OR;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              logoCid: true,
            },
          },
          proposals: {
            take: 3,
            orderBy: { order: 'asc' },
          },
          submissions: {
            where: {
              status: 'active',
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
          eventAnalytics: true,
          _count: {
            select: {
              submissions: true,
              votes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    // Check for user votes and submissions if viewingUserId provided
    if (viewingUserId && events.length > 0) {
      const eventIds = events.map(e => e.id);

      const [votes, submissions] = await Promise.all([
        prisma.vote.findMany({
          where: {
            userId: viewingUserId,
            eventId: { in: eventIds }
          },
          select: { eventId: true }
        }),
        prisma.submission.findMany({
          where: {
            userId: viewingUserId,
            eventId: { in: eventIds },
            status: 'active'
          },
          select: { eventId: true }
        })
      ]);

      const votedEventIds = new Set(votes.map(v => v.eventId));
      const submittedEventIds = new Set(submissions.map(s => s.eventId));

      // Update events in place
      events.forEach((event: any) => {
        event.hasVoted = votedEventIds.has(event.id);
        event.hasSubmitted = submittedEventIds.has(event.id);
      });
    }

    return {
      events: events.map(event => EventQueryService.addImageUrls(event)),
      total
    };
  }


  /**
   * Get events voted by user
   */
  static async getEventsVotedByUser(userId: string): Promise<any[]> {
    const events = await prisma.event.findMany({
      where: {
        votes: {
          some: {
            userId: userId
          }
        },
        isDeleted: false
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logoCid: true,
            ownerId: true,
          }
        },
        votes: {
          where: { userId: userId },
          take: 3,
          include: {
            submission: {
              select: { imageCid: true }
            },
            proposal: {
              select: { imageCid: true }
            }
          }
        },
        _count: {
          select: {
            submissions: true,
            votes: true,
          }
        },
        rewardsPool: {
          include: {
            claims: {
              where: { userId: userId },
              select: {
                finalAmount: true,
                claimType: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Post-process to extract images and add IPFS URLs
    return events.map((event: any) => {
      // Extract images from votes
      const voteImages = event.votes
        .map((v: any) => v.submission?.imageCid || v.proposal?.imageCid)
        .filter((cid: any): cid is string => !!cid)
        .map((cid: string) => getIPFSUrl(cid, 'thumbnail'));

      // Calculate earnings from claims
      const earnings = event.rewardsPool?.claims?.reduce((acc: number, claim: any) => acc + (claim.finalAmount || 0), 0) || 0;

      return EventQueryService.addImageUrls({
        ...event,
        earnings,
        previewImageUrls: voteImages
      });
    });
  }


  /**
   * Get events for a specific brand
   */
  static async getEventsByBrand(
    brandId: string,
    status?: string
  ): Promise<Event[]> {
    const where: any = {
      brandId,
      isDeleted: false,
    };

    if (status) {
      where.status = status;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        eventAnalytics: true,
        _count: {
          select: {
            submissions: true,
            votes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return events.map(event => EventQueryService.addImageUrls(event));
  }
}
