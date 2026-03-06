import { apiRequest } from "./api";
import type { User, UserStats, UpdateUserData } from "@/types/user";

export type { User, UserStats, UpdateUserData };

/** GET /api/users/me — authenticated user */
export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/users/me");
}

/** GET /api/users/me/stats */
export async function getUserStats(): Promise<UserStats> {
  const res = await apiRequest<{ success: boolean; stats: UserStats }>("/users/me/stats");
  return res.stats;
}

/** GET /api/users/username/:username — public profile */
export async function getUserByUsername(username: string): Promise<User> {
  const clean = username.startsWith("@") ? username.slice(1) : username;
  return apiRequest<User>(`/users/username/${encodeURIComponent(clean)}`);
}

/** GET /api/users/:userId/stats — public stats */
export async function getUserStatsById(userId: string): Promise<UserStats> {
  const res = await apiRequest<{ success: boolean; stats: UserStats }>(`/users/${userId}/stats`);
  return res.stats;
}

/** PATCH /api/users/profile */
export async function updateProfile(
  data: UpdateUserData
): Promise<{ success: boolean; user: User }> {
  return apiRequest<{ success: boolean; user: User }>("/users/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** PATCH /api/users/wallet */
export async function updateWalletAddress(
  walletAddress: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/users/wallet", {
    method: "PATCH",
    body: JSON.stringify({ walletAddress }),
  });
}

/** GET /api/users/:userId/followers */
export async function getFollowers(userId: string): Promise<User[]> {
  const res = await apiRequest<{ success: boolean; followers: User[] }>(`/users/${userId}/followers`);
  return res.followers;
}

/** GET /api/users/:userId/following */
export async function getFollowing(userId: string): Promise<User[]> {
  const res = await apiRequest<{ success: boolean; following: User[] }>(`/users/${userId}/following`);
  return res.following;
}

/** POST /api/users/follow/:followingId */
export async function followUser(followingId: string): Promise<void> {
  await apiRequest(`/users/follow/${followingId}`, { method: "POST" });
}

/** DELETE /api/users/follow/:followingId */
export async function unfollowUser(followingId: string): Promise<void> {
  await apiRequest(`/users/follow/${followingId}`, { method: "DELETE" });
}

/** GET /api/users/check-username?username=... */
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean }> {
  return apiRequest<{ available: boolean }>(
    `/users/check-username?username=${encodeURIComponent(username)}`
  );
}

/** GET /api/users/search?q=... (public) */
export async function searchUsers(
  query: string,
  take = 20
): Promise<{ id: string; username: string | null; displayName: string | null; avatarUrl: string | null; bio: string | null; xp: number; level: number; _count: { followers: number } }[]> {
  const res = await apiRequest<{ results: any[] }>(
    `/users/search?q=${encodeURIComponent(query)}&take=${take}`
  );
  return res.results;
}

/** GET /api/users/validate-referral?code=... */
export async function validateReferralCode(
  code: string
): Promise<{ valid: boolean; referrerName?: string; reason?: string }> {
  return apiRequest<{ valid: boolean; referrerName?: string; reason?: string }>(
    `/users/validate-referral?code=${encodeURIComponent(code)}`
  );
}

/** POST /api/users/apply-referral */
export async function applyReferralCode(
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>("/users/apply-referral", {
    method: "POST",
    body: JSON.stringify({ referralCode }),
  });
}

/** POST /api/users/onboarding-analytics — analytics-only, not shown in UI */
export async function saveOnboardingAnalytics(data: {
  adsSeenDaily?: string;
  referralSource?: string;
  joinMotivation?: string[];
  socialPlatforms?: string[];
  rewardPreference?: string[];
  engagementStyle?: string;
}): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/users/onboarding-analytics", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** GET /api/users/:userId/submissions */
export async function getUserSubmissions(userId: string): Promise<any[]> {
  const res = await apiRequest<{ success: boolean; submissions: any[] }>(`/users/${userId}/submissions`);
  return res.submissions;
}
