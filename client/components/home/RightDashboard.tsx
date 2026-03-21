"use client";

import { motion } from "framer-motion";
import {
  Flame,
  Copy,
  ExternalLink,
  Share2,
  Wallet,
  Zap,
  Send,
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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function txLabel(tx: XpTransactionSummary): string {
  if (tx.description) return tx.description;
  switch (tx.type) {
    case "LOGIN_STREAK": return "Login streak bonus";
    case "SUBMISSION": return "Post submitted";
    case "VOTE_CAST": return "Vote cast";
    case "MILESTONE": return "Milestone reached";
    case "REFERRAL": return "Referral bonus";
    default: return "XP earned";
  }
}

export default function RightDashboard() {
  const { user, stats } = useUser();
  const { balance, address } = useWallet();
  const [copied, setCopied] = useState(false);
  const [xpStatus, setXpStatus] = useState<FullXpStatus | null>(null);
  const [transactions, setTransactions] = useState<XpTransactionSummary[]>([]);

  const truncatedAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "0x00...0000";

  const streak = xpStatus?.streak?.current ?? user?.currentStreak ?? 0;
  const longestStreak = xpStatus?.streak?.longest ?? null;
  const referralCode = xpStatus?.referralStats?.referralCode ?? user?.referralCode ?? "—";
  const { progress } = xpForNextLevel(user?.xp ?? 0);
  const totalEarnings = stats?.earnings ?? 0;

  const earnedToday = transactions
    .filter((tx) => Date.now() - new Date(tx.createdAt).getTime() < 86400000)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const dailyXP = buildDailyXP(transactions, 7);
  const maxXP = Math.max(...dailyXP, 1);
  const weeklyBars = dailyXP.map((v) => Math.round((v / maxXP) * 100));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [status, txRes] = await Promise.all([
          getXpStatus(),
          getXpTransactions(50, 0),
        ]);
        if (!cancelled) {
          setXpStatus(status);
          setTransactions(txRes.transactions);
        }
      } catch {
        // graceful degradation
      }
    }
    load();
    loginPing().catch(() => { });
    return () => { cancelled = true; };
  }, []);

  const handleCopy = () => {
    if (referralCode === "—") return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const recentTx = transactions.slice(0, 4);

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
          <p className="text-[11px] font-bold text-[#60A5FA] mt-2">+$2.20 from last week</p>
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
              address && navigator.clipboard.writeText(address);
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
      <div className="mt-2 px-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black text-foreground/50 uppercase tracking-[0.2em]">XP History</h3>
          <Link href="/dashboard" className="text-[11px] font-black text-[#A78BFA] hover:underline uppercase tracking-widest">
            View All
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-wider">No XP activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTx.map((tx) => (
              <div
                key={tx.id}
                className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between group hover:border-[#A78BFA]/20 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 flex items-center justify-center border border-[#A78BFA]/20">
                    <Zap size={18} className="text-[#A78BFA]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-snug">{txLabel(tx)}</p>
                    <p className="text-[10px] font-bold text-foreground/40">{relativeTime(tx.createdAt)}</p>
                  </div>
                </div>
                <span className={cn("text-xs font-black", tx.amount >= 0 ? "text-[#A78BFA]" : "text-red-400")}>
                  {tx.amount >= 0 ? "+" : ""}{tx.amount} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
