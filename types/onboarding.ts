export type OnboardingIntent = 'voter' | 'creator' | 'explorer' | 'all';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface OnboardingProfile {
    displayName: string;
    username: string;
    avatar: string | null;
    bio: string;
    gender: string;
    dateOfBirth: string;
}

export interface OnboardingData {
    intent: OnboardingIntent | null;
    profile: OnboardingProfile;
    preferredCategories: string[];
    preferredBrands: string[];
    goals: string[];
    walletAddress: string | null;
    walletSkipped: boolean;
    isOnboarded: boolean;
}

export const CATEGORIES = [
    { id: 'art', label: 'Art' },
    { id: 'fashion', label: 'Fashion' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'tech', label: 'Tech' },
    { id: 'music', label: 'Music' },
    { id: 'photography', label: 'Photography' },
    { id: 'memes', label: 'Memes' },
    { id: 'other', label: 'Other' },
] as const;

export const BRANDS = [
    { id: 'nike', name: 'Nike', avatar: 'https://ui-avatars.com/api/?name=Nike&background=000&color=fff' },
    { id: 'spotify', name: 'Spotify', avatar: 'https://ui-avatars.com/api/?name=Spotify&background=1DB954&color=fff' },
    { id: 'coca-cola', name: 'Coca Cola', avatar: 'https://ui-avatars.com/api/?name=CC&background=E61E2B&color=fff' },
    { id: 'meta', name: 'Meta', avatar: 'https://ui-avatars.com/api/?name=Meta&background=0668E1&color=fff' },
    { id: 'adidas', name: 'Adidas', avatar: 'https://ui-avatars.com/api/?name=Adidas&background=000&color=fff' },
    { id: 'apple', name: 'Apple', avatar: 'https://ui-avatars.com/api/?name=Apple&background=555&color=fff' },
    { id: 'samsung', name: 'Samsung', avatar: 'https://ui-avatars.com/api/?name=Samsung&background=1428A0&color=fff' },
    { id: 'redbull', name: 'Red Bull', avatar: 'https://ui-avatars.com/api/?name=RB&background=DB0A40&color=fff' },
] as const;

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
    intent: null,
    profile: {
        displayName: '',
        username: '',
        avatar: null,
        bio: '',
        gender: '',
        dateOfBirth: '',
    },
    preferredCategories: [],
    preferredBrands: [],
    goals: [],
    walletAddress: null,
    walletSkipped: false,
    isOnboarded: false,
};
