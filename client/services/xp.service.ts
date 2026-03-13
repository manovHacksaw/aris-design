import { apiRequest } from "./api";

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

export interface StreakStatus {
  current: number;
  longest: number;
  lastLoginDate: string;
}

export interface XpTransactionSummary {
  id: string;
  amount: number;
  type: string;
  category?: string | null;
  threshold?: number | null;
  description?: string | null;
  createdAt: string;
}

export interface FullXpStatus extends XpStatus {
  streak: StreakStatus | null;
  referralStats: {
    totalReferrals: number;
    xpFromReferrals: number;
    referralCode: string | null;
  };
  recentTransactions: XpTransactionSummary[];
}

/** GET /api/xp/me — full XP status including streak and recent transactions */
export async function getXpStatus(): Promise<FullXpStatus> {
  const res = await apiRequest<{ success: boolean; data: FullXpStatus }>("/xp/me");
  return res.data;
}

/** GET /api/xp/transactions — paginated XP transaction history */
export async function getXpTransactions(
  limit = 50,
  offset = 0
): Promise<{ transactions: XpTransactionSummary[]; pagination: { total: number } }> {
  return apiRequest<{ transactions: XpTransactionSummary[]; pagination: { total: number } }>(
    `/xp/transactions?limit=${limit}&offset=${offset}`
  );
}

/** POST /api/xp/login-ping — record daily login and update streak */
export async function loginPing(): Promise<{
  success: boolean;
  streak: { current: number; longest: number; isNewDay: boolean; streakBroken?: boolean };
  xp: XpStatus;
}> {
  return apiRequest("/xp/login-ping", { method: "POST" });
}
