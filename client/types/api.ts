// API / Prisma-aligned TypeScript interfaces
// These mirror the backend Prisma schema exactly.
// Service layer transforms these into UI-ready types where needed.

export interface PaginationMeta {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface ApiResponse<T> {
    data: T;
    meta?: PaginationMeta;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export type EventType = 'vote' | 'post';
export type EventStatus = 'draft' | 'scheduled' | 'live' | 'ending_soon' | 'ended';
export type BlockchainStatus = 'pending' | 'confirmed' | 'failed';
export type ClaimType = 'participation' | 'winner' | 'leaderboard';
export type RewardStatus = 'pending' | 'claimable' | 'claimed' | 'expired';
export type NotificationType = 'reward' | 'event' | 'social' | 'system';
export type UserEventState = 'not_participated' | 'participated' | 'won';
export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// ─── Brand ────────────────────────────────────────────────────────────────────

export interface Brand {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    verified: boolean;
}

// ─── Event (Prisma-aligned) ───────────────────────────────────────────────────

export interface ApiEvent {
    id: string;
    title: string;
    description: string;
    eventType: EventType;
    status: EventStatus;
    startTime: string;       // ISO 8601
    endTime: string;         // ISO 8601
    capacity: number | null;
    baseReward: number;      // USD (e.g. 0.05)
    topReward: number | null;
    leaderboardPool: number; // total pool in USD
    blockchainStatus: BlockchainStatus;
    brandId: string;
    brand: Brand;
    totalVotes: number;
    totalSubmissions: number;
    coverImage: string;
    progress?: number;       // 0-100, for vote events
    userState?: UserEventState | null;
}

// ─── Notification (Prisma-aligned) ───────────────────────────────────────────

export interface ApiNotification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    createdAt: string; // ISO 8601
    metadata?: Record<string, unknown>;
}

// ─── Reward Claim (Prisma-aligned) ───────────────────────────────────────────

export interface RewardClaim {
    poolId: string;
    eventId: string;
    claimType: ClaimType;
    baseAmount: number;
    finalAmount: number;
    status: RewardStatus;
    transactionHash: string | null;
    claimedAt: string | null;
    event?: {
        id: string;
        title: string;
        coverImage: string;
    };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    displayName: string;
    avatar: string;
    xp: number;
    streak: number;
    totalVotesReceived: number;
    votesCast: number; // Added field
    totalRewardsEarned: number;
    challengesWon: number;
    badges: string[];
    isCurrentUser?: boolean;
}

export interface BrandLeaderboardEntry {
    rank: number;
    brandId: string;
    name: string;
    avatar: string;
    campaignsCount: number;
    totalPrizePool: number;
    totalEngagements: number;
}

export interface EventLeaderboardEntry {
    rank: number;
    eventId: string;
    title: string;
    coverImage: string;
    participants: number;
    totalVotes: number;
    prizePool: number;
}

export interface ContentLeaderboardEntry {
    rank: number;
    contentId: string;
    title: string;
    coverImage: string;
    creatorName: string;
    votes: number;
    earned: number;
}

export interface LeaderboardResponse {
    topUsers: LeaderboardEntry[]; // top 3 for podium
    data: LeaderboardEntry[];     // rank 4+ for table
    meta: PaginationMeta;
}

// ─── User Stats ───────────────────────────────────────────────────────────────

export interface UserStats {
    userId: string;
    streak: number;
    rankLabel: string;        // e.g. "Bronze IV"
    rankTier: RankTier;
    rankProgress: number;     // 0-100 percentage to next tier
    weeklyXp: number[];       // 7 values (Mon-Sun), 0-100 normalized
    totalXp: number;
    nextTierLabel: string;    // e.g. "Silver"
}

// ─── Friend / User Activity ───────────────────────────────────────────────────

export interface FriendActivity {
    id: string;
    friendId: string;
    friendName: string;
    friendAvatar: string;
    actionType: 'submitted' | 'won' | 'voted' | 'following';
    actionText: string;
    eventId: string;
    eventTitle: string;
    eventImage: string;
    createdAt: string; // ISO 8601
}

// ─── Trending Event ───────────────────────────────────────────────────────────

export interface TrendingEvent {
    id: string;
    title: string;
    description: string;
    eventType: EventType;
    status: 'live' | 'ending_soon';
    leaderboardPool: number;
    endTime: string;         // ISO 8601
    timeRemaining: string;   // pre-computed label e.g. "2d 14h"
    totalParticipants: number;
    coverImage: string;
    brand: Brand;
}

// ─── Widget types (sidebar) ───────────────────────────────────────────────────

export interface HotChallenge {
    id: string;
    eventId: string;
    title: string;
    brandName: string;
    reward: string;          // formatted e.g. "$500"
    coverImage: string;
}

export interface RecentSubmission {
    id: string;
    userId: string;
    username: string;
    eventTitle: string;
    coverImage: string;
    createdAt: string;       // ISO 8601 or relative e.g. "2m ago"
    isActive?: boolean;
}

// ─── Brand Analytics ─────────────────────────────────────────────────────────

export interface BrandAnalytics {
    brandId: string;
    period: string;
    stats: {
        totalViews: number;
        viewsChange: number;        // percentage
        engagementRate: number;     // percentage
        engagementChange: number;
        totalSpend: number;         // USD
        spendChange: number;        // percentage
        conversions: number;
        conversionsChange: number;
    };
    campaignPerformance: number[];  // 12 data points (0-100)
    demographics: {
        label: string;
        value: number;              // percentage
    }[];
}

// ─── Brand Event ─────────────────────────────────────────────────────────────

export interface BrandEvent {
    id: string;
    title: string;
    eventType: EventType;
    status: EventStatus;
    leaderboardPool: number;
    totalSubmissions: number;
    totalVotes: number;
    startTime: string;
    endTime: string;
    blockchainStatus: BlockchainStatus;
}

// ─── Brand Notification ───────────────────────────────────────────────────────

export interface BrandNotification {
    id: string;
    text: string;
    type: 'warning' | 'info' | 'alert';
    createdAt: string; // ISO 8601 or relative label
}

// ─── Social Post ─────────────────────────────────────────────────────────────

export interface SocialPost {
    id: string;
    userId: string;
    username: string;
    userAvatar?: string;
    coverImage: string;
    caption: string;
    reward: number;
    votes: number;
    createdAt: string; // ISO 8601
}
