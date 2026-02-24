import { Proposal, ProposalType } from '@prisma/client';

// ==================== REQUEST INTERFACES ====================

export interface CreateProposalRequest {
  type: ProposalType; // 'IMAGE' or 'TEXT'
  title: string;
  content?: string;   // For TEXT proposals - the description/question
  imageCid?: string;  // For IMAGE proposals - IPFS CID
  order?: number;
}

export interface UpdateProposalRequest {
  title?: string;
  content?: string;
  imageCid?: string;
  order?: number;
}

// ==================== RESPONSE INTERFACES ====================

export interface ProposalResponse {
  success: boolean;
  message?: string;
  proposal?: Proposal;
  error?: string;
}

export interface ProposalListResponse {
  success: boolean;
  proposals: Proposal[];
  error?: string;
}

export interface ProposalWithVotes extends Proposal {
  _count?: {
    votes: number;
  };
}

// ==================== VALIDATION TYPES ====================

export interface ProposalValidationResult {
  isValid: boolean;
  errors: string[];
}
