import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ExploreEventsResponse {
    trending: any[];
    closed: any[];
    domains: { domain: string, events: any[] }[];
    allRanked: any[];
}

export const getExploreEvents = async (options?: { category?: string, search?: string, sort?: string, status?: string, type?: string }): Promise<ExploreEventsResponse> => {
    try {
        const query = new URLSearchParams();
        if (options?.category) query.append('category', options.category);
        if (options?.search) query.append('search', options.search);
        if (options?.sort) query.append('sort', options.sort);
        if (options?.status) query.append('status', options.status);
        if (options?.type) query.append('type', options.type);
        
        const queryString = query.toString() ? `?${query.toString()}` : '';
        const response = await axios.get(`${API_URL}/explore/events${queryString}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch explore events:', error);
        throw error;
    }
};

export const getExploreBrands = async (): Promise<any[]> => {
    try {
        const response = await axios.get(`${API_URL}/explore/brands`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch explore brands:', error);
        throw error;
    }
};

export const getExploreCreators = async (): Promise<any[]> => {
    try {
        const response = await axios.get(`${API_URL}/explore/creators`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch explore creators:', error);
        throw error;
    }
};

export const getExploreContent = async (): Promise<any[]> => {
    try {
        const response = await axios.get(`${API_URL}/explore/content`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch explore content:', error);
        throw error;
    }
};
