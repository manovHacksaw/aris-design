import { apiRequest } from './api';

export interface UserLeaderboardEntry {
    id: string;
    rank: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    avatar: string | null;
    xp: number;
    level: number;
    badges?: string[];
    votesCast?: number;
    votesReceived?: number;
    followers?: number;
}

export interface BrandLeaderboardEntry {
    id: string;
    rank: number;
    name: string;
    avatar: string | null;
    bio?: string | null;
    categories?: string[];
    artMinted: number;
    participants: number;
}

export interface LeaderboardResponse {
    success: boolean;
    data: UserLeaderboardEntry[];
    total: number;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export async function getUserLeaderboard(
    page = 1,
    limit = 50,
    period = "A"
): Promise<LeaderboardResponse> {
    return apiRequest<LeaderboardResponse>(
        `/leaderboard/users?page=${page}&limit=${limit}&period=${period}`
    );
}

export async function getBrandLeaderboard(period = "A"): Promise<{
    success: boolean;
    data: BrandLeaderboardEntry[];
    total: number;
}> {
    return apiRequest<{ success: boolean; data: BrandLeaderboardEntry[]; total: number }>(
        `/leaderboard/brands?period=${period}`
    );
}

export async function getEventLeaderboard(period = "A"): Promise<any> {
    return apiRequest<any>(`/leaderboard/events?period=${period}`);
}
