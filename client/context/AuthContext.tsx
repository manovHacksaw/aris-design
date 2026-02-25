"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useWallet } from "./WalletContext";

export type UserRole = "user" | "brand" | null;

export type OnboardingData = {
  role: UserRole;
  // User profile
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  // User presence
  location?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  creatorType?: string;
  audienceSize?: string;
  // User interests & preferences
  preferredCategories?: string[];
  preferredBrands?: string[];
  contentFormat?: string;
  creatorCategories?: string[];
  // User intent
  intentGoals?: string[];
  // Web3 familiarity
  web3Level?: "beginner" | "basic" | "intermediate" | "advanced";
  // Network seeding (followed during onboarding)
  followedBrands?: string[];
  followedCreators?: string[];
  // Analytics only — stored but not shown in UI
  analyticsData?: {
    adsSeenDaily?: string;
    referralSource?: string;
    joinMotivation?: string[];
    socialPlatforms?: string[];
    rewardPreference?: string[];
    engagementStyle?: string;
  };
  // Resume support
  onboardingStep?: number;
  // Brand identity
  brandName?: string;
  brandTagline?: string;
  brandDescription?: string;
  // Brand presence
  brandWebsite?: string;
  brandInstagram?: string;
  brandTwitter?: string;
  brandLinkedin?: string;
  companySize?: string;
  // Brand campaign preferences
  brandCategories?: string[];
  monthlyBudget?: string;
  targetAudience?: string[];
  isOnboarded: boolean;
};

type AuthContextType = {
  role: UserRole;
  isOnboarded: boolean;
  onboardingData: OnboardingData | null;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  completeOnboarding: (data: Partial<OnboardingData>) => void;
  clearOnboarding: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "aris_onboarding";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isConnected, isInitialized, address } = useWallet();
  const [onboardingData, setOnboardingDataState] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Track whether a real connection has been established to avoid
  // the init race where isInitialized=true but isConnected=false briefly
  const wasConnected = useRef(false);

  // Load persisted onboarding data on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setOnboardingDataState(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle connect / disconnect — but never clear state during initialization
  useEffect(() => {
    if (!isInitialized) return;

    if (isConnected) {
      wasConnected.current = true;
      // Restore from localStorage if state was wiped (e.g. by a previous effect)
      setOnboardingDataState((prev) => {
        if (prev) return prev;
        if (typeof window === "undefined") return prev;
        try {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          if (stored) return JSON.parse(stored);
        } catch {}
        return prev;
      });
    } else if (wasConnected.current) {
      // Genuine disconnect — clear everything
      setOnboardingDataState(null);
      wasConnected.current = false;
    }
    // If !isConnected && !wasConnected: still initializing, do nothing
  }, [isConnected, isInitialized]);

  const setOnboardingData = useCallback((data: Partial<OnboardingData>) => {
    setOnboardingDataState((prev) => {
      const updated = { ...prev, ...data } as OnboardingData;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const completeOnboarding = useCallback(
    (data: Partial<OnboardingData>) => {
      const completed: OnboardingData = {
        ...(onboardingData || {}),
        ...data,
        isOnboarded: true,
      } as OnboardingData;
      setOnboardingDataState(completed);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      }
    },
    [onboardingData]
  );

  const clearOnboarding = useCallback(() => {
    setOnboardingDataState(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const role = onboardingData?.role ?? null;
  const isOnboarded = onboardingData?.isOnboarded ?? false;

  return (
    <AuthContext.Provider
      value={{
        role,
        isOnboarded,
        onboardingData,
        setOnboardingData,
        completeOnboarding,
        clearOnboarding,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
