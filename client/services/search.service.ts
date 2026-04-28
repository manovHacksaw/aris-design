import { apiRequest } from './api';

export interface UserSearchResult {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    xp: number;
    isOnboarded: boolean;
    createdAt: string;
}

export interface BrandSearchResult {
    id: string;
    name: string;
    tagline: string | null;
    description: string | null;
    logoCid: string | null;
    categories: string[];
    websiteUrl: string | null;
    socialLinks: any;
    createdAt: string;
    _count: { subscriptions: number };
}

export interface EventSearchResult {
    id: string;
    title: string;
    imageCid: string | null;
    status: string;
    brand?: {
        id: string;
        name: string;
        logoCid: string | null;
    };
    imageUrls?: {
        thumbnail: string;
        medium: string;
        large: string;
        full: string;
    };
}

export interface BrandLeaderboardItem {
    id: string;
    rank: number;
    name: string;
    avatar: string | null;
    bio?: string | null;
    artMinted: number;
    participants: number;
}

export async function searchUsers(
    query: string,
    limit = 10
): Promise<{ success: boolean; results: UserSearchResult[]; count: number }> {
    return apiRequest<{ success: boolean; results: UserSearchResult[]; count: number }>(
        `/search/users?q=${encodeURIComponent(query)}&limit=${limit}`
    );
}

export async function searchBrands(
    query: string,
    limit = 10
): Promise<{ success: boolean; results: BrandSearchResult[]; count: number }> {
    return apiRequest<{ success: boolean; results: BrandSearchResult[]; count: number }>(
        `/search/brands?q=${encodeURIComponent(query)}&limit=${limit}`
    );
}

export async function searchEvents(
    query: string,
    limit = 10
): Promise<{ success: boolean; results: EventSearchResult[]; count: number }> {
    return apiRequest<{ success: boolean; results: EventSearchResult[]; count: number }>(
        `/search/events?q=${encodeURIComponent(query)}&limit=${limit}`
    );
}

export async function searchAll(
    query: string,
    limit = 10
): Promise<{
    success: boolean;
    results: {
        users: UserSearchResult[];
        brands: BrandSearchResult[];
        events: EventSearchResult[];
    };
    count: {
        users: number;
        brands: number;
        events: number;
        total: number;
    };
}> {
    return apiRequest(`/search/all?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function getFeaturedBrands(
    limit = 10
): Promise<{ success: boolean; data: BrandLeaderboardItem[]; total: number }> {
    const response = await apiRequest<{ success: boolean; data: BrandLeaderboardItem[]; total: number }>(
        '/leaderboard/brands'
    );
    if (response.data && response.data.length > limit) {
        return { ...response, data: response.data.slice(0, limit) };
    }
    return response;
}

export async function getUserByUsername(
    username: string
): Promise<{ success: boolean; user: UserSearchResult & { socialLinks: any; preferredBrands: string[]; preferredCategories: string[]; _count: { followers: number; following: number } } }> {
    return apiRequest(`/search/user/${encodeURIComponent(username)}`);
}

export async function getBrandByIdentifier(
    identifier: string
): Promise<{ success: boolean; brand: BrandSearchResult }> {
    return apiRequest(`/search/brand/${encodeURIComponent(identifier)}`);
}
