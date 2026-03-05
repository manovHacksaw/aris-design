export type EventMode = 'vote' | 'post';

export type EventStatus = 'upcoming' | 'live' | 'ending_soon' | 'ended';

export type UserEventState = 'not_participated' | 'participated' | 'won';

export type SubmissionStatus = 'eligible' | 'winning' | 'ranked' | 'ended';

export interface EventCreator {
    name: string;
    avatar: string;
    handle: string;
}

export interface EventData {
    id: string;
    mode: EventMode;
    status: EventStatus;
    title: string;
    creator: EventCreator;
    rewardPool: string;
    baseReward: string;
    topReward?: string;
    participationReward?: string;
    participationCount: number;
    timeRemaining: string;
    image: string;
    description: string;
    progress?: number;
    userState?: UserEventState;
}

export interface VoteSubmission {
    id: string;
    creator: EventCreator;
    media: string;
    mediaType: 'image' | 'text' | 'mixed';
    textContent?: string;
    voteCount: number;
    rank?: number;
    isSelected?: boolean;
}

export interface PostSubmission {
    id: string;
    creator: EventCreator;
    media: string;
    textContent?: string;
    voteCount: number;
    status: SubmissionStatus;
    isAiAssisted?: boolean;
    isOwn?: boolean;
    engagementStats: {
        views: number;
        shares: number;
    };
}
