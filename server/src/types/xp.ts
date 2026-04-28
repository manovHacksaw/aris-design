import { MilestoneCategory, XpTransactionType } from '@prisma/client';

// ==================== MILESTONE CONFIGURATION ====================

export interface MilestoneConfig {
  threshold: number;
  xp: number;
}

export interface LevelConfig {
  level: number;
  xpRequired: number;
  multiplier: number;
}

// ==================== XP STATUS ====================

export interface XpStatus {
  xp: number;
  level: number;
  multiplier: number;
  xpToNextLevel: number;
  levelProgress: {
    current: number;
    required: number;
    percentage: number;
  };
}

export interface FullXpStatus extends XpStatus {
  streak: StreakStatus | null;
  referralStats: ReferralStats;
  recentTransactions: XpTransactionSummary[];
}

// ==================== STREAKS ====================

export interface StreakStatus {
  current: number;
  longest: number;
  lastLoginDate: Date;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
  previousStreak?: number;
  streakBroken?: boolean;
  newMilestonesClaimed: ClaimedMilestone[];
}

// ==================== MILESTONES ====================

export interface ClaimedMilestone {
  category: MilestoneCategory;
  threshold: number;
  xpAwarded: number;
  claimedAt?: Date;
}

export interface MilestoneProgress {
  category: MilestoneCategory;
  current: number;
  claimed: number[];
  next: MilestoneConfig | null;
  progress: number; // percentage towards next milestone
  allTiers: MilestoneConfig[];
}

export interface MilestoneCounts {
  votesCast: number;
  topVotes: number;
  loginStreak: number;
  postsCreated: number;
  votesReceived: number;
  top3Content: number;
  referralCount: number;
}

// ==================== REFERRALS ====================

export interface ReferralStats {
  totalReferrals: number;
  xpFromReferrals: number;
  referralCode: string | null;
}

// ==================== TRANSACTIONS ====================

export interface XpTransactionSummary {
  id: string;
  amount: number;
  type: XpTransactionType;
  category?: MilestoneCategory | null;
  threshold?: number | null;
  description?: string | null;
  createdAt: Date;
}

export interface XpGrantResult {
  newXp: number;
  newLevel: number;
  previousXp: number;
  previousLevel: number;
  leveledUp: boolean;
}

// ==================== API REQUEST/RESPONSE TYPES ====================

export interface LoginPingResponse {
  success: boolean;
  streak: {
    current: number;
    longest: number;
    isNewDay: boolean;
    streakBroken?: boolean;
  };
  milestonesClaimedToday: ClaimedMilestone[];
  xp: XpStatus;
}

export interface XpStatusResponse {
  success: boolean;
  data: FullXpStatus;
}

export interface MilestoneProgressResponse {
  success: boolean;
  milestones: Record<MilestoneCategory, MilestoneProgress>;
}

export interface ReferralInfoResponse {
  success: boolean;
  referralCode: string | null;
  stats: ReferralStats;
}

export interface GenerateReferralCodeResponse {
  success: boolean;
  referralCode: string;
}

// ==================== SERVICE METHOD PARAMS ====================

export interface GrantXpParams {
  userId: string;
  amount: number;
  type: XpTransactionType;
  category?: MilestoneCategory;
  threshold?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessReferralResult {
  success: boolean;
  baseXpAwarded: number;
  milestonesClaimed: ClaimedMilestone[];
  referrerNewXp: number;
}
