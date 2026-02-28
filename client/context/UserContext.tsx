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
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "./WalletContext";
import { usePathname } from "next/navigation";
import {
  getCurrentUser,
  getUserStats,
  updateProfile as updateProfileAPI,
  updateWalletAddress as updateWalletAPI,
} from "@/services/user.service";
import { authenticateWithPrivy, removeAuthToken, getAuthToken } from "@/services/api";
import type { User, UserStats, UpdateUserData } from "@/types/user";

type UserContextType = {
  user: User | null;
  stats: UserStats | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
  updateProfile: (data: UpdateUserData) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, user: privyUser, authenticated, ready } = usePrivy();
  const { address, isConnected, isInitialized, userInfo } = useWallet();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncedAddress, setSyncedAddress] = useState<string | null>(null);

  const syncingRef = useRef(false);

  // Derive loading: true while Privy/wallet init or actively syncing
  const isAuthenticated = !!(user && isConnected);

  /** Call /auth/privy-login to get a JWT, then fetch user + stats */
  const syncWithBackend = useCallback(async () => {
    if (syncingRef.current || !isConnected) return;
    syncingRef.current = true;
    setIsLoading(true);
    // Force clear old state to prevent UI flicker of previous user data
    setUser(null);
    setStats(null);

    try {
      const privyToken = await getAccessToken();
      if (!privyToken) throw new Error("No Privy access token");

      const email =
        (privyUser?.google as any)?.email ??
        (privyUser?.email as any)?.address ??
        undefined;

      const googlePicture = (privyUser?.google as any)?.picture ?? undefined;

      const { user: authUser } = await authenticateWithPrivy(
        privyToken,
        address ?? undefined,
        email,
        googlePicture
      );

      setUser(authUser);
      setSyncedAddress(address);

      // Fetch stats in parallel
      try {
        const s = await getUserStats();
        setStats(s);
      } catch {
        // stats failure is non-critical
      }

      // Sync smart account address if it changed
      if (
        address &&
        authUser &&
        authUser.walletAddress?.toLowerCase() !== address.toLowerCase()
      ) {
        try {
          await updateWalletAPI(address);
          setUser((prev) => prev ? { ...prev, walletAddress: address } : prev);
        } catch {
          // non-critical
        }
      }
    } catch (err) {
      console.error("UserContext: sync failed", err);
      setUser(null);
      setStats(null);
    } finally {
      syncingRef.current = false;
      setIsLoading(false);
    }
  }, [isConnected, address, getAccessToken, privyUser]);

  /** Re-fetch from /users/me (uses existing token) */
  const refreshUser = useCallback(async () => {
    try {
      const [u, s] = await Promise.all([getCurrentUser(), getUserStats().catch(() => null)]);
      setUser(u);
      if (s) setStats(s);
    } catch (err: any) {
      // On brand registration pages, skip auto-sync (no user creation).
      // The page manually calls syncWithBackend after the user clicks "Brand Login".
      const isOnBrandPage = pathname?.startsWith("/register-brand");
      if ((err?.status === 401 || err?.status === 404) && !isOnBrandPage) {
        await syncWithBackend();
      }
    }
  }, [syncWithBackend, pathname]);

  /** Update profile and refresh local state */
  const updateProfile = useCallback(async (data: UpdateUserData) => {
    const res = await updateProfileAPI(data);
    setUser(res.user);
  }, []);

  // Sync when wallet connects or address changes
  useEffect(() => {
    if (!isInitialized || !ready) return;

    if (!isConnected || !authenticated) {
      // Wallet disconnected — clear state
      if (user || syncedAddress) {
        setUser(null);
        setStats(null);
        setSyncedAddress(null);
        removeAuthToken();
      }
      return;
    }

    // Only re-sync if address changed.
    // On brand registration pages, refreshUser is used first (non-creating).
    // The brand page manually calls syncWithBackend after explicit login.
    if (address && address !== syncedAddress) {
      const isOnBrandPage = pathname?.startsWith("/register-brand");
      if (isOnBrandPage) {
        refreshUser();
      } else {
        syncWithBackend();
      }
      setSyncedAddress(address);
    }
  }, [isConnected, authenticated, isInitialized, ready, address, syncedAddress, pathname]);

  // On mount, if there's an existing token, try to load user silently
  useEffect(() => {
    const token = getAuthToken();
    if (token && !user && !isLoading) {
      getCurrentUser()
        .then((u) => {
          setUser(u);
          return getUserStats().catch(() => null);
        })
        .then((s) => { if (s) setStats(s); })
        .catch(() => removeAuthToken());
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        stats,
        isLoading,
        isAuthenticated,
        refreshUser,
        syncWithBackend,
        updateProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside a UserProvider");
  return ctx;
}
