/**
 * Mock User Service
 *
 * Simulates a real API for user, leaderboard, and activity data.
 * Replace this file with a real API client when backend is ready.
 * UI components require NO changes when swapping to real API.
 */

import type {
    LeaderboardEntry,
    LeaderboardResponse,
    UserStats,
    FriendActivity,
} from '@/types/api';

// ─── Simulated network delay ──────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Leaderboard ─────────────────────────────────────────────────────────────

/**
 * Returns podium (top 3) and ranked table data for the leaderboard page.
 * Maps to GET /api/leaderboard
 */
export async function getLeaderboard(page = 1): Promise<LeaderboardResponse> {
    await delay(350);
    const { default: data } = await import('@/mock/leaderboard.json');

    // Patch data to include votesCast if missing
    const patchedData = (data.data as any[]).map(user => ({
        ...user,
        votesCast: user.votesCast || Math.floor(Math.random() * 5000)
    })) as LeaderboardEntry[];

    const patchedTopUsers = (data.topUsers as any[]).map(user => ({
        ...user,
        votesCast: user.votesCast || Math.floor(Math.random() * 10000)
    })) as LeaderboardEntry[];

    return {
        topUsers: patchedTopUsers,
        data: patchedData,
        meta: { ...data.meta, page },
    };
}

/**
 * Returns only the top 3 users for the podium component.
 * Maps to GET /api/leaderboard/top
 */
export async function getTopUsers(): Promise<LeaderboardEntry[]> {
    await delay(250);
    const { default: data } = await import('@/mock/leaderboard.json');
    return data.topUsers as LeaderboardEntry[];
}

// ─── User Stats ───────────────────────────────────────────────────────────────

/**
 * Returns the current user's stats (streak, XP, rank, etc.).
 * Maps to GET /api/users/me/stats
 */
export async function getUserStats(): Promise<UserStats> {
    await delay(200);
    const { default: data } = await import('@/mock/userStats.json');
    return data.data as UserStats;
}

// ─── Friend Activity ──────────────────────────────────────────────────────────

/**
 * Returns recent activity from friends/followed users.
 * Maps to GET /api/users/me/friends/activity
 */
export async function getFriendActivity(): Promise<FriendActivity[]> {
    await delay(250);
    const { default: data } = await import('@/mock/activity.json');
    return data.data as FriendActivity[];
}

// ─── New Leaderboard Tabs (Mock Data) ────────────────────────────────────────

import type { BrandLeaderboardEntry, EventLeaderboardEntry, ContentLeaderboardEntry } from '@/types/api';

export async function getBrandLeaderboard(): Promise<BrandLeaderboardEntry[]> {
    await delay(300);
    return [
        { rank: 1, brandId: 'nike', name: 'Nike', avatar: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', campaignsCount: 12, totalPrizePool: 50000, totalEngagements: 1500000 },
        { rank: 2, brandId: 'adidas', name: 'Adidas', avatar: 'https://images.unsplash.com/photo-1518002171953-a080ee321e2f', campaignsCount: 8, totalPrizePool: 35000, totalEngagements: 1200000 },
        { rank: 3, brandId: 'redbull', name: 'Red Bull', avatar: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908', campaignsCount: 5, totalPrizePool: 25000, totalEngagements: 900000 },
        { rank: 4, brandId: 'spotify', name: 'Spotify', avatar: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41', campaignsCount: 4, totalPrizePool: 20000, totalEngagements: 800000 },
        { rank: 5, brandId: 'tesla', name: 'Tesla', avatar: 'https://images.unsplash.com/photo-1617788138017-80ad40651399', campaignsCount: 3, totalPrizePool: 15000, totalEngagements: 750000 },
    ];
}

export async function getEventLeaderboard(): Promise<EventLeaderboardEntry[]> {
    await delay(300);
    return [
        { rank: 1, eventId: 'ev1', title: 'Summer Design Sprint', coverImage: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94', participants: 4500, totalVotes: 50000, prizePool: 10000 },
        { rank: 2, eventId: 'ev2', title: 'Neon Nights Photography', coverImage: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb', participants: 3200, totalVotes: 35000, prizePool: 5000 },
        { rank: 3, eventId: 'ev3', title: 'Future Tech Concepts', coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475', participants: 2800, totalVotes: 30000, prizePool: 3000 },
        { rank: 4, eventId: 'ev4', title: 'Sustainable Fashion', coverImage: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b', participants: 2100, totalVotes: 25000, prizePool: 2500 },
        { rank: 5, eventId: 'ev5', title: 'Abstract Art Challenge', coverImage: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968', participants: 1800, totalVotes: 20000, prizePool: 2000 },
    ];
}

export async function getContentLeaderboard(): Promise<ContentLeaderboardEntry[]> {
    await delay(300);
    return [
        { rank: 1, contentId: 'c1', title: 'Cyberpunk City Logic', coverImage: 'https://images.unsplash.com/photo-1515630278258-407f66498911', creatorName: 'PixelMaster', votes: 12500, earned: 1500 },
        { rank: 2, contentId: 'c2', title: 'Neural Network Visuals', coverImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b', creatorName: 'DataWiz', votes: 11000, earned: 1200 },
        { rank: 3, contentId: 'c3', title: 'Retro Glitch Art', coverImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853', creatorName: 'GlitchQueen', votes: 9500, earned: 1000 },
        { rank: 4, contentId: 'c4', title: '3D Character Model', coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe', creatorName: 'PolyGone', votes: 8200, earned: 800 },
        { rank: 5, contentId: 'c5', title: 'Minimalist Poster', coverImage: 'https://images.unsplash.com/photo-1572044162444-ad6021194342', creatorName: 'Minimalist', votes: 7500, earned: 750 },
    ];
}
