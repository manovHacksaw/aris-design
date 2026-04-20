"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import { useWallet } from "@/context/WalletContext";
import {
  Megaphone, BarChart3, Users, Trophy, Coins, Target,
  ShieldCheck, TrendingUp, ArrowRight, Check, Zap, Globe,
  Star, Lock, Rocket, LogIn, AlertTriangle, Loader2,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Megaphone,
    title: "Campaign & Event Creation",
    desc: "Launch post-and-vote campaigns or opinion polls. Set timelines, reward pools, and audience targeting in minutes.",
    accent: "blue",
  },
  {
    icon: Users,
    title: "Audience Engagement",
    desc: "Drive real participation through incentivized content challenges. Your audience becomes your content creators.",
    accent: "purple",
  },
  {
    icon: BarChart3,
    title: "Content-Driven Market Research",
    desc: "Collect authentic consumer opinions through voting campaigns. Replace surveys with engaging interactive formats.",
    accent: "green",
  },
  {
    icon: Coins,
    title: "USDC Reward Distribution",
    desc: "Distribute real USDC rewards on Polygon. Transparent, on-chain, and trustless with automatic disbursement.",
    accent: "yellow",
  },
  {
    icon: Target,
    title: "Creator Discovery",
    desc: "Identify high-quality creators from your campaign participants. Find your next brand ambassador through performance.",
    accent: "pink",
  },
  {
    icon: TrendingUp,
    title: "Brand Analytics & Insights",
    desc: "Track engagement rates, submission quality, vote patterns, and audience demographics from a unified dashboard.",
    accent: "cyan",
  },
  {
    icon: ShieldCheck,
    title: "Trust & Verification",
    desc: "Get a verified brand badge. Build credibility through our brand scoring system and transparent history.",
    accent: "orange",
  },
  {
    icon: Globe,
    title: "Community Building",
    desc: "Build a loyal subscriber base. Users follow brands they love and receive instant campaign notifications.",
    accent: "indigo",
  },
  {
    icon: Trophy,
    title: "Leaderboards & Competition",
    desc: "Drive viral participation through competitive leaderboards. Top creators earn bonus rewards and recognition.",
    accent: "blue",
  },
];

const STATS = [
  { value: "10K+", label: "Active Users" },
  { value: "$50K+", label: "Rewards Distributed" },
  { value: "48h", label: "Review Time" },
  { value: "100%", label: "On-Chain Rewards" },
];

const STEPS_PREVIEW = [
  {
    step: "01",
    title: "Submit Application",
    desc: "Fill out your brand profile, contact details, and intended use. Takes about 5–10 minutes.",
  },
  {
    step: "02",
    title: "Admin Review",
    desc: "Our team personally verifies each brand within 24–48 hours. No bots, no automated approvals.",
  },
  {
    step: "03",
    title: "Claim Your Brand",
    desc: "Receive a secure single-use activation link at your verified email. Connect your wallet to complete setup.",
  },
  {
    step: "04",
    title: "Launch Campaigns",
    desc: "Access your brand dashboard. Create events, set USDC reward pools, and start engaging your audience.",
  },
];

const INCLUDED = [
  "Unlimited campaign creation with custom USDC reward pools",
  "Real on-chain reward distribution to participants on Polygon",
  "Brand verification badge & credibility scoring",
  "Advanced audience analytics & engagement metrics",
  "Creator discovery from top campaign performers",
  "Real-time notifications & submission monitoring",
  "Dedicated brand dashboard with financial overview",
  "Multi-category targeting & audience segmentation",
  "Post-and-vote or pure voting campaign formats",
  "Subscriber community & brand following system",
];

const accentMap: Record<string, string> = {
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  green: "text-green-400 bg-green-500/10 border-green-500/20",
  yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  pink: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandValuePropositionPage() {
  const { user, isLoading: userLoading, syncWithBackend } = useUser();
  const { connect, isLoading: walletLoading, isConnected } = useWallet();
  const router = useRouter();
  const hasSyncedRef = useRef(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  // After wallet connects on this page, manually sync once (demo pattern).
  // UserContext skips auto-sync on /register-brand to avoid creating phantom users.
  useEffect(() => {
    if (isConnected && !user && !userLoading && !isCheckingUser && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      setIsCheckingUser(true);
      syncWithBackend().finally(() => setIsCheckingUser(false));
    }
  }, [isConnected, user, userLoading, isCheckingUser, syncWithBackend]);

  // Reset sync flag when wallet disconnects (new login attempt)
  useEffect(() => {
    if (!isConnected) {
      hasSyncedRef.current = false;
    }
  }, [isConnected]);

  // Redirect brand owners immediately
  useEffect(() => {
    if (user?.role === "BRAND_OWNER") {
      router.replace("/brand/dashboard");
    }
  }, [user, router]);

  // Auto-redirect regular users to home after 3 s
  useEffect(() => {
    if (user?.role === "USER" && user.isOnboarded) {
      const t = setTimeout(() => router.push("/"), 3000);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  function handleBrandLogin() {
    if (isConnected && !isCheckingUser) {
      // Already authenticated — re-sync directly instead of re-opening Privy modal
      hasSyncedRef.current = true;
      setIsCheckingUser(true);
      syncWithBackend().finally(() => setIsCheckingUser(false));
    } else {
      connect();
    }
  }

  const isAuthenticating = isConnected && !user && (isCheckingUser || userLoading);

  // ── State: still checking after login ─────────────────────────────────────
  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // ── State: brand owner detected ────────────────────────────────────────────
  if (user?.role === "BRAND_OWNER") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // ── State: regular user detected ───────────────────────────────────────────
  if (user?.role === "USER" && user.isOnboarded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center bg-card border border-amber-500/30 rounded-2xl p-8 space-y-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-display uppercase tracking-tight text-foreground mb-2">
              User Account Detected
            </h2>
            <p className="text-sm text-foreground/50 leading-relaxed">
              This area is for Brand Owners only. Redirecting you to the home page in a moment...
            </p>
          </div>
            <button
            onClick={() => router.push("/")}
            className="w-full py-3 px-6 rounded-[14px] bg-primary text-black font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Sticky Nav */}
      <div className="sticky top-0 z-20 border-b border-border/30 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors shrink-0">
          <span className="text-base sm:text-lg font-display uppercase tracking-widest">
            Aris <span className="text-primary">Brands</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="text-xs font-bold text-foreground/40 hover:text-foreground transition-colors uppercase tracking-widest hidden sm:block"
          >
            Home
          </Link>
          <Link
            href="/claim-brand"
            className="text-xs font-bold text-foreground/40 hover:text-foreground transition-colors uppercase tracking-widest hidden md:block"
          >
            Already Approved?
          </Link>
          <button
            onClick={handleBrandLogin}
            disabled={walletLoading || isCheckingUser}
            aria-label="Log in to your brand dashboard"
            className="inline-flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 border border-border/50 text-foreground/70 hover:text-foreground hover:border-border text-xs font-black uppercase tracking-widest rounded-full transition-colors hidden sm:flex cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {walletLoading || isCheckingUser ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogIn className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Brand Login</span>
          </button>
          <Link
            href="/register-brand/application"
            className="px-3 sm:px-5 py-2 sm:py-2.5 bg-primary text-black text-xs font-black uppercase tracking-widest rounded-full hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Apply Now
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="relative px-4 sm:px-6 py-16 sm:py-24 md:py-32 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[200px] sm:h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-5xl mx-auto space-y-5 sm:space-y-7"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary uppercase tracking-widest"
          >
            <Zap className="w-3 h-3" /> For Brands & Organizations
          </motion.div>

          <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[104px] font-display uppercase tracking-tight leading-none">
            Power Your Brand<br />
            <span className="text-primary">with Aris</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-foreground/50 max-w-2xl mx-auto leading-relaxed px-2">
            Create incentivized campaigns, distribute real USDC rewards on-chain, discover top creators, and build authentic community engagement — all in one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            <Link
              href="/register-brand/application"
              className="flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-black font-black text-sm uppercase tracking-[0.18em] rounded-[14px] hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20 w-full sm:w-auto justify-center"
            >
              Start Application <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="px-6 sm:px-8 py-3.5 sm:py-4 border border-border/50 text-foreground/60 font-bold text-xs uppercase tracking-widest rounded-[14px] hover:border-border hover:text-foreground transition-colors w-full sm:w-auto text-center"
            >
              How It Works
            </a>
          </div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="px-4 sm:px-6 py-8 sm:py-12 border-y border-border/30 bg-card/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map(({ value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.4 }}
              className="text-center"
            >
              <p className="text-3xl sm:text-4xl md:text-5xl font-display text-primary">{value}</p>
              <p className="text-[10px] sm:text-[11px] text-foreground/40 mt-1 font-bold uppercase tracking-widest">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[11px] font-black text-primary/70 uppercase tracking-widest mb-3">Platform Capabilities</p>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-display uppercase tracking-tight leading-tight">
            Everything You Need<br />
            <span className="text-primary">to Drive Results</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, accent }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.4 }}
              className="bg-card border border-border/50 rounded-2xl p-4 sm:p-6 space-y-2.5 sm:space-y-3 hover:border-border transition-colors group"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center ${accentMap[accent]}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-black text-foreground">{title}</h3>
              <p className="text-xs text-foreground/50 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 sm:px-6 py-16 sm:py-24 border-t border-border/30 bg-card/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-[11px] font-black text-primary/70 uppercase tracking-widest mb-3">The Process</p>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-display uppercase tracking-tight leading-tight">
              From Application<br />
              <span className="text-primary">to Live Campaigns</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {STEPS_PREVIEW.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 sm:gap-5 bg-card border border-border/50 rounded-2xl p-4 sm:p-6">
                <div className="text-4xl sm:text-5xl font-display text-primary/20 leading-none shrink-0 select-none">{step}</div>
                <div className="pt-0.5 sm:pt-1">
                  <h3 className="text-xs sm:text-sm font-black text-foreground mb-1.5">{title}</h3>
                  <p className="text-xs text-foreground/50 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 border-t border-border/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-[11px] font-black text-primary/70 uppercase tracking-widest mb-3">
              Included with Every Brand Account
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-display uppercase tracking-tight leading-tight">
              Built for Serious<br />
              <span className="text-primary">Brand Growth</span>
            </h2>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-8 space-y-3 sm:space-y-4">
            {INCLUDED.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs sm:text-sm text-foreground/70 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Approval Notice */}
      <section className="px-4 sm:px-6 py-10 sm:py-12 border-t border-border/30">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              icon: ShieldCheck,
              title: "Manual Review",
              desc: "Every brand is personally reviewed by our team. No automated approvals — we maintain quality.",
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              icon: Lock,
              title: "Email-Verified Claim",
              desc: "Your brand activation link is tied to your verified email. Only you can claim your brand.",
              color: "text-green-400",
              bg: "bg-green-500/10 border-green-500/20",
            },
            {
              icon: Star,
              title: "Credibility Score",
              desc: "Providing documentation boosts your brand credibility score, unlocking higher trust levels.",
              color: "text-yellow-400",
              bg: "bg-yellow-500/10 border-yellow-500/20",
            },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className={`rounded-2xl border p-5 space-y-3 ${bg}`}>
              <Icon className={`w-6 h-6 ${color}`} />
              <h3 className="text-sm font-black text-foreground">{title}</h3>
              <p className="text-xs text-foreground/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="px-4 sm:px-6 py-20 sm:py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-2xl mx-auto space-y-5 sm:space-y-7"
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary uppercase tracking-widest">
            <Rocket className="w-3 h-3" /> Ready to grow?
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-display uppercase tracking-tight">
            Start Your<br />
            <span className="text-primary">Application</span>
          </h2>
          <p className="text-foreground/40 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
            The application takes 5–10 minutes. Be detailed and honest — our team reviews each submission personally. You'll hear back within 24–48 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/register-brand/application"
              className="inline-flex items-center gap-3 px-7 sm:px-10 py-4 sm:py-5 bg-primary text-black font-black text-sm uppercase tracking-[0.18em] rounded-[14px] hover:bg-primary/90 active:scale-95 transition-all shadow-xl shadow-primary/20 w-full sm:w-auto justify-center"
            >
              Continue to Application <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
            </Link>
            <Link
              href="/register"
              className="text-xs text-foreground/30 hover:text-foreground/60 font-bold uppercase tracking-widest transition-colors"
            >
              Not a brand? Register as User
            </Link>
          </div>
          <p className="text-[11px] text-foreground/20 px-4">
            By applying you agree to our Brand Terms of Service. All applications are subject to manual review and approval.
          </p>
        </motion.div>
      </section>

    </div>
  );
}
