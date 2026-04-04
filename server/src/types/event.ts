import { Event, EventType } from '@prisma/client';

// ==================== ENUMS & CONSTANTS ====================

export const EventStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  POSTING: 'posting',
  VOTING: 'voting',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type EventStatusType = typeof EventStatus[keyof typeof EventStatus];

// Valid status transitions
export const VALID_TRANSITIONS: Record<EventStatusType, EventStatusType[]> = {
  [EventStatus.DRAFT]: [EventStatus.SCHEDULED, EventStatus.CANCELLED],
  [EventStatus.SCHEDULED]: [EventStatus.POSTING, EventStatus.VOTING, EventStatus.CANCELLED],
  [EventStatus.POSTING]: [EventStatus.VOTING, EventStatus.CANCELLED],
  [EventStatus.VOTING]: [EventStatus.COMPLETED, EventStatus.CANCELLED],
  [EventStatus.COMPLETED]: [], // Terminal state
  [EventStatus.CANCELLED]: [], // Terminal state
};

// Locked fields by status
export const LOCKED_FIELDS_MAP: Record<EventStatusType, string[]> = {
  [EventStatus.DRAFT]: [], // All fields editable

  [EventStatus.SCHEDULED]: [
    'eventType',
    'startTime',
    'endTime',
    'postingStart',
    'postingEnd',
  ],

  [EventStatus.POSTING]: ['*'],
  [EventStatus.VOTING]: ['*'],
  [EventStatus.COMPLETED]: ['*'],
  [EventStatus.CANCELLED]: ['*'],
};

// ==================== REQUEST INTERFACES ====================

export interface CreateEventRequest {
  id?: string; // Optional: Allow frontend to specify ID (for on-chain sync)
  title: string;
  description?: string;
  category?: string;
  eventType: EventType;
  status?: EventStatusType; // Optional, defaults to DRAFT
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  postingStart?: string; // ISO 8601, required for post_and_vote
  postingEnd?: string; // ISO 8601, required for post_and_vote
  imageCid?: string; // IPFS CID
  imageUrl?: string; // Cloudinary URL
  allowSubmissions?: boolean;
  allowVoting?: boolean;
  autoTransition?: boolean;
  nextPhaseAt?: string; // ISO 8601

  // On-chain pool data (added)
  onChainEventId?: string;
  poolTransactionHash?: string;
  blockchainStatus?: string;
  useRefundBalance?: number;

  // New fields
  baseReward?: number;
  topReward?: number;
  leaderboardPool?: number; // Only for post_and_vote events - split 50/35/15 among top 3 creators
  capacity?: number;
  samples?: string[];
  preferredGender?: string;
  ageGroup?: string;
  tagline?: string;
  participantInstructions?: string;
  submissionGuidelines?: string;
  moderationRules?: string;
  hashtags?: string[];
  regions?: string[];
  
  // Audince Targeting Hard Filters
  ageRestriction?: number;
  genderRestriction?: string;
  intendedCategories?: string[];

  proposals?: Array<{
    type: 'IMAGE' | 'TEXT';
    title: string;
    content?: string;   // For TEXT proposals
    imageCid?: string;  // For IMAGE proposals
    imageUrl?: string;  // For Cloudinary images
    order?: number;
  }>;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  category?: string;
  eventType?: EventType;
  startTime?: string; // ISO 8601
  endTime?: string; // ISO 8601
  postingStart?: string; // ISO 8601
  postingEnd?: string; // ISO 8601
  imageCid?: string;
  imageUrl?: string;
  allowSubmissions?: boolean;
  allowVoting?: boolean;
  autoTransition?: boolean;
  nextPhaseAt?: string; // ISO 8601

  baseReward?: number;
  topReward?: number;
  capacity?: number;
  ageRestriction?: number;
  genderRestriction?: string;
  intendedCategories?: string[];
}

export interface UpdateEventStatusRequest {
  status: EventStatusType;
}

export interface EventFilters {
  status?: EventStatusType;
  eventType?: EventType;
  brandId?: string;
  category?: string;
  page?: number;
  limit?: number;
  q?: string;
}

// ==================== RESPONSE INTERFACES ====================

export interface EventResponse {
  success: boolean;
  message?: string;
  event?: Event;
  error?: string;
  lockedFields?: string[];
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
  error?: string;
}

export interface EventWithRelations extends Event {
  brand?: {
    id: string;
    name: string;
    logoCid: string | null;
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
}

// ==================== VALIDATION TYPES ====================

export interface TimestampData {
  startTime: Date;
  endTime: Date;
  postingStart?: Date | null;
  postingEnd?: Date | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
