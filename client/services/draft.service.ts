import { apiRequest } from './api';

export interface UserDraft {
    id: string;
    userId: string;
    imageUrl?: string | null;
    imageCid?: string | null;
    prompt?: string | null;
    caption?: string | null;
    metadata?: any;
    createdAt: string;
}

export async function saveDraftToBackend(data: {
    imageUrl?: string;
    imageCid?: string;
    prompt?: string;
    caption?: string;
    metadata?: any;
}): Promise<UserDraft> {
    const res = await apiRequest<{ draft: UserDraft }>('/drafts', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.draft;
}

export async function fetchDrafts(): Promise<UserDraft[]> {
    const res = await apiRequest<{ drafts: UserDraft[] }>('/drafts');
    return res.drafts ?? [];
}

export async function deleteDraftFromBackend(id: string): Promise<void> {
    await apiRequest(`/drafts/${id}`, { method: 'DELETE' });
}
