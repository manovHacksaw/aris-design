import { apiRequest } from './api';

export interface Submission {
    id: string;
    content?: string;
    imageCid?: string;
    imageUrl?: string;
    videoCid?: string;
    eventId: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        username?: string;
        displayName?: string;
        avatarUrl?: string;
    };
    _count?: { votes: number };
    votes?: Array<{ id: string; userId: string }>;
    rank?: number;
}

export interface CreateSubmissionRequest {
    eventId: string;
    content?: string;
    imageCid?: string;
    imageUrl?: string;
    videoCid?: string;
    caption?: string;
}

export interface UpdateSubmissionRequest {
    content?: string;
    imageCid?: string;
    imageUrl?: string;
    videoCid?: string;
    caption?: string;
}

export interface SubmissionListResponse {
    success: boolean;
    submissions: Submission[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface SubmissionResponse {
    success: boolean;
    message?: string;
    submission?: Submission;
    error?: string;
}

export interface SubmissionFilters {
    page?: number;
    limit?: number;
    sortBy?: 'recent' | 'votes' | 'rank';
}

export async function getEventSubmissions(
    eventId: string,
    filters?: SubmissionFilters
): Promise<SubmissionListResponse> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    const queryString = params.toString();
    return apiRequest<SubmissionListResponse>(
        queryString ? `/events/${eventId}/submissions?${queryString}` : `/events/${eventId}/submissions`
    );
}

export async function getSubmissionById(id: string): Promise<Submission> {
    const response = await apiRequest<SubmissionResponse>(`/submissions/${id}`);
    if (!response.success || !response.submission) {
        throw new Error(response.error || 'Submission not found');
    }
    return response.submission;
}

export async function createSubmission(data: CreateSubmissionRequest): Promise<Submission> {
    const response = await apiRequest<SubmissionResponse>(
        `/events/${data.eventId}/submissions`,
        {
            method: 'POST',
            body: JSON.stringify({
                imageCid: data.imageCid,
                imageUrl: data.imageUrl,
                videoCid: data.videoCid,
                caption: data.caption ?? data.content,
            }),
        }
    );
    if (!response.success || !response.submission) {
        throw new Error(response.error || 'Failed to create submission');
    }
    return response.submission;
}

export async function deleteSubmission(eventId: string, submissionId: string): Promise<void> {
    const response = await apiRequest<{ success: boolean; message: string }>(
        `/events/${eventId}/submissions/${submissionId}`,
        { method: 'DELETE' }
    );
    if (!response.success) throw new Error('Failed to delete submission');
}

export async function voteOnSubmission(eventId: string, submissionId: string): Promise<void> {
    const response = await apiRequest<{ success: boolean; message: string }>(
        `/events/${eventId}/submissions/${submissionId}/vote`,
        { method: 'POST' }
    );
    if (!response.success) throw new Error('Failed to vote on submission');
}

export async function removeVoteFromSubmission(eventId: string, submissionId: string): Promise<void> {
    const response = await apiRequest<{ success: boolean; message: string }>(
        `/events/${eventId}/submissions/${submissionId}/vote`,
        { method: 'DELETE' }
    );
    if (!response.success) throw new Error('Failed to remove vote');
}

export async function getMySubmission(eventId: string): Promise<Submission | null> {
    const response = await apiRequest<SubmissionResponse>(`/events/${eventId}/submissions/me`);
    if (!response.success) return null;
    return response.submission || null;
}

export async function updateSubmission(
    eventId: string,
    submissionId: string,
    data: UpdateSubmissionRequest
): Promise<Submission> {
    const response = await apiRequest<SubmissionResponse>(
        `/events/${eventId}/submissions/${submissionId}`,
        { method: 'PUT', body: JSON.stringify(data) }
    );
    if (!response.success || !response.submission) {
        throw new Error(response.error || 'Failed to update submission');
    }
    return response.submission;
}
