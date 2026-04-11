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

export interface EventLeaderboardEntry {
    id: string;
    rank: number;
    title: string;
    avatar: string | null;
    imageCid?: string | null;
    imageUrl?: string | null;
    coverImage?: string | null;
    status: string;
    prizePool?: number;
    leaderboardPool?: number;
    participants?: number;
    category?: string | null;
    domain?: string | null;
    brand?: {
        name: string;
        logoCid?: string | null;
    } | null;
    _count?: {
        submissions?: number;
    };
}

interface ListResponse<T> {
    success: boolean;
    data: T[];
    total: number;
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

export async function getBrandLeaderboard(period = "A"): Promise<ListResponse<BrandLeaderboardEntry>> {
    return apiRequest<ListResponse<BrandLeaderboardEntry>>(
        `/leaderboard/brands?period=${period}`
    );
}

export async function getEventLeaderboard(period = "A"): Promise<ListResponse<EventLeaderboardEntry>> {
    return apiRequest<ListResponse<EventLeaderboardEntry>>(`/leaderboard/events?period=${period}`);
}
