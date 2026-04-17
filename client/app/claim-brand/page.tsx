"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Loader2, ShieldCheck, Building2,
  Lock, AlertTriangle, Mail, ArrowRight, Wallet, ChevronLeft, LogOut,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ClaimBrandInfo {
  brandName: string;
  companyName?: string;
  contactEmail: string;
}

// ─── Claim Content ────────────────────────────────────────────────────────────

function ClaimBrandContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { isConnected, isInitialized, address, connect, disconnect, userInfo } = useWallet();
  const { user, refreshUser } = useUser();

  // 1. Data fetching state
  const [tokenState, setTokenState] = useState<{
    status: "loading" | "success" | "error";
    data: ClaimBrandInfo | null;
    error: string;
  }>({ status: "loading", data: null, error: "" });

  // 2. Auth transition state
  // Persisted in sessionStorage so a Privy OAuth redirect doesn't reset it and
  // cause the page to immediately log the user out again on remount.
  const sessionKey = token ? `aris_claim_flo_${token}` : null;
  const [hasForcedLogout, setHasForcedLogoutState] = useState(() => {
    if (!sessionKey || typeof window === "undefined") return false;
    return sessionStorage.getItem(sessionKey) === "1";
  });
  const setHasForcedLogout = (v: boolean) => {
    if (v && sessionKey) sessionStorage.setItem(sessionKey, "1");
    setHasForcedLogoutState(v);
  };
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // 3. Claim action state
  const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "success" | "error">("idle");
  const [claimError, setClaimError] = useState("");

  // ── 1. Validate token (once on mount) ─────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenState({
        status: "error",
        data: null,
        error: "No activation token provided. Please check your email link.",
      });
      return;
    }

    let cancelled = false;

    const validate = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/brand-claim/claim/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Invalid or expired activation link.");
        }
        const data = await res.json();
        if (!cancelled) {
          // API returns { brand: { name, brandOwnerEmail, companyName, ... } }
          const brand = data.brand ?? data.application ?? data;
          setTokenState({
            status: "success",
            data: {
              brandName: brand.name ?? brand.brandName,
              companyName: brand.companyName,
              contactEmail: brand.brandOwnerEmail ?? brand.contactEmail,
            },
            error: "",
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setTokenState({
            status: "error",
            data: null,
            error: err.message || "Failed to validate activation link.",
          });
        }
      }
    };

    validate();
    return () => { cancelled = true; };
  }, [token]);

  // ── 2. Force Initial Logout if needed ─────────────────────────────────────
  useEffect(() => {
    if (!isInitialized || tokenState.status !== "success" || hasForcedLogout || isDisconnecting) return;

    if (isConnected) {
      setIsDisconnecting(true);
      disconnect().finally(() => {
        setIsDisconnecting(false);
        setHasForcedLogout(true);
      });
    } else {
      setHasForcedLogout(true);
    }
  }, [isInitialized, tokenState.status, isConnected, hasForcedLogout, isDisconnecting, disconnect]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSignIn = () => connect();

  const handleSignOutAndRetry = async () => {
    setIsDisconnecting(true);
    await disconnect();
    setIsDisconnecting(false);
  };

  const handleClaim = async () => {
    if (!token || !address || !tokenState.data) return;
    setClaimStatus("claiming");
    setClaimError("");
    try {
      const res = await fetch(`${API_BASE_URL}/brand-claim/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimToken: token,
          email: tokenState.data.contactEmail || "",
          walletAddress: address,
          displayName: tokenState.data.brandName || "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to activate brand.");
      }
      await refreshUser();
      if (sessionKey) sessionStorage.removeItem(sessionKey);
      setClaimStatus("success");
      setTimeout(() => router.replace("/brand/dashboard"), 2000);
    } catch (err: any) {
      setClaimStatus("error");
      setClaimError(err.message || "Something went wrong. Please try again.");
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render states
  // ──────────────────────────────────────────────────────────────────────────

  if (tokenState.status === "loading" || !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-foreground/40 text-sm font-medium">Validating your activation link…</p>
        </div>
      </div>
    );
  }

  if (tokenState.status === "error" || claimStatus === "error") {
    const errorMsg = claimStatus === "error" ? claimError : tokenState.error;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-5 text-center"
        >
          <div className="bg-card border border-border/50 rounded-2xl p-8 space-y-5">
            <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-display uppercase tracking-tight text-foreground mb-2">
                Activation <span className="text-red-400">Failed</span>
              </h1>
              <p className="text-foreground/50 text-sm leading-relaxed">{errorMsg}</p>
            </div>
          </div>
          <div className="bg-card/50 border border-border/40 rounded-2xl p-4 text-left space-y-2">
            <p className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">Common issues</p>
            {[
              "Link has expired (valid for 48 hours after approval)",
              "Link has already been used (single-use only)",
              "Wrong email — must match the registered contact email",
              "Token is invalid or malformed",
            ].map((issue) => (
              <div key={issue} className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/50">{issue}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <a href="/register" className="flex-1 py-3.5 rounded-[14px] border border-border/50 text-foreground/50 hover:text-foreground font-bold text-xs uppercase tracking-widest text-center transition-colors">
              Back to Register
            </a>
            <a href="mailto:support@aris.xyz" className="flex-1 py-3.5 rounded-[14px] bg-primary text-foreground font-black text-xs uppercase tracking-widest text-center hover:bg-primary/90 transition-colors">
              Contact Support
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  if (claimStatus === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card border border-border/50 rounded-2xl p-10 text-center space-y-5"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 bg-primary/10 border-[3px] border-primary rounded-2xl flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-4xl font-display uppercase tracking-tight text-foreground mb-2">
              Brand <span className="text-primary">Activated!</span>
            </h1>
            <p className="text-foreground/50 text-sm">Redirecting you to your brand dashboard…</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-foreground/30">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs font-medium">Setting up your dashboard</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const brandInfo = tokenState.data!;

  if (isDisconnecting || !hasForcedLogout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center space-y-5"
        >
          <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <LogOut className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-display uppercase tracking-tight text-foreground">Signing Out</h2>
            <p className="text-sm text-foreground/40 mt-2 leading-relaxed">
              Clearing your existing session before brand activation.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-foreground/30">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs font-medium">Please wait…</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-5"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 border-[3px] border-primary/30 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-display uppercase tracking-tight">
                Activate Your <span className="text-primary">Brand</span>
              </h1>
              {brandInfo && (
                <p className="text-foreground/50 text-sm mt-2">
                  You've been approved to activate{" "}
                  <span className="text-foreground font-bold">{brandInfo.brandName}</span>
                  {brandInfo.companyName && ` (${brandInfo.companyName})`}.
                </p>
              )}
            </div>
          </div>

          <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-black text-foreground">Identity Verification Required</p>
            </div>
            <p className="text-xs text-foreground/60 leading-relaxed">
              This activation link is exclusively tied to the email below.
              Sign in with exactly this account to claim your brand.
            </p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] bg-background/60 border border-primary/20">
              <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-sm font-bold text-primary">{brandInfo?.contactEmail}</span>
            </div>
          </div>

          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-[14px] bg-primary text-foreground font-black text-xs uppercase tracking-[0.2em] hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            <ShieldCheck className="w-4 h-4" />
            Sign In with Privy
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[11px] text-foreground/30">
            Only <span className="text-foreground/50 font-bold">{brandInfo?.contactEmail}</span> can activate this brand.
          </p>
        </motion.div>
      </div>
    );
  }

  const currentEmail = (userInfo?.email || user?.email || "").toLowerCase();
  const requiredEmail = brandInfo.contactEmail.toLowerCase();
  const displayEmail = userInfo?.email || user?.email || "Unknown";

  if (!currentEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-foreground/40 text-sm font-medium">Fetching your profile…</p>
        </div>
      </div>
    );
  }

  if (currentEmail !== requiredEmail) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-4"
        >
          <div className="bg-card border border-red-500/30 rounded-2xl p-8 space-y-5 text-center">
            <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-3xl font-display uppercase tracking-tight text-foreground">
                Wrong <span className="text-red-400">Account</span>
              </h2>
              <p className="text-sm text-foreground/50 mt-2 leading-relaxed">
                You signed in with a different email than the one registered for this brand.
              </p>
            </div>
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] bg-red-500/10 border border-red-500/20">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-red-400/70 font-bold uppercase tracking-widest">Signed in as</p>
                  <p className="text-sm font-bold text-red-400 truncate">{displayEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] bg-primary/5 border border-primary/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-primary/70 font-bold uppercase tracking-widest">Required email</p>
                  <p className="text-sm font-bold text-primary truncate">{brandInfo?.contactEmail}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOutAndRetry}
            disabled={isDisconnecting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-[14px] bg-card border border-border/50 text-foreground font-black text-xs uppercase tracking-[0.15em] hover:border-primary/40 hover:text-primary active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {isDisconnecting ? "Signing Out..." : "Sign Out & Try Again"}
          </button>

          <p className="text-center text-[11px] text-foreground/30">
            You will be prompted to sign in with the correct email.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      <div className="sticky top-0 z-10 border-b border-border/30 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-3">
        <a href="/register" className="flex items-center gap-1.5 text-foreground/40 hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Back</span>
        </a>
        <span className="text-xs font-bold text-foreground/25 uppercase tracking-widest ml-auto">Brand Activation</span>
      </div>

      <div className="max-w-lg mx-auto px-6 py-12 space-y-5">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 border-[3px] border-primary/30 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-display uppercase tracking-tight">
              Activate Your <span className="text-primary">Brand</span>
            </h1>
            {brandInfo && (
              <p className="text-foreground/50 text-sm mt-2">
                You've been approved to activate{" "}
                <span className="text-foreground font-bold">{brandInfo.brandName}</span>
                {brandInfo.companyName && ` (${brandInfo.companyName})`}.
              </p>
            )}
          </div>
        </motion.div>

        {/* Email verified badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-green-500/10 border border-green-500/20"
        >
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-green-400 uppercase tracking-widest">Identity Verified</p>
            <p className="text-sm font-bold text-foreground truncate mt-0.5">
              {displayEmail}
            </p>
          </div>
        </motion.div>

        {/* Wallet & Claim */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border/50 rounded-2xl p-6 space-y-4"
        >
          <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Wallet Connection</p>

          {address ? (
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-background/50 border border-border/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground/40 font-medium">Smart wallet</p>
                <p className="text-sm font-mono text-foreground truncate">{address}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-foreground/40 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Setting up wallet…</span>
            </div>
          )}

          <button
            onClick={handleClaim}
            disabled={claimStatus === "claiming" || !address}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 rounded-[14px] font-black text-sm uppercase tracking-[0.15em] transition-all",
              claimStatus === "claiming" || !address
                ? "bg-primary/50 text-white cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90 active:scale-[0.99] shadow-lg shadow-primary/20"
            )}
          >
            {claimStatus === "claiming"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating Brand…</>
              : <><Building2 className="w-4 h-4" /> Activate Brand</>
            }
          </button>
        </motion.div>

        {/* Security notes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card/40 border border-border/30 rounded-2xl p-4 space-y-2"
        >
          <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Security</p>
          {[
            "This activation link is single-use and expires after 48 hours",
            "Your brand name is immutable after activation",
            "Only the registered contact email can claim this brand",
          ].map((note) => (
            <div key={note} className="flex items-start gap-2">
              <Lock className="w-3 h-3 text-foreground/30 shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground/40">{note}</p>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  );
}

// ─── Page Wrapper ─────────────────────────────────────────────────────────────

export default function ClaimBrandPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <ClaimBrandContent />
    </Suspense>
  );
}
