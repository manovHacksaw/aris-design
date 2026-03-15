import { prisma } from "../lib/prisma";

/**
 * Leaderboard Service
 * Aggregates and ranks data for brands, users, events, and content
 */

// ============ BRAND LEADERBOARD ============

export interface BrandLeaderboardItem {
  id: string;
  rank: number;
  name: string;
  avatar: string | null;
  artMinted: number; // Dummy for now
  participants: number; // Unique voters + unique submission makers across all brand events
}

export async function getBrandLeaderboard(): Promise<BrandLeaderboardItem[]> {
  // Get all brands with their events and vote/submission data
  const brands = await prisma.brand.findMany({
    where: {
      isActive: true,
    },
    include: {
      events: {
        where: {
          isDeleted: false,
        },
        include: {
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
      },
    },
  });

  // Calculate metrics for each brand
  const brandMetrics = brands.map((brand) => {
    // Get unique participants (voters + submission makers)
    const uniqueVoters = new Set<string>();
    const uniqueSubmitters = new Set<string>();

    brand.events.forEach((event) => {
      event.votes.forEach((vote) => uniqueVoters.add(vote.userId));
      event.submissions.forEach((submission) => uniqueSubmitters.add(submission.userId));
    });

    const participants = new Set([...uniqueVoters, ...uniqueSubmitters]).size;

    // Dummy ART minted calculation (can be replaced with real logic)
    const artMinted = brand.eventsCreated * 1000 + participants * 100;

    return {
      id: brand.id,
      name: brand.name,
      avatar: brand.logoCid ? `https://ipfs.io/ipfs/${brand.logoCid}` : null,
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
  username: string;
  displayName: string | null;
  avatar: string | null;
  votesCast: number;
  votesReceived: number;
}

export async function getUserLeaderboard(): Promise<UserLeaderboardItem[]> {
  // Get all users with their votes cast and votes received
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      _count: {
        select: {
          votes: true, // Votes cast by this user
        },
      },
      submissions: {
        select: {
          _count: {
            select: {
              votes: true, // Votes received on each submission
            },
          },
        },
      },
    },
  });

  // Calculate metrics for each user
  const userMetrics = users.map((user) => {
    const votesCast = user._count.votes;
    const votesReceived = user.submissions.reduce(
      (total, submission) => total + submission._count.votes,
      0
    );

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatarUrl,
      votesCast,
      votesReceived,
    };
  });

  // Sort by votes cast DESC, then votes received DESC
  userMetrics.sort((a, b) => {
    if (b.votesCast !== a.votesCast) {
      return b.votesCast - a.votesCast;
    }
    return b.votesReceived - a.votesReceived;
  });

  // Add ranks
  return userMetrics.map((user, index) => ({
    ...user,
    rank: index + 1,
  }));
}

// ============ EVENT LEADERBOARD ============

export interface EventLeaderboardItem {
  id: string;
  rank: number;
  title: string;
  avatar: string | null; // Brand logo
  brandName: string;
  artMinted: number; // Dummy for now
  participants: number; // Unique voters + unique submission makers
}

export async function getEventLeaderboard(): Promise<EventLeaderboardItem[]> {
  // Get all non-deleted events with brand info
  const events = await prisma.event.findMany({
    where: {
      isDeleted: false,
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
      brandName: event.brand.name,
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
  username: string;
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
