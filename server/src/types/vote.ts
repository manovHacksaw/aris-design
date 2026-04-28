import { Vote } from '@prisma/client';

// ==================== REQUEST INTERFACES ====================

// For VOTE_ONLY events - batch voting for proposals
export interface VoteForProposalsRequest {
  proposalIds: string[]; // Array of proposal IDs to vote for
}

// For POST_VOTE events - vote for a single submission (can vote multiple times for different submissions)
export interface VoteForSubmissionRequest {
  submissionId: string;
}

// ==================== RESPONSE INTERFACES ====================

export interface VoteResponse {
  success: boolean;
  message?: string;
  vote?: Vote;
  votes?: Vote[];
  error?: string;
}

export interface VoteListResponse {
  success: boolean;
  votes: VoteWithDetails[];
  error?: string;
}

export interface VoteStatusResponse {
  success: boolean;
  hasVoted: boolean;
  error?: string;
}

export interface VoteWithDetails extends Vote {
  proposal?: {
    id: string;
    type: string;
    title: string;
    content: string | null;
    imageCid: string | null;
  };
  submission?: {
    id: string;
    imageCid: string | null;
    caption: string | null;
    userId: string;
  };
}

// ==================== RANKING TYPES ====================

export interface RankingResult {
  id: string;
  rank: number;
  voteCount: number;
  type: 'submission' | 'proposal';
  data: any;
}

export interface ProposalRanking {
  id: string;
  type: string;
  title: string;
  content: string | null;
  imageCid: string | null;
  rank: number;
  voteCount: number;
}

export interface SubmissionRanking {
  id: string;
  imageCid: string | null;
  caption: string | null;
  userId: string;
  rank: number;
  voteCount: number;
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}
