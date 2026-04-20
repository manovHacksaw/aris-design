"use client";

import { motion } from "framer-motion";
import {
  Flame,
  Copy,
  ExternalLink,
  Share2,
  Send,
  ThumbsUp,
  ImageIcon,
  Trophy,
  UserPlus,
  Star,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { useWallet } from "@/context/WalletContext";
import { xpForNextLevel } from "@/types/user";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getXpStatus,
  getXpTransactions,
  loginPing,
  type FullXpStatus,
  type XpTransactionSummary,
} from "@/services/xp.service";
import { getRewardHistory } from "@/services/reward.service";
import { perfLog, perfNow } from "@/lib/perf";

function buildDailyXP(transactions: XpTransactionSummary[], days = 7): number[] {
  const buckets: number[] = Array(days).fill(0);
  const now = new Date();
  for (const tx of transactions) {
    const diffMs = now.getTime() - new Date(tx.createdAt).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < days) {
      buckets[days - 1 - diffDays] += tx.amount;
    }
  }
  return buckets;
}

function relativeTime(dateStr: string, nowMs = Date.now()): string {
  const diff = nowMs - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins <= 0) return "Just now";
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface TxStyle {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  glow: string;
}

const TX_STYLES: Record<string, TxStyle> = {
  LOGIN_STREAK: { icon: Flame,    color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/25", glow: "group-hover:shadow-[0_0_12px_rgba(251,146,60,0.15)]" },
  VOTE_CAST:    { icon: ThumbsUp, color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-400/10",   border: "border-blue-400/25",   glow: "group-hover:shadow-[0_0_12px_rgba(96,165,250,0.15)]" },
  SUBMISSION:   { icon: ImageIcon, color: "text-lime-600 dark:text-lime-400",    bg: "bg-lime-400/10",   border: "border-lime-400/25",   glow: "group-hover:shadow-[0_0_12px_rgba(163,230,53,0.15)]" },
  MILESTONE:    { icon: Trophy,   color: "text-[#B6FF60]",                       bg: "bg-[#B6FF60]/10", border: "border-[#B6FF60]/25", glow: "group-hover:shadow-[0_0_12px_rgba(182,255,96,0.16)]" },
  REFERRAL:     { icon: UserPlus, color: "text-pink-600 dark:text-pink-400",     bg: "bg-pink-400/10",   border: "border-pink-400/25",   glow: "group-hover:shadow-[0_0_12px_rgba(244,114,182,0.15)]" },
  default:      { icon: Sparkles, color: "text-[#7C5FC4] dark:text-[#A78BFA]",  bg: "bg-[#A78BFA]/10",  border: "border-[#A78BFA]/25",  glow: "group-hover:shadow-[0_0_12px_rgba(167,139,250,0.15)]" },
};

function toHuman(key: string): string {
  return key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function txConfig(tx: XpTransactionSummary): { style: TxStyle; label: string; sub: string } {
  const style = TX_STYLES[tx.type] ?? TX_STYLES.default;

  // Parse backend milestone descriptions like "TOP_VOTES milestone: reached 10"
  const milestoneMatch = tx.description?.match(/^([A-Z0-9_]+)\s+milestone:\s+reached\s+(\d+)/i);
  if (milestoneMatch) {
    const key = milestoneMatch[1];
    const val = milestoneMatch[2];
    const milestoneStyleByKey: Record<string, TxStyle> = {
      TOP_VOTES: TX_STYLES.MILESTONE,
      VOTES_CAST: TX_STYLES.VOTE_CAST,
      TOP_3_CONTENT: TX_STYLES.default,
      LOGIN_STREAK: TX_STYLES.LOGIN_STREAK,
    };
    const milestoneStyle = milestoneStyleByKey[key] ?? TX_STYLES.MILESTONE;
    const labels: Record<string, { label: string; sub: string }> = {
      TOP_VOTES:     { label: "Top Votes Champion",  sub: `Your content got voted ${val} times!` },
      VOTES_CAST:    { label: "Active Voter",         sub: `You've cast ${val} votes!` },
      TOP_3_CONTENT: { label: "Podium Regular",       sub: `Landed in top 3, ${val} times!` },
      LOGIN_STREAK:  { label: "Streak Achiever",      sub: `Hit a ${val}-day login streak!` },
    };
    const found = labels[key];
    return { style: milestoneStyle, label: found?.label ?? `${toHuman(key)} Milestone`, sub: found?.sub ?? `Reached ${val}` };
  }

  // Pure SCREAMING_SNAKE_CASE description
  if (tx.description && /^[A-Z][A-Z0-9_]+$/.test(tx.description)) {
    return { style, label: toHuman(tx.description), sub: relativeTime(tx.createdAt) };
  }

  // Fallback to description or type-based label
  const labels: Record<string, { label: string; sub: string }> = {
    LOGIN_STREAK: { label: "Login Streak Bonus",  sub: "Keep it up — daily XP!" },
    SUBMISSION:   { label: "Post Submitted",       sub: "Entry accepted — good luck!" },
    VOTE_CAST:    { label: "Vote Cast",            sub: "Thanks for participating!" },
    MILESTONE:    { label: "Milestone Unlocked",   sub: "You hit a new milestone!" },
    REFERRAL:     { label: "Referral Bonus",       sub: "A friend joined via your code!" },
  };
  const fallback = labels[tx.type] ?? { label: tx.description ?? "XP Earned", sub: "" };
  return { style, label: fallback.label, sub: fallback.sub };
}

export default function RightDashboard() {
  const { user } = useUser();
  const { balance, address } = useWallet();
  const [copied, setCopied] = useState(false);
  const [xpStatus, setXpStatus] = useState<FullXpStatus | null>(null);
  const [transactions, setTransactions] = useState<XpTransactionSummary[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [xpLoading, setXpLoading] = useState(true);
  const [weeklyUsdcChange, setWeeklyUsdcChange] = useState<number | null>(null);
  const [weeklyUsdcLoaded, setWeeklyUsdcLoaded] = useState(false);

  const truncatedAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "0x00...0000";

  const streak = xpStatus?.streak?.current ?? user?.currentStreak ?? 0;
  const longestStreak = xpStatus?.streak?.longest ?? null;
  const referralCode = xpStatus?.referralStats?.referralCode ?? user?.referralCode ?? "—";
  const { progress } = xpForNextLevel(user?.xp ?? 0);
  const earnedToday = transactions
    .filter((tx) => nowMs - new Date(tx.createdAt).getTime() < 86400000)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const dailyXP = buildDailyXP(transactions, 7);
  const maxXP = Math.max(...dailyXP, 1);
  const weeklyBars = dailyXP.map((v) => Math.round((v / maxXP) * 100));

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      const start = perfNow();
      try {
        const status = await getXpStatus();
        if (!cancelled) {
          setXpStatus(status);
          setTransactions(status.recentTransactions || []);
          setXpLoading(false);
        }
        perfLog("right-dashboard", `xp status loaded in ${(perfNow() - start).toFixed(1)}ms`, {
          tx: status.recentTransactions?.length ?? 0,
        });
      } catch {
        if (!cancelled) setXpLoading(false);
      }
    }

    loadStatus();

    async function loadWeeklyUsdcChange() {
      try {
        const history = await getRewardHistory();
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const weeklyDelta = history.reduce((sum, entry) => {
          if (!entry.claimedAt) return sum;
          const claimedAtMs = new Date(entry.claimedAt).getTime();
          if (Number.isNaN(claimedAtMs) || claimedAtMs < weekAgo || claimedAtMs > now) return sum;
          return sum + Number(entry.finalAmount || 0);
        }, 0);
        if (!cancelled) {
          setWeeklyUsdcChange(weeklyDelta);
          setWeeklyUsdcLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setWeeklyUsdcChange(null);
          setWeeklyUsdcLoaded(true);
        }
      }
    }

    loadWeeklyUsdcChange();

    // Defer non-critical calls to reduce first-load fan-out.
    const deferred = setTimeout(() => {
      loginPing().catch(() => { });
      getXpTransactions(50, 0)
        .then((txRes) => {
          if (!cancelled) setTransactions(txRes.transactions);
          perfLog("right-dashboard", "deferred xp transactions loaded", {
            tx: txRes.transactions.length,
          });
        })
        .catch(() => { });
    }, 1200);

    // Re-fetch status after onboarding XP grants settle.
    const retry = setTimeout(() => {
      getXpStatus()
        .then((status) => {
          if (!cancelled) {
            setXpStatus(status);
            if ((status.recentTransactions?.length ?? 0) > 0) {
              setTransactions(status.recentTransactions);
            }
          }
        })
        .catch(() => { });
    }, 3500);

    return () => {
      cancelled = true;
      clearTimeout(deferred);
      clearTimeout(retry);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = () => {
    if (referralCode === "—") return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const recentTx = transactions.slice(0, 4);
  const weeklyUsdcText = weeklyUsdcChange === null
    ? "Last-week change unavailable"
    : `${weeklyUsdcChange >= 0 ? "+" : "-"}$${Math.abs(weeklyUsdcChange).toFixed(2)} from last week`;
  const weeklyUsdcTextClass = weeklyUsdcChange === null
    ? "text-foreground/40"
    : weeklyUsdcChange < 0
      ? "text-red-400"
      : "text-[#60A5FA]";

  return (
    <div className="flex flex-col gap-4 sticky top-6 pb-10">

      {/* 1. Login Streak */}
      <Link href="/dashboard" className="block group transition-transform active:scale-[0.98]">
        <div className="rounded-[24px] p-6 flex justify-between items-center overflow-hidden relative font-sans
          bg-gradient-to-br from-[#F97316] via-[#EA580C] to-[#C2410C]
          shadow-[0_8px_32px_rgba(234,88,12,0.45),0_2px_8px_rgba(0,0,0,0.3)]
          border border-orange-400/30
          group-hover:shadow-[0_12px_40px_rgba(249,115,22,0.55),0_2px_8px_rgba(0,0,0,0.3)]
          transition-all duration-300">

          {/* Shine sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none skew-x-12" />

          {/* Top gloss */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[24px] pointer-events-none" />

          {/* Radial glow top-right */}
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-yellow-300/30 rounded-full blur-2xl pointer-events-none" />

          {/* Bottom shadow vignette */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-b-[24px]" />

          <div className="relative z-10">
            <p className="text-[11px] font-black text-white/80 uppercase tracking-[0.15em] mb-1" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>Login Streak</p>
            <h3 className="text-4xl font-black text-white tracking-tight" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{streak} Days</h3>
            {longestStreak !== null && (
              <p className="text-[10px] font-bold text-white/50 mt-0.5">Best: {longestStreak} days</p>
            )}
          </div>

          <div className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center
            bg-gradient-to-br from-white/40 to-white/15
            border border-white/40
            shadow-[0_2px_12px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.5)]
            backdrop-blur-md">
            <Flame className="w-8 h-8 text-white fill-current drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
          </div>
        </div>
      </Link>

      {/* 2. Wallet Card */}
      <div className="bg-card border border-border rounded-[32px] p-6 shadow-sm flex flex-col relative overflow-hidden">

        {/* Balance */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Image src="/usdc.png" alt="USDC" width={36} height={36} className="rounded-full" />
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black text-foreground tracking-tight">${balance}</h3>
              <span className="text-lg font-bold text-foreground/40">USDC</span>
            </div>
          </div>
          {!weeklyUsdcLoaded ? (
            <div
              className="mt-2 h-[14px] w-[150px] rounded bg-foreground/10 animate-pulse"
              aria-label="Loading weekly USDC change"
            />
          ) : (
            <p className={cn("text-[11px] font-bold mt-2", weeklyUsdcTextClass)}>{weeklyUsdcText}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-foreground/5 hover:bg-foreground/10 border border-border rounded-2xl text-sm font-black text-foreground/70 transition-all active:scale-[0.98]">
            <Send size={18} className="-rotate-45" />
            Transfer
          </button>
        </div>

        {/* Address & Explorer */}
        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
          <button
            onClick={() => {
              if (address) navigator.clipboard.writeText(address);
              toast.success("Address copied!");
            }}
            className="text-[10px] font-bold text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            {truncatedAddress} <Copy size={10} />
          </button>
          <a
            href={address ? `https://amoy.polygonscan.com/address/${address}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black text-foreground/40 hover:text-foreground uppercase tracking-widest flex items-center gap-1.5"
          >
            Explorer <ExternalLink size={10} />
          </a>
        </div>
      </div>

      {/* 3. XP Tracking */}
      <div className="bg-card border border-border rounded-[28px] p-6 shadow-sm flex flex-col h-auto">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[13px] font-black text-foreground">XP Tracking</span>
          <Link href="/dashboard" className="text-[11px] font-black text-[#A78BFA] hover:underline uppercase tracking-wider">
            View Dashboard
          </Link>
        </div>

        {xpLoading ? (
          <div className="space-y-5 animate-pulse">
            {/* XP number skeleton */}
            <div className="space-y-2">
              <div className="h-9 w-28 rounded-lg bg-foreground/10 border border-foreground/8 backdrop-blur-sm" />
              <div className="h-3 w-20 rounded bg-white/5" />
            </div>
            {/* Bar chart skeleton */}
            <div className="flex items-end justify-between gap-1.5 px-0.5" style={{ height: "7rem" }}>
              {[40, 60, 30, 75, 50, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-sm border border-white/8"
                    style={{
                      height: `${h}%`,
                      background: "linear-gradient(to top, rgba(167,139,250,0.12), rgba(167,139,250,0.04))",
                      backdropFilter: "blur(4px)",
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Day labels skeleton */}
            <div className="flex justify-between gap-1.5 px-0.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 flex justify-center">
                  <div className="h-2 w-5 rounded bg-white/5" />
                </div>
              ))}
            </div>
            {/* Progress bar skeleton */}
            <div className="space-y-2">
              <div className="h-1.5 w-full rounded-full bg-white/5 border border-white/5" />
              <div className="h-2.5 w-24 rounded bg-white/5 mx-auto" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h4 className="text-4xl font-black text-[#A78BFA] tracking-tight">{earnedToday} XP</h4>
              <p className="text-xs font-bold text-foreground/50">Earned Today</p>
            </div>

            {/* Bar chart — last 7 days */}
            <div className="flex items-end justify-between gap-1.5 px-0.5 mb-3 relative z-10" style={{ height: "7rem" }}>
              {weeklyBars.map((pct, i) => {
                const dayDate = new Date();
                dayDate.setDate(dayDate.getDate() - (6 - i));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground/90 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black text-background opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                      {dailyXP[i]} XP
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct || 2}%` }}
                      className={cn(
                        "w-full transition-all duration-300 rounded-sm",
                        i === 6 ? "bg-[#A78BFA]" : "bg-[#A78BFA]/20"
                      )}
                    />
                  </div>
                );
              })}
            </div>
            {/* Day labels */}
            <div className="flex justify-between gap-1.5 px-0.5 mb-5">
              {weeklyBars.map((_, i) => {
                const dayDate = new Date();
                dayDate.setDate(dayDate.getDate() - (6 - i));
                const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
                return (
                  <div key={i} className="flex-1 text-center">
                    <span className={cn("text-[8px] font-black tracking-wide", i === 6 ? "text-[#A78BFA]" : "text-foreground/20")}>
                      {dayName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Level progress bar */}
            <div className="space-y-3">
              <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-[#A78BFA] rounded-full"
                />
              </div>
              <p className="text-[10px] font-bold text-foreground/40 text-center uppercase tracking-[0.15em]">
                {progress}% to next level
              </p>
            </div>
          </>
        )}
      </div>

      {/* 4. Referral Card */}
      <div className="bg-card border border-border rounded-[24px] p-6 shadow-xl">
        <h3 className="text-[17px] font-black text-foreground mb-1 tracking-tight">Earn with Referrals</h3>
        <p className="text-[13px] font-medium text-foreground/50 mb-6">Invite friends and get 10% of their XP.</p>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-foreground/5 border border-border rounded-xl px-4 py-3.5 font-mono text-[13px] text-foreground/60 font-bold tracking-tight truncate">
            {referralCode}
          </div>
          <button
            onClick={handleCopy}
            className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-black transition-all active:scale-95 hover:bg-white/90 shadow-sm"
          >
            {copied ? <div className="text-[10px] font-black uppercase">OK</div> : <Copy size={20} />}
          </button>
          <button className="w-12 h-12 rounded-xl bg-[#B6FF60] flex items-center justify-center text-black transition-all active:scale-95 hover:bg-[#c8ff7a] shadow-lg shadow-[#B6FF60]/20">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* 5. XP History */}
      <div className="mt-2 bg-card border border-border rounded-[24px] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full border border-border bg-secondary flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-foreground/70" />
            </div>
            <div>
              <h3 className="text-[12px] font-black text-foreground/85 uppercase tracking-[0.18em]">Recent Activity</h3>
              <p className="text-[10px] font-bold text-foreground/35 uppercase tracking-[0.12em]">{xpLoading ? "Loading…" : `Latest ${Math.min(recentTx.length, 4)} events`}</p>
            </div>
          </div>
          <Link href="/dashboard" className="text-[11px] font-black text-foreground/70 hover:text-foreground uppercase tracking-widest transition-colors">
            View All
          </Link>
        </div>

        {xpLoading ? (
          <div className="space-y-1.5 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-foreground/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded bg-foreground/10 w-3/4" />
                  <div className="h-2.5 rounded bg-foreground/6 w-1/2" />
                </div>
                <div className="h-5 w-14 rounded-full bg-foreground/10 shrink-0" />
              </div>
            ))}
          </div>
        ) : recentTx.length === 0 ? (
          <div className="rounded-2xl border border-border bg-foreground/[0.02] p-7 text-center">
            <Sparkles className="w-6 h-6 text-foreground/45 mx-auto mb-2" />
            <p className="text-[11px] font-bold text-foreground/55">No activity yet — start voting or posting.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentTx.map((tx, idx) => {
              const { style, label, sub } = txConfig(tx);
              const Icon = style.icon;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: idx * 0.05 }}
                  className={cn(
                    "group rounded-xl border border-border p-3 flex items-center gap-3 transition-all duration-300",
                    "bg-card hover:bg-foreground/[0.03] hover:-translate-y-[1px]",
                    idx === 0 && "animate-[pulse_2.6s_ease-in-out_infinite]"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 border shadow-inner transition-transform duration-300 group-hover:scale-105", style.bg, style.border)}>
                    <Icon size={16} className={style.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white leading-snug truncate">{label}</p>
                    {sub ? (
                      <p className="text-[11px] font-medium text-neutral-400 truncate mt-0.5">{sub}</p>
                    ) : (
                      <p className="text-[11px] font-medium text-neutral-400 truncate mt-0.5">XP activity</p>
                    )}
                    <p className="text-[10px] font-medium text-neutral-500 mt-1">{relativeTime(tx.createdAt, nowMs)}</p>
                  </div>

                  <div className={cn(
                    "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-black border shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-shadow duration-300",
                    tx.amount >= 0
                      ? "text-[#B6FF60] bg-[#B6FF60]/10 border-[#B6FF60]/25 shadow-[0_0_10px_rgba(182,255,96,0.14)] group-hover:shadow-[0_0_14px_rgba(182,255,96,0.26)]"
                      : "text-red-300 bg-red-500/10 border-red-400/25"
                  )}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount} XP
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
