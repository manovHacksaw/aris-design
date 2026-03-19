import { apiRequest } from "./api";

// ── Types ────────────────────────────────────────────────────

export type ClaimType = "BASE_VOTER" | "TOP_VOTER" | "CREATOR" | "LEADERBOARD";
export type ClaimStatus = "PENDING" | "CREDITED" | "CLAIMED" | "SIGNED" | "EXHAUSTED" | "EXPIRED";

export interface ClaimInfo {
  id: string;
  poolId: string;
  userId: string;
  claimType: ClaimType;
  baseAmount: number;
  multiplier: number;
  finalAmount: number;
  status: ClaimStatus;
  transactionHash?: string | null;
  claimedAt?: string | null;
}

export interface EventClaimGroup {
  eventId: string;
  eventTitle: string;
  claims: ClaimInfo[];
  totalClaimableUsdc: number;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  eventImageUrl?: string | null;
  userContentImageUrl?: string | null;
}

export interface ClaimableRewardsResponse {
  events: EventClaimGroup[];
  totalClaimableUsdc: number;
}

// ── Human-readable label for claim type ─────────────────────

export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  BASE_VOTER: "Voter reward",
  TOP_VOTER: "Top voter bonus",
  CREATOR: "Creator reward",
  LEADERBOARD: "Leaderboard prize",
};

// ── API calls ────────────────────────────────────────────────

/** GET /api/rewards/user/claimable — returns PENDING + CREDITED claims grouped by event */
export async function getClaimableRewards(): Promise<ClaimableRewardsResponse> {
  const res = await apiRequest<{ success: boolean; data: ClaimableRewardsResponse }>(
    "/rewards/user/claimable"
  );
  return res.data;
}

export interface ClaimHistoryEntry {
  id: string;
  claimType: ClaimType;
  finalAmount: number;
  status: ClaimStatus;
  transactionHash?: string | null;
  claimedAt?: string | null;
  event?: { title: string; id: string } | null;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  eventImageUrl?: string | null;
  contentImageUrl?: string | null;
}

interface RawClaimHistoryItem {
  id: string;
  claimType: ClaimType;
  finalAmount: number;
  status: ClaimStatus;
  transactionHash?: string | null;
  claimedAt?: string | null;
  eventId?: string;
  eventTitle?: string;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  eventImageUrl?: string | null;
  contentImageUrl?: string | null;
}

/** GET /api/rewards/user/history — returns all past (CLAIMED) rewards */
export async function getRewardHistory(): Promise<ClaimHistoryEntry[]> {
  const res = await apiRequest<{
    success: boolean;
    data: { claims: RawClaimHistoryItem[]; totalClaimedUsdc: number };
  }>("/rewards/user/history");
  return (res.data?.claims ?? []).map((c) => ({
    id: c.id,
    claimType: c.claimType,
    finalAmount: c.finalAmount,
    status: c.status,
    transactionHash: c.transactionHash,
    claimedAt: c.claimedAt,
    event: c.eventId ? { id: c.eventId, title: c.eventTitle ?? "Event" } : null,
    brandName: c.brandName,
    brandLogoUrl: c.brandLogoUrl,
    eventImageUrl: c.eventImageUrl,
    contentImageUrl: c.contentImageUrl,
  }));
}

/** POST /api/rewards/confirm-all-claims — marks all CREDITED claims as CLAIMED */
export async function confirmAllClaims(transactionHash: string): Promise<void> {
  await apiRequest<{ success: boolean }>("/rewards/confirm-all-claims", {
    method: "POST",
    body: JSON.stringify({ transactionHash }),
  });
}
