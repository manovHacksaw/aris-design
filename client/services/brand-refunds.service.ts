import { apiRequest } from "./api";

export interface RefundBreakdown {
  unusedBase: number;
  unusedTop: number;
  unusedCreator: number;
  unusedLeaderboard: number;
  platformFee: number;
  totalRefund: number;
}

export interface RefundPool {
  id: string;
  eventId: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  maxParticipants: number;
  participantCount: number;
  basePoolUsdc: number;
  topPoolUsdc: number;
  leaderboardPoolUsdc: number;
  creatorPoolUsdc: number;
  platformFeeUsdc: number;
  totalDisbursed: number;
  refundBreakdown: RefundBreakdown;
  // event title injected from API
  eventTitle?: string;
  eventStatus?: string;
  completedAt?: string | null;
}

export interface RefundHistoryItem {
  type: string;
  amount: number;
  timestamp: string;
  eventId: string;
  dbEventId: string;
  eventTitle: string;
  status: string;
  breakdown: RefundBreakdown;
}

export interface BrandRefundsResponse {
  brandId: string;
  brandName: string;
  refundableBalanceUsdc: number;
  onChainBalance: number;
  pools: RefundPool[];
  refundHistory: RefundHistoryItem[];
}

export interface PrepareRefundResult {
  success: boolean;
  eventId?: string;
  eventTitle?: string;
  refundAmount?: number;
  poolStatus?: string;
  breakdown?: Omit<RefundBreakdown, "totalRefund">;
  error?: string;
}

/** GET /api/rewards/brand/refunds */
export async function getBrandRefunds(): Promise<BrandRefundsResponse> {
  const res = await apiRequest<{ success: boolean; data: BrandRefundsResponse }>(
    "/rewards/brand/refunds"
  );
  return res.data;
}

/** POST /api/rewards/brand/refunds/prepare */
export async function prepareRefundClaim(eventId: string): Promise<PrepareRefundResult> {
  const res = await apiRequest<PrepareRefundResult>("/rewards/brand/refunds/prepare", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
  return res;
}

// ── localStorage credit helpers ────────────────────────────

const CREDIT_KEY = "aris_brand_refund_credit";

export interface RefundCredit {
  amount: number;
  eventIds: string[];
  savedAt: string;
}

export function saveRefundCredit(amount: number, eventIds: string[]) {
  const credit: RefundCredit = { amount, eventIds, savedAt: new Date().toISOString() };
  localStorage.setItem(CREDIT_KEY, JSON.stringify(credit));
}

export function getRefundCredit(): RefundCredit | null {
  try {
    const raw = localStorage.getItem(CREDIT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearRefundCredit() {
  localStorage.removeItem(CREDIT_KEY);
}
