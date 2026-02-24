"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// Paths that don't require authentication
const PUBLIC_PATHS = ["/register", "/signup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isInitialized, isLoading: walletLoading } = useWallet();
  const { isOnboarded, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = !isInitialized || walletLoading || authLoading;

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated — redirect to register
    if (!isConnected) {
      if (!isPublicPath(pathname)) {
        router.replace("/register");
      }
      return;
    }

    // Authenticated but not onboarded — send to register to complete onboarding
    if (!isOnboarded) {
      if (!isPublicPath(pathname)) {
        if (role === "brand") {
          router.replace("/signup/brand");
        } else {
          router.replace("/signup/user");
        }
      }
      return;
    }

    // Brand owner trying to access user-only routes → redirect to brand dashboard
    if (isOnboarded && role === "brand" && !pathname.startsWith("/brand/")) {
      router.replace("/brand/dashboard");
      return;
    }

    // Regular user trying to access brand routes → redirect to home
    if (isOnboarded && role === "user" && pathname.startsWith("/brand/")) {
      router.replace("/");
      return;
    }
  }, [isLoading, isConnected, isOnboarded, role, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Not connected — render null while redirect happens
  if (!isConnected && !isPublicPath(pathname)) {
    return null;
  }

  // Connected but not onboarded — render null while redirect happens
  if (isConnected && !isOnboarded && !isPublicPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}
