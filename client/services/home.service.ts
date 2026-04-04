import { apiRequest } from './api';

export interface HomeEventsResponse {
    curated: any[];
    voteEvents: any[];
    postEvents: any[];
}

/**
 * Fetch personalized event feed for the Home page.
 * Results are pre-filtered and ranked by the backend (HomeService).
 */
export const getHomeEvents = async (): Promise<HomeEventsResponse> => {
    try {
        const response = await apiRequest<{ success: boolean; data: HomeEventsResponse }>(
            '/feed/home-events'
        );
        return response.data;
    } catch (error) {
        console.error('Failed to fetch home events feed:', error);
        throw error;
    }
};

/**
 * Fetch personalized content feed for the Home page.
 */
export const getHomeContent = async (): Promise<any[]> => {
    try {
        const response = await apiRequest<{ success: boolean; data: any[] }>(
            '/feed/home-content'
        );
        return response.data;
    } catch (error) {
        console.error('Failed to fetch home content feed:', error);
        throw error;
    }
};
