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
} from "@/services/user.service";
import { authenticateWithPrivy, setPrivyTokenGetter, getAuthToken } from "@/services/api";
import type { User, UserStats, UpdateUserData } from "@/types/user";
import { perfLog, perfNow } from "@/lib/perf";

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
  const { address, eoaAddress, isConnected, isInitialized } = useWallet();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncedAddress, setSyncedAddress] = useState<string | null>(null);

  const syncingRef = useRef(false);
  const bootstrappedRef = useRef(false);

  // Derive loading: true while Privy/wallet init or actively syncing
  const isAuthenticated = !!(user && isConnected);

  /** Call /auth/privy-login to get a JWT, then fetch user + stats */
  const syncWithBackend = useCallback(async () => {
    if (syncingRef.current || !isConnected) return;
    const start = perfNow();
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
        googlePicture,
        eoaAddress ?? undefined
      );

      setUser(authUser);
      setSyncedAddress(address);
      perfLog("user", "syncWithBackend auth complete");

      // Fetch stats in parallel
      try {
        const s = await getUserStats();
        setStats(s);
      } catch {
        // stats failure is non-critical
      }
    } catch (err) {
      console.error("UserContext: sync failed", err);
      setUser(null);
      setStats(null);
    } finally {
      syncingRef.current = false;
      setIsLoading(false);
      perfLog("user", `syncWithBackend finished in ${(perfNow() - start).toFixed(1)}ms`);
    }
  }, [isConnected, address, getAccessToken, privyUser]);

  /** Re-fetch from /users/me (uses existing token) */
  const refreshUser = useCallback(async () => {
    const start = perfNow();
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
      perfLog("user", `refreshUser finished in ${(perfNow() - start).toFixed(1)}ms`);
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
      }
      setIsLoading(false);
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
    } else if (address === syncedAddress) {
      setIsLoading(false);
    }
  }, [isConnected, authenticated, isInitialized, ready, address, syncedAddress, pathname]);

  // Initialize the singleton Privy token getter needed across global API calls
  setPrivyTokenGetter(getAccessToken);

  // On mount, if there's an existing token, try to load user silently
  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (authenticated || isConnected) {
      bootstrappedRef.current = true;
      setIsLoading(false);
      return;
    }

    getAuthToken().then((token) => {
      if (token && !user) {
        getCurrentUser()
          .then((u) => {
            setUser(u);
            return getUserStats().catch(() => null);
          })
          .then((s) => { if (s) setStats(s); })
          .catch(() => { })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
      bootstrappedRef.current = true;
    });
  }, [authenticated, isConnected, user]);

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
