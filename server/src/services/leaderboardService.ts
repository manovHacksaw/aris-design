import { prisma } from "../lib/prisma";

/**
 * Leaderboard Service
 * Aggregates and ranks data for brands, users, events, and content
 */

function getPeriodDate(period: string): Date | null {
  const now = new Date();
  if (period === "D") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (period === "W") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "M") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null; // "A" = all time
}

// ============ BRAND LEADERBOARD ============

export interface BrandLeaderboardItem {
  id: string;
  rank: number;
  name: string;
  avatar: string | null;
  categories: string[];
  artMinted: number;
  participants: number;
}

export async function getBrandLeaderboard(period = "A"): Promise<BrandLeaderboardItem[]> {
  const since = getPeriodDate(period);
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: {
      events: {
        where: {
          isDeleted: false,
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        include: {
          votes: { select: { userId: true } },
          submissions: { select: { userId: true } },
        },
      },
    },
  });

  const brandMetrics = brands.map((brand) => {
    const uniqueVoters = new Set<string>();
    const uniqueSubmitters = new Set<string>();
    brand.events.forEach((event) => {
      event.votes.forEach((v) => uniqueVoters.add(v.userId));
      event.submissions.forEach((s) => uniqueSubmitters.add(s.userId));
    });
    const participants = new Set([...uniqueVoters, ...uniqueSubmitters]).size;
    const artMinted = brand.eventsCreated * 1000 + participants * 100;

    return {
      id: brand.id,
      name: brand.name,
      avatar: brand.logoCid ? `https://ipfs.io/ipfs/${brand.logoCid}` : null,
      categories: brand.categories,
      artMinted,
      participants,
    };
  });

  // Sort by participants DESC, then artMinted DESC
  brandMetrics.sort((a, b) => {
    if (b.participants !== a.participants) {
      return b.participants - a.participants;
    }
    return b.artMinted - a.artMinted;
  });

  // Add ranks
  return brandMetrics.map((brand, index) => ({
    ...brand,
    rank: index + 1,
  }));
}

// ============ USER LEADERBOARD ============

export interface UserLeaderboardItem {
  id: string;
  rank: number;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
  votesCast: number;
  votesReceived: number;
}

export async function getUserLeaderboard(period = "A"): Promise<UserLeaderboardItem[]> {
  const since = getPeriodDate(period);
  const dateFilter = since ? { createdAt: { gte: since } } : {};

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      xp: true,
      level: true,
      votes: {
        where: dateFilter,
        select: { id: true },
      },
      xpTransactions: {
        where: dateFilter,
        select: { amount: true },
      },
      submissions: {
        select: {
          votes: {
            where: dateFilter,
            select: { id: true },
          },
        },
      },
    },
  });

  const userMetrics = users.map((user) => {
    const votesCast = user.votes.length;
    const votesReceived = user.submissions.reduce(
      (total, s) => total + s.votes.length,
      0
    );
    // For all-time use cumulative xp field; for periods sum xpTransactions
    const xp =
      period === "A"
        ? user.xp
        : user.xpTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatarUrl,
      avatarUrl: user.avatarUrl,
      xp,
      level: user.level,
      votesCast,
      votesReceived,
    };
  });

  // For period views, hide users with zero activity
  const visible =
    period === "A"
      ? userMetrics
      : userMetrics.filter((u) => u.xp > 0 || u.votesCast > 0);

  visible.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return b.votesCast - a.votesCast;
  });

  return visible.map((user, index) => ({ ...user, rank: index + 1 }));
}

// ============ EVENT LEADERBOARD ============

export interface EventLeaderboardItem {
  id: string;
  rank: number;
  title: string;
  avatar: string | null; // Brand logo
  imageCid: string | null; // Event header image
  imageUrl: string | null;
  status: string;
  leaderboardPool: number;
  brandName: string;
  brand?: { name: string; logoCid: string | null };
  artMinted: number; // Dummy for now
  participants: number; // Unique voters + unique submission makers
}

export async function getEventLeaderboard(period = "A"): Promise<EventLeaderboardItem[]> {
  const since = getPeriodDate(period);
  // Get all non-deleted events with brand info
  const events = await prisma.event.findMany({
    where: {
      isDeleted: false,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    include: {
      brand: {
        select: {
          name: true,
          logoCid: true,
        },
      },
      votes: {
        select: {
          userId: true,
        },
      },
      submissions: {
        select: {
          userId: true,
        },
      },
    },
  });

  // Calculate metrics for each event
  const eventMetrics = events.map((event) => {
    // Get unique participants
    const uniqueVoters = new Set(event.votes.map((v) => v.userId));
    const uniqueSubmitters = new Set(event.submissions.map((s) => s.userId));
    const participants = new Set([...uniqueVoters, ...uniqueSubmitters]).size;

    // Dummy ART minted calculation
    const artMinted = participants * 150 + event.votes.length * 10;

    return {
      id: event.id,
      title: event.title,
      avatar: event.brand.logoCid ? `https://ipfs.io/ipfs/${event.brand.logoCid}` : null,
      imageCid: event.imageCid ?? null,
      imageUrl: (event as any).imageUrl ?? null,
      status: event.status,
      leaderboardPool: (event as any).leaderboardPool ?? 0,
      brandName: event.brand.name,
      brand: { name: event.brand.name, logoCid: event.brand.logoCid },
      artMinted,
      participants,
    };
  });

  // Sort by participants DESC, then artMinted DESC
  eventMetrics.sort((a, b) => {
    if (b.participants !== a.participants) {
      return b.participants - a.participants;
    }
    return b.artMinted - a.artMinted;
  });

  // Add ranks
  return eventMetrics.map((event, index) => ({
    ...event,
    rank: index + 1,
  }));
}

// ============ CONTENT LEADERBOARD ============

export interface ContentLeaderboardItem {
  id: string;
  rank: number;
  username: string | null;
  userAvatar: string | null;
  image: string;
  votes: number;
  eventId: string;
  eventTitle: string;
}

export async function getContentLeaderboard(): Promise<ContentLeaderboardItem[]> {
  // Get all submissions from completed events only (events that have ended)
  const submissions = await prisma.submission.findMany({
    where: {
      event: {
        status: {
          in: ["completed", "COMPLETED"],
        },
        isDeleted: false,
      },
    },
    include: {
      user: {
        select: {
          username: true,
          avatarUrl: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          votes: true,
        },
      },
    },
    orderBy: {
      voteCount: "desc",
    },
  });

  // Map to content leaderboard items
  return submissions.map((submission, index) => ({
    id: submission.id,
    rank: index + 1,
    username: submission.user.username,
    userAvatar: submission.user.avatarUrl,
    image: `https://ipfs.io/ipfs/${submission.imageCid}`,
    votes: submission._count.votes,
    eventId: submission.event.id,
    eventTitle: submission.event.title,
  }));
}
