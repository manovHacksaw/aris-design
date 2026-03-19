import { ClaimType, ClaimStatus, RewardsPoolStatus } from '@prisma/client';

// ==================== CONSTANTS (Match Smart Contract) ====================

export const REWARDS_CONSTANTS = {
  // Base rewards (6 decimals for USDC)
  BASE_REWARD_VOTE_ONLY: 30000,    // $0.03
  BASE_REWARD_POST_VOTE: 50000,    // $0.05 creator reward per vote
  PLATFORM_FEE_PER_PARTICIPANT: 15000,  // $0.015 for vote_only
  PLATFORM_FEE_POST_AND_VOTE: 20000,    // $0.02 for post_and_vote

  // Minimum top pool multiplier
  MIN_TOP_REWARD_MULTIPLIER: 1,

  // Leaderboard distribution (basis points)
  FIRST_PLACE_BPS: 5000,   // 50%
  SECOND_PLACE_BPS: 3500,  // 35%
  THIRD_PLACE_BPS: 1500,   // 15%
  BPS_DENOMINATOR: 10000,

  // USDC decimals
  USDC_DECIMALS: 6,
} as const;

// ==================== ENUMS (Match Smart Contract) ====================

export enum EventType {
  VoteOnly = 0,
  PostAndVote = 1,
}

export enum EventState {
  NotCreated = 0,
  Active = 1,
  Finalized = 2,
  Cancelled = 3,
}

// Re-export from Prisma for convenience
export { ClaimType, ClaimStatus, RewardsPoolStatus };

// ==================== POOL CALCULATIONS ====================

export interface PoolRequirements {
  basePoolUsdc: number;
  topPoolUsdc: number;
  leaderboardPoolUsdc: number;
  platformFeeUsdc: number;
  creatorPoolUsdc: number;
  totalRequiredUsdc: number;
  // In raw USDC units (6 decimals)
  basePoolRaw: bigint;
  topPoolRaw: bigint;
  leaderboardPoolRaw: bigint;
  platformFeeRaw: bigint;
  creatorPoolRaw: bigint;
  totalRequiredRaw: bigint;
}

export interface PoolCalculationParams {
  eventType: EventType;
  maxParticipants: number;
  topPoolAmount: number;        // In USDC - Top voter pool
  leaderboardPoolAmount?: number; // In USDC - Leaderboard pool for post_and_vote
}

// ==================== POOL CREATION ====================

export interface CreatePoolRequest {
  eventId: string;
  maxParticipants: number;
  topPoolAmount: number;  // In USDC
}

export interface CreatePoolResponse {
  success: boolean;
  pool?: {
    id: string;
    eventId: string;
    onChainEventId: string;
    maxParticipants: number;
    basePoolUsdc: number;
    topPoolUsdc: number;
    platformFeeUsdc: number;
    creatorPoolUsdc: number;
    status: RewardsPoolStatus;
  };
  error?: string;
}

// ==================== POOL INFO ====================

export interface PoolInfo {
  id: string;
  eventId: string;
  maxParticipants: number;
  basePoolUsdc: number;
  topPoolUsdc: number;
  leaderboardPoolUsdc: number;
  platformFeeUsdc: number;
  creatorPoolUsdc: number;
  totalDisbursed: number;
  participantCount: number;
  status: RewardsPoolStatus;
  remainingPoolUsdc: number;
  completedAt: Date | null;
}

// ==================== CLAIMS ====================

export interface ClaimInfo {
  id: string;
  poolId: string;
  userId: string;
  claimType: ClaimType;
  baseAmount: number;
  multiplier: number;
  finalAmount: number;
  status: ClaimStatus;
  transactionHash: string | null;
  claimedAt: Date | null;
}

export interface ClaimDetails {
  id: string;
  poolId: string;
  userId: string;
  claimType: ClaimType;
  baseAmount: number;
  multiplier: number;
  finalAmount: number;
  status: ClaimStatus;
  transactionHash: string | null;
  claimedAt: Date | null;
  createdAt: Date;
}

export interface UserClaimableRewards {
  eventId: string;
  eventTitle: string;
  claims: ClaimDetails[];
  totalClaimableUsdc: number;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  eventImageUrl?: string | null;
  userContentImageUrl?: string | null;
}

export interface SignClaimRequest {
  eventId: string;
  claimType: ClaimType;
}

export interface SignClaimData {
  eventId: string;
  onChainEventId: string;
  amount: string;  // In raw USDC units (string for JSON serialization)
  claimType: number;
  nonce: string;   // String for JSON serialization
  deadline: string; // String for JSON serialization
  signature: string;
}

export interface SignClaimResponse {
  success: boolean;
  claim?: SignClaimData;
  data?: SignClaimData;  // Alias for backwards compatibility
  error?: string;
}

export interface ConfirmClaimRequest {
  eventId: string;
  claimType: ClaimType;
  transactionHash: string;
}

export interface ConfirmClaimResponse {
  success: boolean;
  claim?: ClaimInfo;
  error?: string;
}

// ==================== EIP-712 TYPES ====================

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface ClaimMessage {
  eventId: string;  // bytes32
  user: string;     // address
  amount: bigint;   // uint256
  claimType: number;  // uint8
  nonce: bigint;    // uint256
  deadline: bigint; // uint256
}

export const EIP712_CLAIM_TYPES: Record<string, Array<{ name: string; type: string }>> = {
  Claim: [
    { name: 'eventId', type: 'bytes32' },
    { name: 'user', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'claimType', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

// ==================== EVENT REWARDS PROCESSING ====================

export interface ProcessEventRewardsResult {
  success: boolean;
  claimsCreated: number;
  totalRewards: number;
  transactionHash?: string;
  errors: string[];
}

export interface VoterRewardInfo {
  userId: string;
  walletAddress: string;
  voteCount: number;
  isTopVoter: boolean;
  leaderboardPosition?: number;  // 1, 2, or 3 for top 3
}

export interface CreatorRewardInfo {
  userId: string;
  walletAddress: string;
  submissionId: string;
  votesReceived: number;
  leaderboardPosition?: number;
}

// ==================== API RESPONSE TYPES ====================

export interface RewardsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ClaimHistoryItem {
  id: string;
  eventId: string;
  eventTitle: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  contentImageUrl: string | null;
  claimType: ClaimType;
  baseAmount: number;
  multiplier: number;
  finalAmount: number;
  status: ClaimStatus;
  transactionHash: string | null;
  claimedAt: Date | null;
}

export interface UserClaimHistory {
  claims: ClaimHistoryItem[];
  totalClaimedUsdc: number;
  totalPendingUsdc: number;
}

// ==================== FINALIZATION ====================

export interface FinalizePoolRequest {
  eventId: string;
  actualParticipants: number;
}

export interface FinalizePoolResponse {
  success: boolean;
  refundAmount?: number;
  platformFeesCollected?: number;
  transactionHash?: string;
  error?: string;
}
