import { apiRequest } from './api';

// ==================== TYPES ====================

export type EventType = 'post_and_vote' | 'vote_only';

export type EventStatus = 'draft' | 'scheduled' | 'posting' | 'voting' | 'completed' | 'cancelled';

export interface Event {
    id: string;
    title: string;
    description?: string;
    category?: string;
    eventType: EventType;
    status: EventStatus;
    cancelReason?: string;
    cancelledAt?: string;
    startTime: string;
    endTime: string;
    postingStart?: string;
    postingEnd?: string;
    imageCid?: string;
    imageUrl?: string;
    samples?: string[];
    sampleUrls?: { cid: string; urls: { thumbnail: string; medium: string; large: string; full: string } }[];
    allowSubmissions: boolean;
    allowVoting: boolean;
    autoTransition: boolean;
    nextPhaseAt?: string;
    maxProposalVotes?: number;
    capacity?: number;
    baseReward?: number;
    topReward?: number;
    leaderboardPool?: number;
    isVerified: boolean;
    brandId: string;
    createdAt: string;
    updatedAt: string;
    onChainEventId?: string;
    poolTxHash?: string;
    preferredGender?: string;
    ageGroup?: string;
    
    // Hard Filter Fields
    ageRestriction?: number;
    genderRestriction?: string;
    intendedCategories?: string[];

    tagline?: string;
    regions?: string[];
    submissionGuidelines?: string;
    totalParticipants?: number;
    participantAvatars?: Array<{ id: string; avatarUrl: string | null }>;
    brand?: {
        id: string;
        name: string;
        logoCid?: string;
        logoUrl?: string;
    };
    eventAnalytics?: {
        totalViews: number;
        totalSubmissions: number;
        totalVotes: number;
        uniqueParticipants: number;
    };
    _count?: {
        submissions: number;
        votes: number;
    };
    submissions?: Array<{
        id: string;
        content?: string;
        imageCid?: string;
        videoCid?: string;
        userId: string;
        eventId: string;
        createdAt: string;
        updatedAt: string;
        user?: {
            id: string;
            username?: string;
            name?: string;
            profilePicCid?: string;
        };
        _count?: { votes: number };
        rank?: number;
    }>;
    proposals?: Array<{
        id: string;
        type: 'IMAGE' | 'TEXT';
        title: string;
        content?: string;
        imageCid?: string;
        imageUrl?: string;
        order: number;
        voteCount: number;
        finalRank?: number;
    }>;
    hasVoted?: boolean;
    userVotes?: any[];
    hasSubmitted?: boolean;
    userSubmission?: any;
}

export interface CreateEventRequest {
    id?: string;
    title: string;
    description?: string;
    category?: string;
    eventType: EventType;
    startTime: string;
    endTime: string;
    postingStart?: string;
    postingEnd?: string;
    imageCid?: string;
    imageUrl?: string;
    samples?: string[];
    allowSubmissions?: boolean;
    allowVoting?: boolean;
    autoTransition?: boolean;
    nextPhaseAt?: string;
    baseReward?: number;
    topReward?: number;
    leaderboardPool?: number;
    capacity?: number;
    proposals?: Array<{
        type: 'IMAGE' | 'TEXT';
        title: string;
        content?: string;
        imageCid?: string;
        order?: number;
    }>;
    preferredGender?: string;
    ageGroup?: string;
    tagline?: string;
    participantInstructions?: string;
    submissionGuidelines?: string;
    moderationRules?: string;
    hashtags?: string[];
    regions?: string[];
    
    // Filter fields
    ageRestriction?: number;
    genderRestriction?: string;
    intendedCategories?: string[];

    onChainEventId?: string;
    poolTransactionHash?: string;
    blockchainStatus?: string;
    useRefundBalance?: number;
}

export interface UpdateEventRequest {
    title?: string;
    description?: string;
    category?: string;
    eventType?: EventType;
    startTime?: string;
    endTime?: string;
    postingStart?: string;
    postingEnd?: string;
    imageCid?: string;
    imageUrl?: string;
    allowSubmissions?: boolean;
    allowVoting?: boolean;
    autoTransition?: boolean;
    nextPhaseAt?: string;
    preferredGender?: string;
    ageGroup?: string;
    ageRestriction?: number;
    genderRestriction?: string;
    intendedCategories?: string[];
}

export interface EventFilters {
    status?: EventStatus;
    eventType?: EventType;
    brandId?: string;
    category?: string;
    page?: number;
    limit?: number;
}

export interface EventListResponse {
    success: boolean;
    events: Event[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface EventResponse {
    success: boolean;
    message?: string;
    event?: Event;
    error?: string;
    lockedFields?: string[];
}

export interface BrandStats {
    totalEvents: number;
    activeEvents: number;
    completedEvents: number;
    totalSubmissions: number;
    totalVotes: number;
    totalEngagement: number;
}

// ==================== API FUNCTIONS ====================

export async function createEvent(data: CreateEventRequest): Promise<Event> {
    const response = await apiRequest<EventResponse>('/events', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!response.success || !response.event) {
        const errorMessage = response.message || response.error || 'Failed to create event';
        const error = new Error(errorMessage);
        (error as any).data = response;
        throw error;
    }
    return response.event;
}

export async function getEvents(filters?: EventFilters): Promise<EventListResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.eventType) params.append('eventType', filters.eventType);
    if (filters?.brandId) params.append('brandId', filters.brandId);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const queryString = params.toString();
    return apiRequest<EventListResponse>(queryString ? `/events?${queryString}` : '/events');
}

export interface GetEventByIdOptions {
    noCache?: boolean;
    skipAuth?: boolean;
}

export async function getEventById(
    id: string,
    options?: boolean | GetEventByIdOptions
): Promise<Event> {
    const resolvedOptions: GetEventByIdOptions =
        typeof options === "boolean" ? { noCache: options } : (options || {});

    const response = await apiRequest<EventResponse>(`/events/${id}`, resolvedOptions);
    if (!response.success || !response.event) {
        throw new Error(response.error || 'Event not found');
    }
    if (response.lockedFields) {
        (response.event as any).lockedFields = response.lockedFields;
    }
    return response.event;
}

export async function getBrandEvents(status?: EventStatus): Promise<Event[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiRequest<{ success: boolean; events: Event[] }>(
        `/events/brand/me${params}`
    );
    if (!response.success) throw new Error('Failed to fetch brand events');
    return response.events;
}

export async function getEventsVotedByUser(userId: string): Promise<Event[]> {
    const response = await apiRequest<{ success: boolean; events: Event[] }>(
        `/events/user/${userId}/voted`
    );
    if (!response.success) throw new Error('Failed to fetch voted events');
    return response.events;
}

export async function updateEvent(id: string, data: UpdateEventRequest): Promise<Event> {
    const response = await apiRequest<EventResponse>(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!response.success || !response.event) {
        throw new Error(response.error || 'Failed to update event');
    }
    return response.event;
}

export async function updateEventStatus(id: string, status: EventStatus): Promise<Event> {
    const response = await apiRequest<EventResponse>(`/events/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    if (!response.success || !response.event) {
        throw new Error(response.error || 'Failed to update event status');
    }
    return response.event;
}

export async function updateBlockchainStatus(id: string, txHash: string, onChainEventId: string): Promise<Event> {
    const response = await apiRequest<EventResponse>(`/events/${id}/blockchain`, {
        method: 'PATCH',
        body: JSON.stringify({ txHash, onChainEventId }),
    });
    if (!response.success || !response.event) {
        throw new Error(response.error || 'Failed to update blockchain status');
    }
    return response.event;
}

export async function publishEvent(id: string): Promise<Event> {
    const response = await apiRequest<EventResponse>(`/events/${id}/publish`, { method: 'POST' });
    if (!response.success || !response.event) {
        throw new Error(response.error || 'Failed to publish event');
    }
    return response.event;
}

export async function deleteEvent(id: string): Promise<void> {
    const response = await apiRequest<{ success: boolean; message: string }>(
        `/events/${id}`, { method: 'DELETE' }
    );
    if (!response.success) throw new Error('Failed to delete event');
}

export async function cancelEvent(id: string): Promise<Event> {
    const response = await apiRequest<EventResponse>(`/events/${id}/cancel`, { method: 'POST' });
    if (!response.success || !response.event) {
        throw new Error(response.error || 'Failed to cancel event');
    }
    return response.event;
}

export async function stopEvent(id: string): Promise<Event> {
    const response = await apiRequest<EventResponse>(`/events/${id}/stop`, { method: 'POST' });
    if (!response.success || !response.event) {
        throw new Error(response.error || 'Failed to stop event');
    }
    return response.event;
}

export async function getDetailedEventAnalytics(id: string): Promise<any> {
    return apiRequest<any>(`/analytics/events/${id}/detailed`);
}

export async function getEventParticipants(eventId: string): Promise<Array<{
    id: string;
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    profilePicCid?: string | null;
}>> {
    const response = await apiRequest<{ success: boolean; participants: any[] }>(
        `/events/${eventId}/participants`
    );
    if (!response.success) throw new Error('Failed to fetch participants');
    return response.participants;
}

export async function getVoterBreakdown(eventId: string): Promise<Record<string, { id: string; displayName: string | null; username: string | null; avatarUrl: string | null }[]>> {
    const response = await apiRequest<{ success: boolean; breakdown: Record<string, any[]> }>(
        `/events/${eventId}/voter-breakdown`
    );
    if (!response.success) throw new Error('Failed to fetch voter breakdown');
    return response.breakdown;
}

export async function getMyVotes(eventId: string): Promise<any[]> {
    const response = await apiRequest<{ success: boolean; votes: any[] }>(
        `/events/${eventId}/my-votes`
    );
    if (!response.success) throw new Error('Failed to fetch my votes');
    return response.votes;
}

export async function voteForProposals(eventId: string, proposalIds: string[]): Promise<any> {
    const response = await apiRequest<{ success: boolean; votes: any[] }>(
        `/events/${eventId}/proposals/vote`,
        { method: 'POST', body: JSON.stringify({ proposalIds }) }
    );
    if (!response.success) throw new Error('Failed to cast votes');
    return response.votes;
}

export async function voteForSubmission(eventId: string, submissionId: string): Promise<any> {
    const response = await apiRequest<{ success: boolean; vote: any }>(
        `/events/${eventId}/submissions/${submissionId}/vote`,
        { method: 'POST' }
    );
    if (!response.success) throw new Error('Failed to cast vote');
    return response.vote;
}

// ==================== UTILITIES ====================

export function calculateBrandStats(events: Event[]): BrandStats {
    const stats: BrandStats = {
        totalEvents: events.length,
        activeEvents: 0,
        completedEvents: 0,
        totalSubmissions: 0,
        totalVotes: 0,
        totalEngagement: 0,
    };
    events.forEach((event) => {
        if (event.status === 'posting' || event.status === 'voting') stats.activeEvents++;
        if (event.status === 'completed') stats.completedEvents++;
        if (event._count) {
            stats.totalSubmissions += event._count.submissions || 0;
            stats.totalVotes += event._count.votes || 0;
        }
        if (event.eventAnalytics) {
            stats.totalEngagement += event.eventAnalytics.uniqueParticipants || 0;
        }
    });
    return stats;
}

export function getEventStatusDisplay(status: EventStatus): { label: string; color: string; icon: string } {
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
        draft: { label: 'Draft', color: 'gray', icon: '📝' },
        scheduled: { label: 'Scheduled', color: 'yellow', icon: '📅' },
        posting: { label: 'Posting', color: 'blue', icon: '📸' },
        voting: { label: 'Voting', color: 'purple', icon: '🗳️' },
        completed: { label: 'Completed', color: 'green', icon: '✅' },
        cancelled: { label: 'Cancelled', color: 'red', icon: '❌' },
    };
    return (statusMap as any)[status] || statusMap.draft;
}

export function isEventActive(event: Event): boolean {
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
}

export function getEventPhase(event: Event): 'posting' | 'voting' | 'ended' {
    if (event.eventType !== 'post_and_vote') {
        return event.status === 'completed' ? 'ended' : 'voting';
    }
    const now = new Date();
    if (event.postingEnd && now <= new Date(event.postingEnd)) return 'posting';
    if (now <= new Date(event.endTime)) return 'voting';
    return 'ended';
}
