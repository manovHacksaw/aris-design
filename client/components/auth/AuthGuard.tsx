"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";

import { useUser } from "@/context/UserContext";

// Paths that don't require authentication (wallet or onboarding)
const PUBLIC_PATHS = ["/register", "/onboard", "/admin", "/claim-brand", "/brand/pending"];

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
        <div className="h-9 w-9 rounded-xl bg-white/[0.07] animate-pulse mx-auto" />
        <div className="flex-1 space-y-2 mt-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-9 rounded-xl bg-white/[0.04] animate-pulse mx-auto"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
        <div className="space-y-2 items-center flex flex-col">
          <div className="h-9 w-9 rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-white/[0.07] animate-pulse" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-white/5">
          <div className="h-6 w-20 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="h-8 w-8 rounded-xl bg-white/[0.04] animate-pulse" />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Page title */}
            <div className="space-y-2">
              <div className="h-9 w-64 rounded-xl bg-white/[0.06] animate-pulse" />
              <div className="h-4 w-44 rounded-lg bg-white/[0.03] animate-pulse" />
            </div>

            {/* Trending row */}
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 w-48 shrink-0 rounded-2xl bg-white/[0.04] animate-pulse"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 flex-wrap">
              {[72, 88, 64, 96, 80].map((w, i) => (
                <div
                  key={i}
                  className="h-8 rounded-full bg-white/[0.04] animate-pulse"
                  style={{ width: `${w}px`, animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>

            {/* Feed grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-white/[0.04] animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isInitialized, isLoading: walletLoading } = useWallet();
  const { isOnboarded: authIsOnboarded, role: authRole, isLoading: authLoading } = useAuth();
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isOnboarded = user?.isOnboarded || authIsOnboarded;
  // Normalize: backend sends "BRAND_OWNER", localStorage sends "brand"
  const isBrand = user?.role === "BRAND_OWNER" || authRole === "brand";
  // Brand is active only after admin approval + claim. Null/undefined ownedBrands means not yet claimed.
  const brandIsActive = user?.ownedBrands?.[0]?.isActive === true;

  const isLoading = !isInitialized || walletLoading || authLoading || userLoading;

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated — redirect to register
    if (!isConnected) {
      if (!isPublicPath(pathname)) {
        router.replace("/register");
      }
      return;
    }

    // Authenticated but not onboarded — send to signup to complete onboarding
    if (!isOnboarded) {
      if (!isPublicPath(pathname)) {
        if (isBrand) {
          router.replace("/onboard/brand");
        } else {
          router.replace("/onboard/user");
        }
      }
      return;
    }

    // Already onboarded — skip signup/register pages and redirect to their home
    // But only redirect away from truly "public" paths (not /admin, /claim-brand, /brand/pending)
    const isAuthOnlyPublicPath = pathname === "/register" || pathname.startsWith("/register/") || pathname === "/onboard" || pathname.startsWith("/onboard/");
    if (isOnboarded && isAuthOnlyPublicPath) {
      if (isBrand) {
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
  }, [isLoading, isConnected, isOnboarded, isBrand, brandIsActive, pathname, router]);

  // Public paths handle their own loading state
  if (isLoading) {
    if (isPublicPath(pathname)) {
      return <>{children}</>;
    }
    return <AppSkeleton />;
  }

  // Not connected — render null while redirect happens
  if (!isConnected && !isPublicPath(pathname)) {
    return null;
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
