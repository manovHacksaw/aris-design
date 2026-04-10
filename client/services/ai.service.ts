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

export interface AiEventSuggestion {
    title: string;
    description: string;
    estimated_duration: string;
    hypothesis: string;
    estimated_votes: string;
    voting_options?: Array<{ title: string; content: string }>;
}

export async function generateAiEventDetails(params: {
    motive: string;
    brandName?: string;
    brandBio?: string;
    eventType?: 'vote' | 'post';
    decisionDomain?: string;
    targetMarket?: string;
    budget?: string;
    count?: number;
    voteOptions?: number;
}): Promise<{ success: boolean; suggestions?: AiEventSuggestion[]; error?: string }> {
    try {
        return await apiRequest<{ success: boolean; suggestions: AiEventSuggestion[] }>(
            '/ai/generate-event-details',
            {
                method: 'POST',
                body: JSON.stringify(params),
            }
        );
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Failed to generate event details',
        };
    }
}


export async function generateAiBannerPrompts(params: {
    title: string;
    description?: string;
    theme?: string;
    decisionDomain?: string;
    targetMarket?: string;
    brandIdentity?: string;
    count?: number;
}): Promise<{ success: boolean; prompts?: string[]; error?: string }> {
    try {
        return await apiRequest<{ success: boolean; prompts: string[] }>(
            '/ai/generate-banner-prompts',
            {
                method: 'POST',
                body: JSON.stringify(params),
            }
        );
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Failed to generate banner prompts',
        };
    }
}

export async function generateAiVotingOptionPrompts(params: {
    eventTitle: string;
    eventDescription?: string;
    decisionDomain?: string;
    targetMarket?: string;
    brandIdentity?: string;
    contentTitle?: string;
}): Promise<{ success: boolean; prompts?: string[]; error?: string }> {
    try {
        return await apiRequest<{ success: boolean; prompts: string[] }>(
            '/ai/generate-voting-option-prompts',
            {
                method: 'POST',
                body: JSON.stringify(params),
            }
        );
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Failed to generate voting option prompts',
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
