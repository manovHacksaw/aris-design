import { apiRequest } from './api';

export interface UserLeaderboardEntry {
    id: string;
    rank: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    badges?: string[];
    votesCast?: number;
    followers?: number;
}

export interface BrandLeaderboardEntry {
    id: string;
    rank: number;
    name: string;
    avatar: string | null;
    bio?: string | null;
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
    limit = 20
): Promise<LeaderboardResponse> {
    return apiRequest<LeaderboardResponse>(
        `/leaderboard/users?page=${page}&limit=${limit}`
    );
}

export async function getBrandLeaderboard(): Promise<{
    success: boolean;
    data: BrandLeaderboardEntry[];
    total: number;
}> {
    return apiRequest<{ success: boolean; data: BrandLeaderboardEntry[]; total: number }>(
        '/leaderboard/brands'
    );
}

export async function getEventLeaderboard(): Promise<any> {
    return apiRequest<any>('/leaderboard/events');
}
