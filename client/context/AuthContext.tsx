"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useWallet } from "./WalletContext";

export type UserRole = "user" | "brand" | null;

export type OnboardingData = {
  role: UserRole;
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  preferredCategories?: string[];
  preferredBrands?: string[];
  // Brand-specific
  brandName?: string;
  brandTagline?: string;
  brandDescription?: string;
  brandCategories?: string[];
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

  // Clear onboarding data when wallet disconnects
  useEffect(() => {
    if (isInitialized && !isConnected) {
      setOnboardingDataState(null);
    }
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
