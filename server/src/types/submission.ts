import { Submission } from '@prisma/client';

// ==================== REQUEST INTERFACES ====================

export interface CreateSubmissionRequest {
  imageCid: string;
  caption?: string;
}

export interface UpdateSubmissionRequest {
  imageCid?: string;
  caption?: string;
}

// ==================== RESPONSE INTERFACES ====================

export interface SubmissionResponse {
  success: boolean;
  message?: string;
  submission?: Submission | SubmissionWithDetails;
  error?: string;
}

export interface SubmissionListResponse {
  success: boolean;
  submissions: SubmissionWithDetails[];
  error?: string;
}

export interface SubmissionWithDetails extends Submission {
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  _count?: {
    votes: number;
  };
}

// ==================== VALIDATION TYPES ====================

export interface SubmissionValidationResult {
  isValid: boolean;
  errors: string[];
}
