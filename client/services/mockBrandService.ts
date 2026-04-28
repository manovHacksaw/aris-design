/**
 * Mock Brand Service
 *
 * Simulates a real API for brand dashboard data (events, analytics, notifications, rewards).
 * Replace this file with a real API client when backend is ready.
 * UI components require NO changes when swapping to real API.
 */

import type {
    BrandEvent,
    BrandAnalytics,
    BrandNotification,
    RewardClaim,
    ApiResponse,
    Brand,
} from '@/types/api';

// ─── Simulated network delay ──────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Brand Profile ────────────────────────────────────────────────────────────

/**
 * Returns the current brand's profile.
 * Maps to GET /api/brand/me
 */
export async function getBrandProfile(): Promise<Brand & { stats: Record<string, number> }> {
    await delay(200);
    const { default: data } = await import('@/mock/brand.json');
    return data as Brand & { stats: Record<string, number> };
}

// ─── Brand Events ─────────────────────────────────────────────────────────────

/**
 * Returns paginated events created by the brand.
 * Maps to GET /api/brand/events
 */
export async function getBrandEvents(page = 1): Promise<ApiResponse<BrandEvent[]>> {
    await delay(300);
    const { default: data } = await import('@/mock/brandEvents.json');

    return {
        data: data.data.map((e) => ({
            ...e,
            eventType: e.eventType as BrandEvent['eventType'],
            status: e.status as BrandEvent['status'],
            blockchainStatus: e.blockchainStatus as BrandEvent['blockchainStatus'],
        })),
        meta: { ...data.meta, page },
    };
}

// ─── Brand Analytics ─────────────────────────────────────────────────────────

/**
 * Returns analytics data for the brand dashboard charts.
 * Maps to GET /api/brand/analytics
 */
export async function getBrandAnalytics(period = 'last_7_days'): Promise<BrandAnalytics> {
    await delay(400);
    const { default: data } = await import('@/mock/analytics.json');
    return { ...data.data, period } as BrandAnalytics;
}

// ─── Brand Notifications ──────────────────────────────────────────────────────

/**
 * Returns notifications/alerts for the brand dashboard.
 * Maps to GET /api/brand/notifications
 */
export async function getBrandNotifications(): Promise<BrandNotification[]> {
    await delay(200);
    const { default: data } = await import('@/mock/brandNotifications.json');
    return data.data.map((n) => ({
        ...n,
        type: n.type as BrandNotification['type'],
    }));
}

// ─── Reward Claims ────────────────────────────────────────────────────────────

/**
 * Returns reward claim history and pending claims.
 * Maps to GET /api/rewards
 */
export async function getRewardClaims(page = 1): Promise<ApiResponse<RewardClaim[]>> {
    await delay(300);
    const { default: data } = await import('@/mock/rewards.json');

    return {
        data: data.data.map((r) => ({
            ...r,
            claimType: r.claimType as RewardClaim['claimType'],
            status: r.status as RewardClaim['status'],
        })),
        meta: { ...(data.meta as { total: number; page: number; pageSize: number; hasMore: boolean }), page },
    };
}
