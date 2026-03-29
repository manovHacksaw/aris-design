import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ExploreEventsResponse {
    trending: any[];
    closed: any[];
    domains: { domain: string, events: any[] }[];
}

export const getExploreEvents = async (): Promise<ExploreEventsResponse> => {
    try {
        const response = await axios.get(`${API_URL}/explore/events`);
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

export const getExploreContent = async (): Promise<any[]> => {
    try {
        const response = await axios.get(`${API_URL}/explore/content`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch explore content:', error);
        throw error;
    }
};
