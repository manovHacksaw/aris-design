"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";

import { useUser } from "@/context/UserContext";
import { perfLog, perfNow } from "@/lib/perf";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/register",
  "/onboard",
  "/admin",
  "/claim-brand",
  "/brand/pending",
  "/explore",
  "/leaderboard",
  "/events",
  "/create",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar skeleton (collapsed, 72px) */}
      <div className="hidden md:flex flex-col w-[72px] shrink-0 border-r border-white/5 py-4 px-3 gap-3">
        <div className="h-9 w-9 rounded-xl bg-surface-hover animate-pulse mx-auto" />
        <div className="flex-1 space-y-2 mt-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-9 rounded-xl bg-surface animate-pulse mx-auto"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
        <div className="space-y-2 items-center flex flex-col">
          <div className="h-9 w-9 rounded-xl bg-surface animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-surface-hover animate-pulse" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-white/5">
          <div className="h-6 w-20 rounded-lg bg-surface animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-surface animate-pulse" />
            <div className="h-8 w-8 rounded-xl bg-surface animate-pulse" />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-[1600px] mx-auto space-y-10 pt-4">

            {/* Hero block skeleton */}
            <div className="rounded-3xl border border-surface-border bg-surface p-8 space-y-4">
              <div className="space-y-2">
                <div className="h-12 w-72 rounded-xl bg-surface-hover animate-pulse" />
                <div className="h-12 w-56 rounded-xl bg-surface-hover animate-pulse" style={{ animationDelay: "80ms" }} />
                <div className="h-12 w-40 rounded-xl bg-surface-hover animate-pulse" style={{ animationDelay: "160ms" }} />
              </div>
              <div className="h-4 w-64 rounded-lg bg-surface animate-pulse" style={{ animationDelay: "240ms" }} />
            </div>

            {/* Search bar skeleton */}
            <div className="h-14 max-w-3xl rounded-2xl bg-surface border border-surface-border animate-pulse" />

            {/* Event rows skeleton (3 rows) */}
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="space-y-4" style={{ animationDelay: `${row * 100}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="h-6 w-40 rounded-lg bg-surface-hover animate-pulse" />
                  <div className="h-4 w-16 rounded-lg bg-surface animate-pulse" />
                </div>
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-[280px] aspect-[4/5] rounded-2xl bg-surface animate-pulse border border-surface-border"
                      style={{ animationDelay: `${i * 70}ms` }}
                    />
                  ))}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isConnected, isInitialized, isLoading: walletLoading } = useWallet();
  const { isOnboarded: authIsOnboarded, role: authRole, isLoading: authLoading } = useAuth();
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isOnboarded = user?.isOnboarded || authIsOnboarded;
  // Normalize: backend sends "BRAND_OWNER", localStorage sends "brand"
  const isBrand = user?.role === "BRAND_OWNER" || authRole === "brand";
  // Brand is active only after admin approval + claim. Null/undefined ownedBrands means not yet claimed.
  const brandIsActive = user?.ownedBrands?.[0]?.isActive === true;

  // Block routing decisions while Privy/wallet initializes OR while the user API call
  // is in-flight and we don't yet have a confirmed onboarding status. Without this,
  // a refresh on any protected route redirects to /onboard/* because user=null
  // transiently while syncWithBackend() is running.
  const isLoading = !isInitialized || walletLoading || authLoading || (isConnected && userLoading && !isOnboarded);
  const loadStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading && loadStartRef.current === null) {
      loadStartRef.current = perfNow();
      perfLog("auth-guard", "loading started");
      return;
    }
    if (!isLoading && loadStartRef.current !== null) {
      const elapsed = perfNow() - loadStartRef.current;
      perfLog("auth-guard", `loading cleared in ${elapsed.toFixed(1)}ms`, {
        isAuthenticated,
        isConnected,
        pathname,
      });
      loadStartRef.current = null;
    }
  }, [isLoading, isAuthenticated, isConnected, pathname]);

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated — redirect to explore
    if (!isAuthenticated) {
      if (!isPublicPath(pathname)) {
        router.replace("/explore");
      }
      return;
    }

    // Session exists but smart-wallet address can lag briefly; avoid false logout redirects.
    if (!isConnected) return;

    // Authenticated but not onboarded — send to signup to complete onboarding
    if (!isOnboarded) {
      if (!isPublicPath(pathname)) {
        const redirectUrl = `?redirect=${encodeURIComponent(pathname)}`;
        if (isBrand) {
          router.replace(`/onboard/brand${redirectUrl}`);
        } else {
          router.replace(`/onboard/user${redirectUrl}`);
        }
      }
      return;
    }

    // Already onboarded — skip signup/register pages and redirect to their home
    // But only redirect away from truly "public" paths (not /admin, /claim-brand, /brand/pending)
    const isAuthOnlyPublicPath = pathname === "/register" || pathname.startsWith("/register/") || pathname === "/onboard" || pathname.startsWith("/onboard/");
    if (isOnboarded && isAuthOnlyPublicPath) {
      // Check for 'redirect' query param in URL to return to original destination
      const searchParams = new URLSearchParams(window.location.search);
      const redirectPath = searchParams.get("redirect");
      
      if (redirectPath) {
        router.replace(redirectPath);
      } else if (isBrand) {
        router.replace(brandIsActive ? "/brand/dashboard" : "/brand/pending");
      } else {
        router.replace("/");
      }
      return;
    }

    // Brand owner trying to access user-only routes → redirect to brand dashboard (or pending)
    // Skip if brand preview mode is active (brand owner viewing user experience)
    const isBrandPreview = typeof window !== "undefined" && sessionStorage.getItem("brand_preview_mode") === "true";
    if (isOnboarded && isBrand && !pathname.startsWith("/brand/") && !isBrandPreview) {
      router.replace(brandIsActive ? "/brand/dashboard" : "/brand/pending");
      return;
    }

    // Brand owner accessing brand routes but not yet approved/active → redirect to pending
    if (isOnboarded && isBrand && pathname.startsWith("/brand/") && !pathname.startsWith("/brand/pending") && !brandIsActive) {
      router.replace("/brand/pending");
      return;
    }

    // Regular user trying to access brand routes → redirect to home
    if (isOnboarded && !isBrand && pathname.startsWith("/brand/")) {
      router.replace("/");
      return;
    }
  }, [isLoading, isAuthenticated, isConnected, isOnboarded, isBrand, brandIsActive, pathname, router]);

  // Public paths handle their own loading state
  if (isLoading) {
    if (isPublicPath(pathname)) {
      return <>{children}</>;
    }
    return <AppSkeleton />;
  }

  // Not connected — render null while redirect happens
  if (!isAuthenticated && !isPublicPath(pathname)) {
    return null;
  }

  // Authenticated session present, waiting for smart-wallet address hydration.
  if (isAuthenticated && !isConnected && !isPublicPath(pathname)) {
    return <AppSkeleton />;
  }

  // Connected but not onboarded — render null while redirect happens
  if (isConnected && !isOnboarded && !isPublicPath(pathname)) {
    return null;
  }

  // Brand owner accessing brand routes (except /brand/pending) while not yet active
  // — render null so the sidebar + page never flash before the redirect fires
  const isBrandProtectedRoute = pathname.startsWith("/brand/") && !pathname.startsWith("/brand/pending");
  if (isConnected && isOnboarded && isBrand && isBrandProtectedRoute && !brandIsActive) {
    return null;
  }

  // Already onboarded on /register or /onboard — render null while redirect fires
  // (but not /admin, /claim-brand, /brand/pending — those are always accessible)
  const isAuthOnlyPublicPath = pathname === "/register" || pathname.startsWith("/register/") || pathname === "/onboard" || pathname.startsWith("/onboard/");
  if (isConnected && isOnboarded && isAuthOnlyPublicPath) {
    return null;
  }

  return <>{children}</>;
}
