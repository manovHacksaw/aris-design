import { apiRequest } from './api';

export interface AiResponse {
    success: boolean;
    refinedPrompt?: string;
    cid?: string;
    url?: string;
    message?: string;
    error?: string;
}

export async function generateAiImage(prompt: string): Promise<AiResponse> {
    try {
        return await apiRequest<AiResponse>('/ai/generate-image', {
            method: 'POST',
            body: JSON.stringify({ prompt }),
        });
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Failed to generate image',
        };
    }
}

export async function refineAiPrompt(prompt: string): Promise<AiResponse> {
    try {
        return await apiRequest<AiResponse>('/ai/refine-prompt', {
            method: 'POST',
            body: JSON.stringify({ prompt }),
        });
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Failed to refine prompt',
        };
    }
}

export async function generateTagline(title: string, description?: string): Promise<{ success: boolean; tagline?: string; error?: string }> {
    try {
        return await apiRequest<{ success: boolean; tagline: string }>(
            '/ai/generate-tagline',
            {
                method: 'POST',
                body: JSON.stringify({ title, description }),
            }
        );
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Failed to generate tagline',
        };
    }
}

export async function generateAiProposals(params: {
    title: string;
    description: string;
    category: string;
    count?: number;
}): Promise<AiResponse & { proposals?: Array<{ title: string; content: string }> }> {
    try {
        return await apiRequest<AiResponse & { proposals?: Array<{ title: string; content: string }> }>(
            '/ai/generate-proposals',
            {
                method: 'POST',
                body: JSON.stringify(params),
            }
        );
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Failed to generate proposals',
        };
    }
}
