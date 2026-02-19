/**
 * Mock Event Service
 *
 * Simulates a real API for event-related data.
 * Replace this file with a real API client (e.g. brandApiService) when backend is ready.
 * UI components that call these functions require NO changes when swapping to real API.
 */

import type {
    ApiEvent,
    TrendingEvent,
    HotChallenge,
    RecentSubmission,
    SocialPost,
    ApiResponse,
} from '@/types/api';

// ─── Simulated network delay ──────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTimeRemaining(endTime: string, status: string): string {
    if (status === 'ended') return 'Ended';
    if (status === 'draft') return 'Draft';

    const now = Date.now();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m left`;
}

// ─── Events ───────────────────────────────────────────────────────────────────

/**
 * Returns paginated list of events for the main feed.
 * Maps to GET /api/events
 */
export async function getEvents(
    page = 1,
    _pageSize = 6
): Promise<ApiResponse<ApiEvent[]>> {
    await delay(300);

    const { default: data } = await import('@/mock/events.json');

    // Enrich with computed timeRemaining so UI does not need to parse dates
    const enriched = data.data.map((event) => ({
        ...event,
        eventType: event.eventType as ApiEvent['eventType'],
        status: event.status as ApiEvent['status'],
        blockchainStatus: event.blockchainStatus as ApiEvent['blockchainStatus'],
        userState: event.userState as ApiEvent['userState'],
        timeRemaining: computeTimeRemaining(event.endTime, event.status),
    }));

    return {
        data: enriched,
        meta: { ...data.meta, page },
    };
}

/**
 * Returns a single event by ID.
 * Maps to GET /api/events/:id
 */
export async function getEventById(id: string): Promise<ApiEvent | null> {
    await delay(250);

    const { default: data } = await import('@/mock/events.json');
    const event = data.data.find((e) => e.id === id);
    if (!event) return null;

    return {
        ...event,
        eventType: event.eventType as ApiEvent['eventType'],
        status: event.status as ApiEvent['status'],
        blockchainStatus: event.blockchainStatus as ApiEvent['blockchainStatus'],
        userState: event.userState as ApiEvent['userState'],
        timeRemaining: computeTimeRemaining(event.endTime, event.status),
    };
}

/**
 * Returns trending events for the carousel.
 * Maps to GET /api/events/trending
 */
export async function getTrendingEvents(): Promise<ApiResponse<TrendingEvent[]>> {
    await delay(200);

    const { default: data } = await import('@/mock/trending.json');

    const enriched = data.data.map((event) => ({
        ...event,
        eventType: event.eventType as TrendingEvent['eventType'],
        status: event.status as TrendingEvent['status'],
        timeRemaining: computeTimeRemaining(event.endTime, event.status),
    }));

    return { data: enriched };
}

/**
 * Returns hot challenges for the right-sidebar widget.
 * Maps to GET /api/events/hot
 */
export async function getHotChallenges(): Promise<HotChallenge[]> {
    await delay(200);
    const { default: data } = await import('@/mock/widgets.json');
    return data.hotChallenges;
}

/**
 * Returns recent submissions for the right-sidebar widget.
 * Maps to GET /api/submissions/recent
 */
export async function getRecentSubmissions(): Promise<RecentSubmission[]> {
    await delay(150);
    const { default: data } = await import('@/mock/widgets.json');
    return data.recentSubmissions.map((s) => ({
        ...s,
        createdAt: s.createdAt,
    }));
}

/**
 * Returns the social feed for the discover/home feed.
 * Maps to GET /api/feed/social
 */
export async function getSocialFeed(
    page = 1
): Promise<ApiResponse<SocialPost[]>> {
    await delay(300);
    const { default: data } = await import('@/mock/socialFeed.json');
    return { data: data.data, meta: { ...data.meta, page } };
}
