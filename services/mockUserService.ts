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

    return {
        topUsers: data.topUsers as LeaderboardEntry[],
        data: data.data as LeaderboardEntry[],
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
