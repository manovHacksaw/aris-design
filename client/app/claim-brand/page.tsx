"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Building2 } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useUser } from "@/context/UserContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ClaimBrandInfo {
  brandName: string;
  companyName?: string;
  contactEmail: string;
}

function ClaimBrandContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { isConnected, address, isInitialized } = useWallet();
  const { user, refreshUser } = useUser();

  const [state, setState] = useState<"loading" | "valid" | "claiming" | "success" | "error">("loading");
  const [brandInfo, setBrandInfo] = useState<ClaimBrandInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMsg("No activation token provided. Please check your email link.");
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/brand-claim/claim/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Invalid or expired activation link.");
        }
        const data = await res.json();
        setBrandInfo(data.application ?? data);
        setState("valid");
      } catch (err: any) {
        setState("error");
        setErrorMsg(err.message || "Failed to validate activation link.");
      }
    };

    validate();
  }, [token]);

  const handleClaim = async () => {
    if (!token || !address) return;
    setState("claiming");

    try {
      const res = await fetch(`${API_BASE_URL}/brand-claim/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimToken: token,
          email: user?.email || brandInfo?.contactEmail || "",
          walletAddress: address,
          displayName: user?.displayName || brandInfo?.brandName || "",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to activate brand.");
      }

      // Refresh user so role + ownedBrands get updated
      await refreshUser();
      setState("success");
      setTimeout(() => router.replace("/brand/dashboard"), 1500);
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
          <p className="text-zinc-400 text-sm">Validating your activation link…</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Brand Activated!</h1>
          <p className="text-zinc-400">Redirecting you to the dashboard…</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Activation Failed</h1>
          <p className="text-zinc-400 mb-6">{errorMsg}</p>
          <a
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
          >
            Go to Register
          </a>
        </div>
      </div>
    );
  }

  // state === "valid" | "claiming"
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Brand info card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Activate Your Brand</h1>
          {brandInfo && (
            <p className="text-zinc-400 mb-2">
              You've been approved to claim{" "}
              <span className="text-white font-semibold">{brandInfo.brandName}</span>
              {brandInfo.companyName && ` (${brandInfo.companyName})`}.
            </p>
          )}
          <p className="text-zinc-500 text-sm">
            Connect your wallet below to complete the activation.
          </p>
        </div>

        {/* Wallet status + claim */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          {!isInitialized ? (
            <div className="flex items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Initializing wallet…</span>
            </div>
          ) : isConnected && address ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500">Connected wallet</p>
                  <p className="text-sm font-mono text-white truncate">{address}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              </div>

              <button
                onClick={handleClaim}
                disabled={state === "claiming"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {state === "claiming" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Activate Brand
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-zinc-400 text-sm">
                Please connect your wallet to activate your brand.
              </p>
              <a
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors"
              >
                Connect Wallet
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClaimBrandPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    }>
      <ClaimBrandContent />
    </Suspense>
  );
}
