export interface User {
  id: string;
  email: string;
  emailVerified?: boolean;
  username?: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  walletAddress: string | null;
  preferredBrands: string[];
  preferredCategories: string[];
  isOnboarded: boolean;
  web3Level?: string | null;
  intentGoals?: string[];
  contentFormat?: string | null;
  creatorCategories?: string[];
  onboardingStep?: number;
  xp: number;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
    youtube?: string;
    linkedin?: string;
    [key: string]: string | undefined;
  };
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  role: "USER" | "BRAND_OWNER" | "ADMIN";
  referralCode?: string | null;
  currentStreak?: number;
  ownedBrands?: {
    id: string;
    name: string;
    logoCid?: string;
    tagline?: string;
    description?: string;
    categories?: string[];
    isActive: boolean;
    isVerified: boolean;
    socialLinks?: Record<string, string>;
    createdAt?: string;
  }[];
}

export interface UserStats {
  subscribers: number;   // followers
  subscriptions: number; // following
  posts: number;
  votes: number;
  events: number;
  earnings: number;
}

export interface UpdateUserData {
  email?: string;
  displayName?: string;
  username?: string;
  bio?: string;
  gender?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  preferredBrands?: string[];
  preferredCategories?: string[];
  isOnboarded?: boolean;
  web3Level?: string;
  intentGoals?: string[];
  contentFormat?: string;
  creatorCategories?: string[];
  onboardingStep?: number;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
    youtube?: string;
    linkedin?: string;
    [key: string]: string | undefined;
  };
}

/** Derive XP level from raw XP value */
export function xpToLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

/** Derive a rank label from level */
export function levelToRank(level: number): string {
  if (level >= 50) return "Legend";
  if (level >= 30) return "Gold";
  if (level >= 20) return "Silver III";
  if (level >= 15) return "Silver II";
  if (level >= 10) return "Silver I";
  if (level >= 7)  return "Bronze IV";
  if (level >= 4)  return "Bronze III";
  if (level >= 2)  return "Bronze II";
  return "Bronze I";
}

/** XP required for next level */
export function xpForNextLevel(xp: number): { current: number; next: number; progress: number } {
  const level = xpToLevel(xp);
  const current = (level - 1) * 500;
  const next = level * 500;
  const progress = Math.round(((xp - current) / (next - current)) * 100);
  return { current, next, progress };
}

/** Format earnings as a dollar string */
export function formatEarnings(earnings: number): string {
  if (earnings === 0) return "$0";
  return `$${earnings.toFixed(2)}`;
}

/** Format large numbers (1200 → "1.2k") */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
