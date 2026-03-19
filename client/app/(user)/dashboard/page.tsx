"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/home/SidebarLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Users, Building2, Trophy, ThumbsUp, ImageIcon,
    Calendar, Crown, X, Star, Flame, Lock, CheckCircle2,
    MousePointerClick, DollarSign, ArrowUpRight, TrendingUp, Shield,
    GitBranch, Target, Swords, UserCheck,
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { getUserStats, getUserSubmissions } from "@/services/user.service";
import { getEventsVotedByUser } from "@/services/event.service";
import { getXpTransactions, type XpTransactionSummary } from "@/services/xp.service";
import { getFollowers } from "@/services/user.service";
import type { UserStats } from "@/types/user";

// ─── Types ──────────────────────────────────────────────────────

type TabType = "overall" | "vote" | "post";

interface ActivityItem {
    id: string;
    eventId?: string;
    type: "vote" | "post";
    title: string;
    brand: string;
    brandLogoUrl?: string;
    domain?: string;
    date: string;
    status: string;
    rank?: number | null;
    votesCast?: number;
    votesReceived?: number;
    earnings?: number;
    xpEarned?: number;
    imageUrl?: string;
}

// ─── Level Breakdown Modal ───────────────────────────────────────

const TIER_DETAILS = [
    {
        name: "Rookie",   color: "text-zinc-400",   bg: "bg-zinc-500/15",   border: "border-zinc-500/30",   glow: "",
        minLevel: 1, maxLevel: 2, minXP: 0,     maxXP: 1999,
        perks: ["Access to all public events", "Basic leaderboard visibility", "Earn XP from votes & posts"],
    },
    {
        name: "Hustler",  color: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-500/30",   glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
        minLevel: 3, maxLevel: 5, minXP: 2000,  maxXP: 4999,
        perks: ["Blue rank badge on profile", "Priority placement in search", "Unlock Hustler leaderboard bracket"],
    },
    {
        name: "Creator",  color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30", glow: "shadow-[0_0_20px_rgba(168,85,247,0.18)]",
        minLevel: 6, maxLevel: 9, minXP: 5000,  maxXP: 8999,
        perks: ["Purple rank badge on profile", "Featured in Creator spotlight", "Higher USDC payout weighting"],
    },
    {
        name: "Veteran",  color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30", glow: "shadow-[0_0_24px_rgba(249,115,22,0.2)]",
        minLevel: 10, maxLevel: 14, minXP: 9000,  maxXP: 13999,
        perks: ["Orange rank badge on profile", "Access to Veteran-only events", "Bonus XP multiplier ×1.2"],
    },
    {
        name: "Elite",    color: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/30", glow: "shadow-[0_0_28px_rgba(234,179,8,0.22)]",
        minLevel: 15, maxLevel: 19, minXP: 14000, maxXP: 18999,
        perks: ["Gold rank badge on profile", "Elite leaderboard bracket", "Bonus XP multiplier ×1.5"],
    },
    {
        name: "Legend",   color: "text-lime-400",   bg: "bg-lime-400/15",   border: "border-lime-400/30",   glow: "shadow-[0_0_32px_rgba(163,230,53,0.25)]",
        minLevel: 20, maxLevel: null, minXP: 19000, maxXP: null,
        perks: ["Lime rank badge on profile", "Legend-only events & rewards", "Maximum USDC payout weighting", "Bonus XP multiplier ×2.0"],
    },
] as const;

const XP_SOURCES = [
    { icon: MousePointerClick, label: "Cast Vote",    desc: "Every vote cast",           xp: "+1–10 XP",   color: "text-blue-400",   bg: "bg-blue-400/10" },
    { icon: ImageIcon,         label: "Post Content", desc: "Approved submission",        xp: "+10–50 XP",  color: "text-lime-400",   bg: "bg-lime-400/10" },
    { icon: Crown,             label: "Top Ranking",  desc: "Rank #1 in an event",        xp: "+50–200 XP", color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { icon: Flame,             label: "Login Streak", desc: "Consecutive daily logins",   xp: "+5–25 XP",   color: "text-orange-400", bg: "bg-orange-400/10" },
    { icon: Users,             label: "Referrals",    desc: "Friend joins via your code", xp: "+10–100 XP", color: "text-pink-400",   bg: "bg-pink-400/10" },
    { icon: Trophy,            label: "Milestones",   desc: "Complete XP milestones",     xp: "+10–2.5k XP",color: "text-purple-400", bg: "bg-purple-400/10" },
];

function LevelBreakdownModal({ open, onClose, xp, xpLevel }: {
    open: boolean;
    onClose: () => void;
    xp: number;
    xpLevel: number;
}) {
    const currentTierDetail = TIER_DETAILS.find(t => xpLevel >= t.minLevel && (t.maxLevel === null || xpLevel <= t.maxLevel))
        ?? TIER_DETAILS[0];

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-xl max-h-[88vh] bg-card border border-border rounded-[28px] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                            <div>
                                <h2 className="text-base font-black text-foreground tracking-tight">Level Progression</h2>
                                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] mt-0.5">
                                    How ranks & XP work
                                </p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center transition-colors">
                                <X className="w-4 h-4 text-foreground/50" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                            {/* Current rank hero */}
                            <div className={cn(
                                "relative overflow-hidden rounded-2xl border p-5 flex items-center gap-5",
                                currentTierDetail.bg, currentTierDetail.border, currentTierDetail.glow
                            )}>
                                <div className={cn("absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl opacity-30", currentTierDetail.bg)} />
                                <div className={cn("relative w-16 h-16 rounded-2xl flex items-center justify-center border shrink-0", currentTierDetail.bg, currentTierDetail.border)}>
                                    <span className={cn("font-display text-4xl leading-none tracking-tight", currentTierDetail.color)}>{xpLevel}</span>
                                </div>
                                <div className="relative min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground/40 mb-0.5">You are here</p>
                                    <p className={cn("text-2xl font-black tracking-tight", currentTierDetail.color)}>{currentTierDetail.name}</p>
                                    <p className="text-[10px] font-bold text-foreground/40 mt-0.5">{xp.toLocaleString()} XP total</p>
                                </div>
                                <div className="relative ml-auto text-right shrink-0">
                                    {currentTierDetail.maxXP !== null ? (
                                        <>
                                            <p className={cn("text-lg font-black", currentTierDetail.color)}>
                                                {(currentTierDetail.maxXP + 1 - xp).toLocaleString()}
                                            </p>
                                            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">XP to next tier</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className={cn("text-lg font-black", currentTierDetail.color)}>MAX</p>
                                            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">Tier</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Tier progression ladder */}
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-3">All Tiers</p>
                                <div className="space-y-2">
                                    {TIER_DETAILS.map((t, i) => {
                                        const isCurrent = t.name === currentTierDetail.name;
                                        const isPast = TIER_DETAILS.indexOf(currentTierDetail) > i;
                                        const xpInThisTier = isCurrent ? xp - t.minXP : 0;
                                        const tierSize = t.maxXP !== null ? t.maxXP - t.minXP + 1 : 10000;
                                        const pct = isCurrent ? Math.min(100, (xpInThisTier / tierSize) * 100) : isPast ? 100 : 0;

                                        return (
                                            <motion.div
                                                key={t.name}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className={cn(
                                                    "rounded-2xl border p-4 transition-all",
                                                    isCurrent ? cn(t.bg, t.border, t.glow) :
                                                    isPast ? "bg-foreground/[0.04] border-foreground/[0.1]" :
                                                    "bg-transparent border-border/50 opacity-50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    {/* Tier icon */}
                                                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
                                                        isCurrent || isPast ? cn(t.bg, t.border) : "bg-foreground/[0.04] border-border"
                                                    )}>
                                                        {isPast
                                                            ? <CheckCircle2 className={cn("w-4 h-4", t.color)} />
                                                            : <Zap className={cn("w-4 h-4", isCurrent ? t.color : "text-foreground/20")} />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("text-sm font-black", isCurrent ? t.color : isPast ? "text-foreground/70" : "text-foreground/30")}>
                                                                {t.name}
                                                            </span>
                                                            {isCurrent && (
                                                                <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border", t.bg, t.border, t.color)}>
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-bold text-foreground/30">
                                                            Lv {t.minLevel}{t.maxLevel ? `–${t.maxLevel}` : "+"} · {(t.minXP / 1000).toFixed(0)}k{t.maxXP ? `–${(t.maxXP / 1000).toFixed(0)}k` : "+"} XP
                                                        </p>
                                                    </div>
                                                    {isCurrent && (
                                                        <span className={cn("text-[10px] font-black shrink-0", t.color)}>
                                                            {Math.round(pct)}%
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Progress bar (current tier only) */}
                                                {isCurrent && (
                                                    <div className="ml-12 mb-2">
                                                        <div className="w-full h-1 bg-foreground/[0.08] rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${pct}%` }}
                                                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                                                className={cn("h-full rounded-full", t.color.replace("text-", "bg-"))}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Perks */}
                                                {(isCurrent || isPast) && (
                                                    <div className="ml-12 flex flex-wrap gap-1.5">
                                                        {t.perks.map((perk) => (
                                                            <span key={perk} className={cn(
                                                                "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                                                                isCurrent ? cn(t.bg, t.border, t.color) : "bg-foreground/[0.04] border-foreground/[0.08] text-foreground/40"
                                                            )}>
                                                                {perk}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* How to earn XP */}
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-3">Ways to Earn XP</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {XP_SOURCES.map((src) => {
                                        const SrcIcon = src.icon;
                                        return (
                                            <div key={src.label} className={cn("rounded-xl border border-border p-3 flex items-center gap-3", src.bg)}>
                                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-background/40")}>
                                                    <SrcIcon className={cn("w-4 h-4", src.color)} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-foreground/80 leading-snug">{src.label}</p>
                                                    <p className={cn("text-[9px] font-black", src.color)}>{src.xp}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Milestones Data ─────────────────────────────────────────────

const TIER_LABELS = ["First", "Beginner", "Punctual", "Expert", "Veteran", "Legend"] as const;
type TierLabel = typeof TIER_LABELS[number];

const TIER_STYLE: Record<TierLabel, { text: string; bg: string; border: string; glow: string; dot: string }> = {
    First:    { text: "text-zinc-400",   bg: "bg-zinc-500/15",   border: "border-zinc-500/30",   glow: "",                                           dot: "bg-zinc-400" },
    Beginner: { text: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-500/30",   glow: "",                                           dot: "bg-blue-400" },
    Punctual: { text: "text-teal-400",   bg: "bg-teal-500/15",   border: "border-teal-500/30",   glow: "",                                           dot: "bg-teal-400" },
    Expert:   { text: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30", glow: "shadow-[0_0_16px_rgba(168,85,247,0.2)]",    dot: "bg-purple-400" },
    Veteran:  { text: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30", glow: "shadow-[0_0_16px_rgba(249,115,22,0.2)]",    dot: "bg-orange-400" },
    Legend:   { text: "text-lime-400",   bg: "bg-lime-400/15",   border: "border-lime-400/30",   glow: "shadow-[0_0_20px_rgba(163,230,53,0.25)]",   dot: "bg-lime-400" },
};

interface MilestoneRow {
    label: string;
    icon: React.ElementType;
    statKey?: string; // key in stats for live progress
    targets: [number, number, number, number, number, number];
    unit?: string;
}

interface MilestoneCategory {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
    rows: MilestoneRow[];
    xp: [number, number, number, number, number, number];
}

const MILESTONE_CATEGORIES: MilestoneCategory[] = [
    {
        id: "voter",
        label: "Voter",
        icon: MousePointerClick,
        color: "text-blue-400",
        xp: [10, 25, 50, 100, 250, 500],
        rows: [
            { label: "Rank #1 Votes",      icon: Crown,            targets: [1, 3, 10, 25, 50, 100],         unit: "times" },
            { label: "Top 3 Finishes",      icon: Trophy,           targets: [1, 5, 25, 50, 100, 250],        unit: "times" },
            { label: "Top 5 Finishes",      icon: Star,             targets: [1, 5, 50, 100, 250, 500],       unit: "times" },
            { label: "Top 10 Finishes",     icon: TrendingUp,       targets: [1, 10, 100, 100, 250, 500],     unit: "times" },
            { label: "> 51%ile Accuracy",   icon: Target,           targets: [1, 25, 125, 250, 500, 1000],    unit: "times" },
            { label: "Votes Cast",          icon: Zap,              statKey: "votesCast", targets: [1, 25, 125, 250, 500, 1000], unit: "votes" },
            { label: "Events Participated", icon: Calendar,         statKey: "events",    targets: [1, 5, 25, 50, 100, 250],    unit: "events" },
        ],
    },
    {
        id: "creator",
        label: "Creator",
        icon: ImageIcon,
        color: "text-lime-400",
        xp: [10, 50, 100, 250, 500, 1000],
        rows: [
            { label: "Rank #1 Posts",       icon: Crown,            targets: [1, 3, 10, 25, 50, 100],         unit: "times" },
            { label: "Top 3 Finishes",      icon: Trophy,           targets: [1, 5, 10, 50, 100, 250],        unit: "times" },
            { label: "Top 5 Finishes",      icon: Star,             targets: [1, 5, 25, 100, 250, 500],       unit: "times" },
            { label: "Top 10 Finishes",     icon: TrendingUp,       targets: [1, 10, 25, 100, 250, 500],      unit: "times" },
            { label: "> 51%ile Accuracy",   icon: Target,           targets: [1, 25, 50, 250, 500, 1000],     unit: "times" },
            { label: "Posts Submitted",     icon: ImageIcon,        statKey: "posts",     targets: [1, 25, 100, 250, 500, 1000], unit: "posts" },
            { label: "Events Participated", icon: Calendar,         statKey: "events",    targets: [1, 5, 10, 25, 50, 100],     unit: "events" },
        ],
    },
    {
        id: "activity",
        label: "Streaks",
        icon: Flame,
        color: "text-orange-400",
        xp: [10, 25, 50, 100, 250, 500],
        rows: [
            { label: "Vote Streak",         icon: Flame,            statKey: "voteStreak",  targets: [1, 3, 7, 15, 30, 100],          unit: "days" },
            { label: "Post Streak",         icon: Zap,              statKey: "postStreak",  targets: [1, 3, 7, 15, 30, 100],          unit: "days" },
        ],
    },
    {
        id: "referrals",
        label: "Referrals",
        icon: UserCheck,
        color: "text-pink-400",
        xp: [10, 25, 125, 500, 1200, 2500],
        rows: [
            { label: "Referrals Made",      icon: Users,            targets: [1, 5, 25, 100, 250, 500],       unit: "users" },
        ],
    },
];

// ─── Milestones Modal ─────────────────────────────────────────────

function MilestonesModal({ open, onClose, stats, streak }: {
    open: boolean;
    onClose: () => void;
    stats: UserStats | null;
    streak: number;
}) {
    const [activeCategory, setActiveCategory] = useState("voter");
    const category = MILESTONE_CATEGORIES.find(c => c.id === activeCategory)!;

    // Get live stat value for a row
    function getLiveValue(row: MilestoneRow): number {
        if (!row.statKey) return 0;
        if (row.statKey === "voteStreak" || row.statKey === "postStreak") return streak;
        if (!stats) return 0;
        return (stats as any)[row.statKey] ?? 0;
    }

    // Which tier index the user is currently at (0-based, -1 = not started)
    function getCurrentTierIndex(row: MilestoneRow): number {
        const val = getLiveValue(row);
        if (!row.statKey) return -1;
        let reached = -1;
        for (let i = 0; i < 6; i++) {
            if (val >= row.targets[i]) reached = i;
        }
        return reached;
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-4xl max-h-[88vh] bg-card border border-border rounded-[28px] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                            <div>
                                <h2 className="text-base font-black text-foreground tracking-tight">All Milestones</h2>
                                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] mt-0.5">
                                    Complete milestones to earn XP and climb ranks
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-foreground/50" />
                            </button>
                        </div>

                        {/* Tier legend strip */}
                        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-foreground/[0.02] shrink-0 overflow-x-auto no-scrollbar">
                            {TIER_LABELS.map((tier) => {
                                const s = TIER_STYLE[tier];
                                return (
                                    <div key={tier} className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest whitespace-nowrap", s.bg, s.border, s.text)}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                                        {tier}
                                    </div>
                                );
                            })}
                            <span className="text-[9px] font-bold text-foreground/30 ml-auto whitespace-nowrap">↑ tiers left to right</span>
                        </div>

                        {/* Category tabs */}
                        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-border shrink-0 overflow-x-auto no-scrollbar">
                            {MILESTONE_CATEGORIES.map((cat) => {
                                const CatIcon = cat.icon;
                                const active = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                            active
                                                ? "bg-foreground text-background border-foreground"
                                                : "bg-foreground/[0.04] text-foreground/40 border-foreground/[0.06] hover:bg-foreground/[0.08] hover:text-foreground/70"
                                        )}
                                    >
                                        <CatIcon className="w-3.5 h-3.5" />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">

                            {/* Tier header row */}
                            <div className="grid grid-cols-[1fr_repeat(6,_minmax(0,_1fr))] gap-2 mb-1">
                                <div className="text-[9px] font-black uppercase tracking-widest text-foreground/25 pl-2">Criteria</div>
                                {TIER_LABELS.map((tier) => {
                                    const s = TIER_STYLE[tier];
                                    return (
                                        <div key={tier} className={cn("text-center text-[9px] font-black uppercase tracking-widest", s.text)}>
                                            {tier}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Milestone rows */}
                            {category.rows.map((row, ri) => {
                                const liveVal = getLiveValue(row);
                                const currentTier = getCurrentTierIndex(row);
                                const nextTierIdx = currentTier + 1;
                                const hasLiveData = !!row.statKey;
                                const RowIcon = row.icon;

                                return (
                                    <motion.div
                                        key={row.label}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: ri * 0.04 }}
                                        className="grid grid-cols-[1fr_repeat(6,_minmax(0,_1fr))] gap-2 items-center rounded-2xl border border-border bg-foreground/[0.015] hover:bg-foreground/[0.03] transition-colors p-3"
                                    >
                                        {/* Criteria label */}
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={cn(
                                                "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0",
                                                currentTier >= 0 && hasLiveData
                                                    ? cn(TIER_STYLE[TIER_LABELS[currentTier]].bg, TIER_STYLE[TIER_LABELS[currentTier]].border)
                                                    : "bg-foreground/[0.05] border-border"
                                            )}>
                                                <RowIcon className={cn(
                                                    "w-3.5 h-3.5",
                                                    currentTier >= 0 && hasLiveData
                                                        ? TIER_STYLE[TIER_LABELS[currentTier]].text
                                                        : "text-foreground/40"
                                                )} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-foreground/70 truncate leading-snug">{row.label}</p>
                                                {hasLiveData && (
                                                    <p className={cn(
                                                        "text-[9px] font-bold",
                                                        currentTier >= 0 ? TIER_STYLE[TIER_LABELS[currentTier]].text + "/70" : "text-foreground/30"
                                                    )}>{liveVal.toLocaleString()} {row.unit}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tier cells */}
                                        {row.targets.map((target, ti) => {
                                            const tier = TIER_LABELS[ti];
                                            const s = TIER_STYLE[tier];
                                            const achieved = hasLiveData && liveVal >= target;
                                            const isCurrentTier = hasLiveData && ti === currentTier;
                                            const isPastAchieved = achieved && !isCurrentTier;
                                            const isNext = hasLiveData && ti === nextTierIdx;
                                            const progressPct = isNext ? Math.min(100, (liveVal / target) * 100) : 0;

                                            return (
                                                <div
                                                    key={ti}
                                                    className={cn(
                                                        "relative flex flex-col items-center justify-center px-1.5 py-2 rounded-xl border text-center transition-all",
                                                        isCurrentTier
                                                            ? cn(s.bg, s.border, s.glow)
                                                            : isPastAchieved
                                                                ? "bg-foreground/[0.06] border-foreground/[0.2]"
                                                                : isNext
                                                                    ? "bg-foreground/[0.03] border-dashed border-foreground/[0.15]"
                                                                    : "bg-transparent border-transparent"
                                                    )}
                                                >
                                                    {/* Past achieved: subtle ✓ */}
                                                    {isPastAchieved && (
                                                        <CheckCircle2 className="w-3 h-3 mb-0.5 text-foreground/50" />
                                                    )}
                                                    {/* Current tier: colored ✓ */}
                                                    {isCurrentTier && (
                                                        <CheckCircle2 className={cn("w-3.5 h-3.5 mb-0.5", s.text)} />
                                                    )}

                                                    <span className={cn(
                                                        "text-[11px] font-black leading-none",
                                                        isCurrentTier ? s.text
                                                            : isPastAchieved ? "text-foreground/60"
                                                                : isNext ? "text-foreground/50"
                                                                    : "text-foreground/15"
                                                    )}>
                                                        ×{target >= 1000 ? `${(target / 1000).toFixed(0)}k` : target}
                                                    </span>

                                                    {/* Current tier YOU badge */}
                                                    {isCurrentTier && (
                                                        <span className={cn("text-[7px] font-black uppercase tracking-widest mt-0.5 px-1.5 py-0.5 rounded-full", s.bg, s.text)}>
                                                            YOU
                                                        </span>
                                                    )}

                                                    {/* Next tier: progress bar */}
                                                    {isNext && (
                                                        <div className="w-full mt-1.5 h-0.5 bg-foreground/10 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-foreground/35 rounded-full transition-all duration-700"
                                                                style={{ width: `${progressPct || 2}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                );
                            })}

                            {/* XP Rewards row */}
                            <div className="grid grid-cols-[1fr_repeat(6,_minmax(0,_1fr))] gap-2 items-center rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.04] p-3 mt-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center shrink-0">
                                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                    </div>
                                    <p className="text-[10px] font-black text-yellow-400/80">XP Reward</p>
                                </div>
                                {category.xp.map((xpVal, ti) => {
                                    const tier = TIER_LABELS[ti];
                                    const s = TIER_STYLE[tier];
                                    return (
                                        <div key={ti} className={cn("text-center px-1 py-2 rounded-xl", s.bg, s.border, "border")}>
                                            <span className={cn("text-[11px] font-black", s.text)}>
                                                +{xpVal >= 1000 ? `${(xpVal / 1000).toFixed(1)}k` : xpVal}
                                            </span>
                                            <p className="text-[8px] font-bold text-foreground/30 mt-0.5">XP</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Advantages callout */}
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", title: "Earn XP", desc: "Every milestone unlocks XP that levels up your rank and visibility." },
                                    { icon: Crown, color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/20", title: "Climb Ranks", desc: "Higher tiers put you in the Veteran & Legend leaderboard brackets." },
                                    { icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", title: "Higher Rewards", desc: "Top-tier voters and creators earn higher USDC share per event." },
                                ].map((adv) => {
                                    const AdvIcon = adv.icon;
                                    return (
                                        <div key={adv.title} className={cn("rounded-2xl border p-4 flex gap-3", adv.bg, adv.border)}>
                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", adv.bg, adv.border, "border")}>
                                                <AdvIcon className={cn("w-4 h-4", adv.color)} />
                                            </div>
                                            <div>
                                                <p className={cn("text-[11px] font-black mb-0.5", adv.color)}>{adv.title}</p>
                                                <p className="text-[10px] font-medium text-foreground/50 leading-relaxed">{adv.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Rank Badge ──────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-black border border-yellow-500/20">
            <Crown className="w-3 h-3" /> #1
        </span>
    );
    if (rank <= 3) return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-400 text-[10px] font-black border border-lime-500/20">
            <Trophy className="w-3 h-3" /> #{rank}
        </span>
    );
    return (
        <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 text-[10px] font-bold border border-white/[0.08]">
            #{rank}
        </span>
    );
}

// ─── View All Slide Panel ────────────────────────────────────────

function ViewAllPanel({
    title, open, onClose, children,
}: {
    title: string; open: boolean; onClose: () => void; children: React.ReactNode;
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="absolute inset-0 z-20 bg-[#070709]/98 border border-white/[0.08] rounded-[20px] flex flex-col"
                >
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{title}</span>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-white/50" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Activity Row ────────────────────────────────────────────────

// ─── Status dot config ───────────────────────────────────────────

function statusConfig(status: string) {
    if (status === "voting")    return { dot: "bg-emerald-400", label: "Voting",    text: "text-emerald-400" };
    if (status === "posting")   return { dot: "bg-blue-400",    label: "Posting",   text: "text-blue-400" };
    if (status === "scheduled") return { dot: "bg-yellow-400",  label: "Scheduled", text: "text-yellow-400" };
    if (status === "completed") return { dot: "bg-white/20",    label: "Done",      text: "text-white/30" };
    return                             { dot: "bg-white/15",    label: status,      text: "text-white/25" };
}

function ActivityRow({ item, index, isLast }: { item: ActivityItem; index: number; isLast: boolean }) {
    const isPost = item.type === "post";
    const router = useRouter();
    const sc = statusConfig(item.status);

    return (
        <motion.div
            onClick={() => (item.eventId || item.id) && router.push(`/events/${item.eventId || item.id}`)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className={cn(
                "group flex items-center gap-4 px-1 py-3 cursor-pointer transition-colors duration-100",
                "hover:bg-white/[0.025] rounded-lg -mx-1",
                !isLast && "border-b border-white/[0.04]"
            )}
        >
            {/* LEFT — Avatar / thumbnail */}
            <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-white/[0.06]">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : item.brandLogoUrl ? (
                    <img src={item.brandLogoUrl} alt={item.brand} className="w-full h-full object-cover" />
                ) : (
                    <div className={cn(
                        "w-full h-full flex items-center justify-center text-[10px] font-black",
                        isPost ? "bg-lime-500/10 text-lime-400/60" : "bg-blue-500/10 text-blue-400/60"
                    )}>
                        {item.brand.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* CENTER — Three content lines */}
            <div className="flex-1 min-w-0">
                {/* Line 1: Title */}
                <p className="text-[13px] font-semibold text-white/90 truncate leading-tight tracking-[-0.01em]">
                    {item.title}
                </p>

                {/* Line 2: Brand · Category · Type */}
                <p className="text-[11px] text-white/35 font-medium mt-0.5 truncate">
                    <span className="text-white/50 font-semibold">{item.brand}</span>
                    {item.domain && <><span className="mx-1.5 text-white/15">·</span><span>{item.domain}</span></>}
                    <span className="mx-1.5 text-white/15">·</span>
                    <span className={isPost ? "text-lime-400/50" : "text-blue-400/50"}>{isPost ? "Post" : "Vote"}</span>
                </p>

                {/* Line 3: Metadata */}
                <p className="text-[10px] text-white/20 font-medium mt-0.5">
                    {item.date}
                    {isPost && item.votesReceived !== undefined && item.votesReceived > 0 && (
                        <><span className="mx-1.5 text-white/10">·</span>{item.votesReceived.toLocaleString()} votes</>
                    )}
                    {!isPost && item.votesCast !== undefined && item.votesCast > 0 && (
                        <><span className="mx-1.5 text-white/10">·</span>{item.votesCast} cast</>
                    )}
                    {item.rank && (
                        <><span className="mx-1.5 text-white/10">·</span>Rank #{item.rank}</>
                    )}
                    {!!item.earnings && item.earnings > 0 && (
                        <><span className="mx-1.5 text-white/10">·</span><span className="text-lime-400/70">${item.earnings.toFixed(2)}</span></>
                    )}
                </p>
            </div>

            {/* RIGHT — Status dot + label */}
            <div className="shrink-0 flex items-center gap-1.5 min-w-[72px] justify-end">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sc.dot)} />
                <span className={cn("text-[10px] font-medium capitalize", sc.text)}>{sc.label}</span>
            </div>
        </motion.div>
    );
}

// ─── Level tiers ─────────────────────────────────────────────────

const TIERS = [
    { min: 1, max: 2, name: "Rookie", color: "text-zinc-400", border: "border-zinc-500/30", bg: "bg-zinc-500/10", glow: "" },
    { min: 3, max: 5, name: "Hustler", color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/10", glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]" },
    { min: 6, max: 9, name: "Creator", color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10", glow: "shadow-[0_0_20px_rgba(168,85,247,0.18)]" },
    { min: 10, max: 14, name: "Veteran", color: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10", glow: "shadow-[0_0_24px_rgba(249,115,22,0.2)]" },
    { min: 15, max: 19, name: "Elite", color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/10", glow: "shadow-[0_0_28px_rgba(234,179,8,0.22)]" },
    { min: 20, max: 999, name: "Legend", color: "text-lime-400", border: "border-lime-400/40", bg: "bg-lime-400/10", glow: "shadow-[0_0_32px_rgba(163,230,53,0.25)]" },
] as const;

function getTier(level: number) {
    return TIERS.find(t => level >= t.min && level <= t.max) ?? TIERS[0];
}

// ─── Achievements ────────────────────────────────────────────────

function getAchievements(stats: UserStats | null, filter: "all" | "vote" | "post") {
    const s = stats;
    const all = [
        // Vote
        { id: "v1", label: "First Vote", desc: "Cast your very first vote", icon: MousePointerClick, target: 1, current: s?.votesCast || 0, type: "vote", xp: 50, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
        { id: "v2", label: "Vote x10", desc: "Cast 10 votes total", icon: Flame, target: 10, current: s?.votesCast || 0, type: "vote", xp: 150, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
        { id: "v3", label: "Vote x50", desc: "50 votes — you're a real judge", icon: Shield, target: 50, current: s?.votesCast || 0, type: "vote", xp: 300, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
        { id: "v4", label: "Vote x100", desc: "Legendary curator status", icon: Star, target: 100, current: s?.votesCast || 0, type: "vote", xp: 600, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
        // Post
        { id: "p1", label: "First Drop", desc: "Submit your first creation", icon: ImageIcon, target: 1, current: s?.posts || 0, type: "post", xp: 100, color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/20" },
        { id: "p2", label: "5 Drops", desc: "5 submissions and counting", icon: Zap, target: 5, current: s?.posts || 0, type: "post", xp: 300, color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/20" },
        { id: "p3", label: "10 Drops", desc: "Double digits. Serious creator.", icon: Flame, target: 10, current: s?.posts || 0, type: "post", xp: 600, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
        { id: "p4", label: "Top Ranker", desc: "Finish #1 in any event", icon: Crown, target: 1, current: 0, type: "post", xp: 800, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
        // All
        { id: "a1", label: "Event Hopper", desc: "Join 5 different events", icon: Trophy, target: 5, current: s?.events || 0, type: "all", xp: 200, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
        { id: "a2", label: "Event Veteran", desc: "Join 20 events", icon: TrendingUp, target: 20, current: s?.events || 0, type: "all", xp: 500, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
        { id: "a3", label: "Community Builder", desc: "Earn 10 followers", icon: Users, target: 10, current: s?.subscribers || 0, type: "all", xp: 250, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
    ];
    if (filter === "all") return all;
    return all.filter(m => m.type === filter || m.type === "all");
}

// ─── Page ────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function DashboardPage() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<TabType>("overall");
    const [stats, setStats] = useState<UserStats | null>(null);
    const [postEvents, setPostEvents] = useState<ActivityItem[]>([]);
    const [voteEvents, setVoteEvents] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [showMilestonesModal, setShowMilestonesModal] = useState(false);
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [transactions, setTransactions] = useState<XpTransactionSummary[]>([]);
    const [followers, setFollowers] = useState<{ followedAt?: string }[]>([]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([
            getUserStats().catch(() => null),
            getUserSubmissions(user.id).catch(() => []),
            getEventsVotedByUser(user.id).catch(() => []),
            getXpTransactions(100, 0).catch(() => ({ transactions: [] })),
            getFollowers(user.id).catch(() => []),
        ]).then(([statsData, submissions, votedEvents, txRes, followerList]) => {
            setTransactions((txRes as any).transactions ?? []);
            setFollowers(followerList as any);
            setStats(statsData);

            setPostEvents((submissions as any[]).map((s: any) => ({
                id: s.id,
                eventId: s.event?.id,
                type: "post" as const,
                title: s.event?.title || "Untitled Event",
                brand: s.event?.brand?.name || "Unknown",
                brandLogoUrl: s.event?.brand?.logoCid ? `https://gateway.pinata.cloud/ipfs/${s.event.brand.logoCid}` : (s.event?.brand?.logoUrl || undefined),
                domain: s.event?.category,
                date: s.createdAt
                    ? new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—",
                status: s.event?.status || "unknown",
                rank: s.finalRank || null,
                votesReceived: s._count?.votes || 0,
                earnings: 0,
                xpEarned: 0,
                imageUrl: s.imageUrls?.thumbnail || s.imageUrl || (s.imageCid ? `https://gateway.pinata.cloud/ipfs/${s.imageCid}` : undefined),
            })));

            setVoteEvents((votedEvents as any[]).map((e: any) => ({
                id: e.id,
                eventId: e.id,
                type: "vote" as const,
                title: e.title || "Untitled Event",
                brand: e.brand?.name || "Unknown",
                brandLogoUrl: e.brand?.logoCid ? `https://gateway.pinata.cloud/ipfs/${e.brand.logoCid}` : (e.brand?.logoUrl || undefined),
                domain: e.category,
                date: e.endTime
                    ? new Date(e.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—",
                status: e.status || "completed",
                votesCast: e._count?.votes || 0,
                earnings: 0,
                imageUrl: e.previewImageUrls?.[0] || e.imageUrls?.thumbnail || (e.imageCid ? `https://gateway.pinata.cloud/ipfs/${e.imageCid}` : undefined),
            })));
        }).finally(() => setLoading(false));
    }, [user]);

    useEffect(() => { setPage(1); }, [activeTab]);

    const allActivity = [...postEvents, ...voteEvents].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const filteredActivity =
        activeTab === "overall" ? allActivity :
            activeTab === "vote" ? voteEvents :
                postEvents;
    const paginatedActivity = filteredActivity.slice(0, page * PAGE_SIZE);
    const hasMore = paginatedActivity.length < filteredActivity.length;

    const achievementFilter = activeTab === "overall" ? "all" : activeTab;
    const achievements = getAchievements(stats, achievementFilter);
    const visibleAchievements = achievements.slice(0, 4);

    // ── Chart data ────────────────────────────────────────────────

    // XP over last 14 days
    const xpAreaData = (() => {
        const days = 14;
        const now = new Date();
        return Array.from({ length: days }, (_, i) => {
            const date = new Date(now);
            date.setDate(date.getDate() - (days - 1 - i));
            const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const xpEarned = transactions
                .filter(tx => {
                    const d = new Date(tx.createdAt);
                    return d.toDateString() === date.toDateString();
                })
                .reduce((sum, tx) => sum + tx.amount, 0);
            return { label, xp: xpEarned };
        });
    })();

    // Cumulative XP (running total ending at current XP)
    const xpCumulativeData = (() => {
        const totalXp = user?.xp || 0;
        const earned = xpAreaData.map(d => d.xp);
        const totalInWindow = earned.reduce((a, b) => a + b, 0);
        const baseXp = Math.max(0, totalXp - totalInWindow);
        let running = baseXp;
        return xpAreaData.map(d => {
            running += d.xp;
            return { label: d.label, xp: running, daily: d.xp };
        });
    })();

    // Activity per week (last 4 weeks)
    const activityData = (() => {
        const weeks = 8;
        const now = new Date();
        return Array.from({ length: weeks }, (_, i) => {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (weeks - 1 - i) * 7 - 6);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const votes = voteEvents.filter(e => {
                const d = new Date(e.date);
                return d >= weekStart && d <= weekEnd;
            }).length;
            const posts = postEvents.filter(e => {
                const d = new Date(e.date);
                return d >= weekStart && d <= weekEnd;
            }).length;
            return { label, votes, posts };
        });
    })();

    // XP by source type
    const xpByType = (() => {
        const map: Record<string, number> = {};
        for (const tx of transactions) {
            const key = tx.type || "OTHER";
            map[key] = (map[key] || 0) + tx.amount;
        }
        const colorMap: Record<string, string> = {
            VOTE_CAST: "#60A5FA", SUBMISSION: "#A3E635", LOGIN_STREAK: "#FB923C",
            MILESTONE: "#C084FC", REFERRAL: "#F472B6", OTHER: "#6B7280",
        };
        const labelMap: Record<string, string> = {
            VOTE_CAST: "Votes", SUBMISSION: "Posts", LOGIN_STREAK: "Streaks",
            MILESTONE: "Milestones", REFERRAL: "Referrals", OTHER: "Other",
        };
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .map(([type, amount]) => ({
                label: labelMap[type] || type,
                amount,
                color: colorMap[type] || colorMap.OTHER,
            }));
    })();

    // Follower growth — last 30 days, daily cumulative
    const followerGrowthData = (() => {
        const days = 30;
        const now = new Date();
        const total = followers.length;
        // Build daily buckets of new followers
        const newPerDay: Record<string, number> = {};
        for (const f of followers) {
            if (!f.followedAt) continue;
            const d = new Date(f.followedAt).toDateString();
            newPerDay[d] = (newPerDay[d] || 0) + 1;
        }
        // Find earliest follower date
        const dates = followers
            .filter(f => f.followedAt)
            .map(f => new Date(f.followedAt!).getTime());
        const earliest = dates.length ? Math.min(...dates) : now.getTime();

        // Rolling cumulative from 30 days ago
        let running = 0;
        // Count followers older than 30 days as baseline
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        const baseline = followers.filter(f => f.followedAt && new Date(f.followedAt) < cutoff).length;
        running = baseline;

        return Array.from({ length: days }, (_, i) => {
            const date = new Date(now);
            date.setDate(date.getDate() - (days - 1 - i));
            running += (newPerDay[date.toDateString()] || 0);
            return {
                label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                followers: running,
                new: newPerDay[date.toDateString()] || 0,
            };
        });
    })();

    // Events vs Earnings (last 8 events participated, chronological)
    const eventsEarningsData = [...allActivity]
        .slice(0, 8)
        .reverse()
        .map(item => ({
            label: item.title.length > 14 ? item.title.slice(0, 14) + "…" : item.title,
            earnings: item.earnings || 0,
            xp: item.xpEarned || 0,
        }));

    const xp = user?.xp || 0;
    const xpLevel = Math.floor(xp / 1000) + 1;
    const xpProgress = (xp % 1000) / 10;
    const xpToNext = xpLevel * 1000 - xp;

    const statRows = [
        [
            { label: "Earnings", value: stats?.earnings ? `$${stats.earnings.toFixed(2)}` : "$0.00", icon: DollarSign, color: "text-lime-400", bg: "bg-lime-400/10" },
            { label: "XP", value: xp.toLocaleString(), icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10" },
            { label: "Followers", value: (stats?.subscribers ?? 0).toString(), icon: Users, color: "text-pink-400", bg: "bg-pink-400/10" },
            { label: "Brands", value: "—", icon: Building2, color: "text-blue-400", bg: "bg-blue-400/10" },
        ],
        [
            { label: "Events", value: (stats?.events ?? 0).toString(), icon: Trophy, color: "text-purple-400", bg: "bg-purple-400/10" },
            { label: "Votes Cast", value: (stats?.votesCast ?? 0).toString(), icon: MousePointerClick, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "Posts", value: (stats?.posts ?? 0).toString(), icon: ImageIcon, color: "text-lime-400", bg: "bg-lime-400/10" },
            { label: "Votes Received", value: (stats?.votesReceived ?? 0).toLocaleString(), icon: ThumbsUp, color: "text-purple-400", bg: "bg-purple-400/10" },
        ],
    ];

    const tabs = [
        { id: "overall" as TabType, label: "Overall" },
        { id: "vote" as TabType, label: "Vote" },
        { id: "post" as TabType, label: "Post" },
    ];

    const tier = getTier(xpLevel);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="w-full pt-6 lg:pt-10 pb-20 md:pb-12 space-y-10">

                    {/* ── Header ─────────────────────────────── */}
                    <div className="space-y-1">
                        <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">
                            Track your performance
                        </p>
                    </div>

                    {/* ── Stats: 2 rows × 4 cols ─────────────── */}
                    {loading ? (
                        <div className="space-y-3">
                            {[0, 1].map(r => (
                                <div key={r} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="h-[70px] rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {statRows.map((row, ri) => (
                                <div key={ri} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {row.map((stat) => (
                                        <div
                                            key={stat.label}
                                            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all"
                                        >
                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                                                <stat.icon className={cn("w-4 h-4", stat.color)} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-foreground/30 leading-none mb-1">{stat.label}</p>
                                                <p className="font-display text-3xl text-foreground tracking-tight leading-none">{stat.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Tabs ───────────────────────────────── */}
                    <div className="flex items-center gap-1.5 border-t border-white/[0.05] pt-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                    activeTab === tab.id
                                        ? "bg-white text-black border-white"
                                        : "bg-white/[0.04] text-foreground/40 border-white/[0.06] hover:bg-white/[0.08] hover:text-foreground/80"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Two-column layout ──────────────────── */}
                    <div className="flex flex-col lg:flex-row gap-8">

                        {/* ── Left: Activity List ─────────────── */}
                        <div className="flex-1 min-w-0 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
                                    {activeTab === "overall" ? "All Activity" : activeTab === "vote" ? "Vote Events" : "Post Events"}
                                </p>
                                <span className="text-[10px] font-black text-foreground/20">
                                    {filteredActivity.length} events
                                </span>
                            </div>

                            {loading ? (
                                <div className="divide-y divide-white/[0.04]">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 py-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/[0.05] animate-pulse shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 bg-white/[0.05] rounded animate-pulse w-2/3" />
                                                <div className="h-2.5 bg-white/[0.03] rounded animate-pulse w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredActivity.length === 0 ? (
                                <div className="py-16 text-center">
                                    <p className="text-[11px] text-white/20 font-medium">
                                        No {activeTab === "overall" ? "" : activeTab + " "}activity yet
                                    </p>
                                </div>
                            ) : (() => {
                                // Date grouping
                                const now = new Date();
                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

                                const groups: { label: string; items: typeof paginatedActivity }[] = [];
                                const groupMap: Record<string, typeof paginatedActivity> = {};

                                paginatedActivity.forEach(item => {
                                    const d = new Date(item.date);
                                    const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                    const label =
                                        itemDay.getTime() === today.getTime() ? "Today" :
                                        itemDay.getTime() === yesterday.getTime() ? "Yesterday" : "Earlier";
                                    if (!groupMap[label]) { groupMap[label] = []; groups.push({ label, items: groupMap[label] }); }
                                    groupMap[label].push(item);
                                });

                                return (
                                    <div className="space-y-5">
                                        {groups.map(({ label, items }) => (
                                            <div key={label}>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 px-1">{label}</p>
                                                <div className="bg-white/[0.015] rounded-xl px-3">
                                                    {items.map((item, i) => (
                                                        <ActivityRow key={item.id + i} item={item} index={i} isLast={i === items.length - 1} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {hasMore && (
                                            <button
                                                onClick={() => setPage(p => p + 1)}
                                                className="w-full py-2.5 text-[10px] font-medium text-white/25 hover:text-white/50 transition-colors"
                                            >
                                                Load more
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* ── Right: Gamified XP & Achievements ── */}
                        <div className="lg:w-[300px] xl:w-[320px] flex-shrink-0 space-y-4">

                            {/* ── Level Card ─────────────────────── */}
                            <button
                                onClick={() => setShowLevelModal(true)}
                                className={cn(
                                    "relative overflow-hidden rounded-[24px] border p-5 w-full text-left cursor-pointer",
                                    "hover:brightness-110 active:scale-[0.99] transition-all duration-200",
                                    tier.border, tier.glow,
                                    "bg-gradient-to-br from-white/[0.04] to-transparent"
                                )}
                            >
                                {/* Background glow blob */}
                                <div className={cn("absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[60px] opacity-40", tier.bg)} />

                                <div className="relative z-10">
                                    {/* Tier badge + level */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground/30 mb-1">Current Rank</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className={cn("font-display text-5xl leading-none tracking-tight", tier.color)}>
                                                    {xpLevel}
                                                </span>
                                                <span className={cn("text-xs font-black uppercase tracking-widest", tier.color)}>
                                                    {tier.name}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", tier.bg, tier.border)}>
                                            <Zap className={cn("w-6 h-6", tier.color)} />
                                        </div>
                                    </div>

                                    {/* XP total */}
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">Total XP</span>
                                        <span className="font-display text-lg text-foreground tracking-tight">{xp.toLocaleString()}</span>
                                    </div>

                                    {/* XP progress bar */}
                                    <div className="space-y-1.5">
                                        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                            <motion.div
                                                className={cn("h-full rounded-full", tier.color.replace("text-", "bg-"))}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${xpProgress}%` }}
                                                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] font-black text-foreground/25">
                                            <span>{(xp % 1000).toLocaleString()} / 1000 XP</span>
                                            <span>{xpToNext.toLocaleString()} to Lv.{xpLevel + 1}</span>
                                        </div>
                                    </div>

                                    {/* Level track: prev → current → next */}
                                    <div className="mt-4 flex items-center gap-1">
                                        {TIERS.map((t, i) => {
                                            const isActive = t.name === tier.name;
                                            const isPast = TIERS.indexOf(tier) > i;
                                            return (
                                                <div key={t.name} className="flex-1 flex flex-col items-center gap-1">
                                                    <div className={cn(
                                                        "w-full h-1 rounded-full transition-all",
                                                        isActive ? tier.color.replace("text-", "bg-") :
                                                            isPast ? "bg-white/20" : "bg-white/[0.06]"
                                                    )} />
                                                    {isActive && (
                                                        <span className={cn("text-[8px] font-black uppercase tracking-wider", tier.color)}>{t.name}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Click hint */}
                                <div className="relative z-10 mt-3 flex items-center gap-1 opacity-40">
                                    <ArrowUpRight className={cn("w-3 h-3", tier.color)} />
                                    <span className={cn("text-[8px] font-black uppercase tracking-widest", tier.color)}>View level details</span>
                                </div>
                            </button>

                            {/* ── Achievements ───────────────────── */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                                        {activeTab === "vote" ? "Vote" : activeTab === "post" ? "Post" : ""} Achievements
                                    </span>
                                    <span className="text-[9px] font-black text-foreground/20">
                                        {achievements.filter(a => a.current >= a.target).length}/{achievements.length}
                                    </span>
                                </div>

                                <div className="p-3 space-y-2">
                                    {visibleAchievements.map((a, i) => {
                                        const done = a.current >= a.target;
                                        const pct = Math.min(100, (a.current / a.target) * 100);
                                        const Icon = a.icon;
                                        return (
                                            <motion.div
                                                key={a.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className={cn(
                                                    "relative overflow-hidden rounded-xl border p-3 transition-all",
                                                    done
                                                        ? cn("border-opacity-30", a.border, "bg-gradient-to-r from-white/[0.04] to-transparent")
                                                        : pct > 0
                                                            ? "border-white/[0.08] bg-white/[0.02]"
                                                            : "border-white/[0.04] bg-transparent"
                                                )}
                                            >
                                                {/* Done glow */}
                                                {done && (
                                                    <div className={cn("absolute inset-0 opacity-10", a.bg)} />
                                                )}

                                                <div className="relative flex items-center gap-3">
                                                    {/* Icon */}
                                                    <div className={cn(
                                                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                                                        done ? cn(a.bg, a.border) : "bg-white/[0.04] border-white/[0.06]"
                                                    )}>
                                                        {done
                                                            ? <Icon className={cn("w-4 h-4", a.color)} />
                                                            : pct === 0
                                                                ? <Lock className="w-4 h-4 text-white/20" />
                                                                : <Icon className={cn("w-4 h-4 opacity-50", a.color)} />
                                                        }
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                                            <span className={cn(
                                                                "text-[10px] font-black truncate",
                                                                done ? a.color : pct > 0 ? "text-foreground/60" : "text-foreground/25"
                                                            )}>
                                                                {a.label}
                                                            </span>
                                                            {done ? (
                                                                <span className={cn("text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5 shrink-0", a.color)}>
                                                                    <CheckCircle2 className="w-3 h-3" /> Done
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-yellow-400/60 shrink-0">+{a.xp}</span>
                                                            )}
                                                        </div>

                                                        {!done && (
                                                            <>
                                                                <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mb-1">
                                                                    <div
                                                                        className={cn("h-full rounded-full transition-all duration-700", pct > 0 ? a.color.replace("text-", "bg-") : "bg-white/10")}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                <p className={cn("text-[9px] font-medium", pct > 0 ? "text-foreground/30" : "text-foreground/15")}>
                                                                    {a.current}/{a.target}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    <button
                                        onClick={() => setShowMilestonesModal(true)}
                                        className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 hover:bg-white/[0.06] hover:text-foreground/50 transition-all"
                                    >
                                        Show All Milestones
                                    </button>
                                </div>
                            </div>

                            {/* ── XP History Feed ─────────────────── */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">XP History</span>
                                    <span className="text-[9px] font-black text-foreground/20">{transactions.length} entries</span>
                                </div>
                                <div className="p-3 space-y-1">
                                    {transactions.length === 0 ? (
                                        <p className="text-[10px] text-foreground/20 font-bold text-center py-6">No XP earned yet</p>
                                    ) : (
                                        transactions.slice(0, 8).map((tx) => {
                                            const typeMap: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
                                                VOTE_CAST:     { icon: ThumbsUp,  color: "text-blue-400",   bg: "bg-blue-400/10",   label: "Vote cast" },
                                                SUBMISSION:    { icon: ImageIcon, color: "text-lime-400",   bg: "bg-lime-400/10",   label: "Post submitted" },
                                                LOGIN_STREAK:  { icon: Flame,     color: "text-orange-400", bg: "bg-orange-400/10", label: "Login streak" },
                                                MILESTONE:     { icon: Trophy,    color: "text-purple-400", bg: "bg-purple-400/10", label: "Milestone" },
                                                REFERRAL:      { icon: Users,     color: "text-pink-400",   bg: "bg-pink-400/10",   label: "Referral" },
                                            };
                                            const meta = typeMap[tx.type] ?? { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10", label: tx.type };
                                            const Icon = meta.icon;
                                            const elapsed = Date.now() - new Date(tx.createdAt).getTime();
                                            const relTime = elapsed < 3600000
                                                ? `${Math.floor(elapsed / 60000)}m ago`
                                                : elapsed < 86400000
                                                    ? `${Math.floor(elapsed / 3600000)}h ago`
                                                    : `${Math.floor(elapsed / 86400000)}d ago`;
                                            return (
                                                <div key={tx.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", meta.bg)}>
                                                        <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-black text-foreground/70 truncate">
                                                            {tx.description || meta.label}
                                                        </p>
                                                        <p className="text-[9px] text-foreground/30 font-medium">{relTime}</p>
                                                    </div>
                                                    <span className={cn("text-[11px] font-black shrink-0", tx.amount > 0 ? "text-yellow-400" : "text-red-400")}>
                                                        {tx.amount > 0 ? "+" : ""}{tx.amount} XP
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ── Graphs & Insights ───────────────────── */}
                    {!loading && (
                        <div className="space-y-4 pt-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30">Graphs &amp; Insights</p>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                            {/* XP Growth (cumulative area chart) */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">XP Growth</p>
                                        <p className="text-[9px] font-bold text-foreground/25 mt-0.5">Last 14 days</p>
                                    </div>
                                    <span className="text-[10px] font-black text-yellow-400">
                                        +{xpAreaData.reduce((s, d) => s + d.xp, 0).toLocaleString()} XP
                                    </span>
                                </div>
                                <ResponsiveContainer width="100%" height={140}>
                                    <AreaChart data={xpCumulativeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.35} />
                                                <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 8, fill: "rgba(255,255,255,0.25)", fontWeight: 700 }}
                                            tickLine={false} axisLine={false}
                                            interval={2}
                                        />
                                        <YAxis tick={{ fontSize: 8, fill: "rgba(255,255,255,0.2)", fontWeight: 700 }} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                                            labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}
                                            formatter={(val: any, name: any) => [
                                                name === "xp" ? `${Number(val).toLocaleString()} XP` : `+${val} XP`,
                                                name === "xp" ? "Total XP" : "Daily Earned"
                                            ]}
                                        />
                                        <Area type="monotone" dataKey="xp" stroke="#A78BFA" strokeWidth={2} fill="url(#xpGrad)" dot={false} activeDot={{ r: 4, fill: "#A78BFA" }} />
                                        <Area type="monotone" dataKey="daily" stroke="#60A5FA" strokeWidth={1.5} fill="none" strokeDasharray="3 3" dot={false} activeDot={{ r: 3, fill: "#60A5FA" }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#A78BFA] rounded" /><span className="text-[9px] font-bold text-foreground/30">Cumulative</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-[#60A5FA]" /><span className="text-[9px] font-bold text-foreground/30">Daily</span></div>
                                </div>
                            </div>

                            {/* XP by Source */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5">
                                <div className="mb-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">XP by Source</p>
                                    <p className="text-[9px] font-bold text-foreground/25 mt-0.5">All time breakdown</p>
                                </div>
                                {xpByType.length === 0 ? (
                                    <p className="text-[10px] text-foreground/20 font-bold text-center py-8">No XP data yet</p>
                                ) : (
                                    <div className="space-y-3">
                                        {xpByType.slice(0, 5).map((src) => {
                                            const totalXpAllSrc = xpByType.reduce((s, d) => s + d.amount, 0);
                                            const pct = totalXpAllSrc > 0 ? (src.amount / totalXpAllSrc) * 100 : 0;
                                            return (
                                                <div key={src.label}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-black text-foreground/60">{src.label}</span>
                                                        <span className="text-[10px] font-black" style={{ color: src.color }}>+{src.amount.toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                                            className="h-full rounded-full"
                                                            style={{ background: src.color }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Follower Growth */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Follower Growth</p>
                                        <p className="text-[9px] font-bold text-foreground/25 mt-0.5">Last 30 days</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-pink-400">{stats?.subscribers ?? 0} total</p>
                                        <p className="text-[9px] font-bold text-foreground/30">
                                            +{followerGrowthData.reduce((s, d) => s + d.new, 0)} this month
                                        </p>
                                    </div>
                                </div>
                                {followers.length === 0 ? (
                                    <div className="h-[120px] flex items-center justify-center">
                                        <p className="text-[10px] font-bold text-foreground/20">No follower data yet</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={120}>
                                        <AreaChart data={followerGrowthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#F472B6" stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor="#F472B6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="label" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.25)", fontWeight: 700 }} tickLine={false} axisLine={false} interval={5} />
                                            <YAxis tick={{ fontSize: 8, fill: "rgba(255,255,255,0.2)", fontWeight: 700 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip
                                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                                                labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}
                                                formatter={(val: any, name: any) => [val, name === "followers" ? "Total Followers" : "New Today"]}
                                            />
                                            <Area type="monotone" dataKey="followers" stroke="#F472B6" strokeWidth={2} fill="url(#followerGrad)" dot={false} activeDot={{ r: 4, fill: "#F472B6" }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Events vs Earnings */}
                            <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Events vs Earnings</p>
                                        <p className="text-[9px] font-bold text-foreground/25 mt-0.5">Last 8 events</p>
                                    </div>
                                    <span className="text-[10px] font-black text-lime-400">
                                        ${eventsEarningsData.reduce((s, d) => s + d.earnings, 0).toFixed(2)} earned
                                    </span>
                                </div>
                                {eventsEarningsData.length === 0 ? (
                                    <div className="h-[120px] flex items-center justify-center">
                                        <p className="text-[10px] font-bold text-foreground/20">No event data yet</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={120}>
                                        <BarChart data={eventsEarningsData} barGap={4} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                            <XAxis dataKey="label" tick={{ fontSize: 7, fill: "rgba(255,255,255,0.25)", fontWeight: 700 }} tickLine={false} axisLine={false} />
                                            <YAxis tick={{ fontSize: 7, fill: "rgba(255,255,255,0.2)", fontWeight: 700 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip
                                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                                                labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}
                                                formatter={(val: any, name: any) => [name === "earnings" ? `$${Number(val).toFixed(2)}` : `${val} XP`, name === "earnings" ? "Earned (USDC)" : "XP Earned"]}
                                            />
                                            <Bar dataKey="earnings" fill="#A3E635" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                            <Bar dataKey="xp" fill="#A78BFA" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[#A3E635] rounded-sm" /><span className="text-[9px] font-bold text-foreground/30">Earnings (USDC)</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[#A78BFA] rounded-sm" /><span className="text-[9px] font-bold text-foreground/30">XP Earned</span></div>
                                </div>
                            </div>

                            {/* Activity bar chart */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Activity</p>
                                        <p className="text-[9px] font-bold text-foreground/25 mt-0.5">By week</p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#60A5FA]" /><span className="text-[8px] font-bold text-foreground/40">Votes</span></div>
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#A3E635]" /><span className="text-[8px] font-bold text-foreground/40">Posts</span></div>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={120}>
                                    <BarChart data={activityData.slice(-6)} barGap={2} margin={{ top: 0, right: 2, left: -24, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 7, fill: "rgba(255,255,255,0.25)", fontWeight: 700 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 7, fill: "rgba(255,255,255,0.2)", fontWeight: 700 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                                            labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}
                                        />
                                        <Bar dataKey="votes" fill="#60A5FA" radius={[3, 3, 0, 0]} maxBarSize={16} />
                                        <Bar dataKey="posts" fill="#A3E635" radius={[3, 3, 0, 0]} maxBarSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            </div>
                        </div>
                    )}

                </main>
            </SidebarLayout>

            {/* ── Level Breakdown Modal ─────────────────── */}
            <LevelBreakdownModal
                open={showLevelModal}
                onClose={() => setShowLevelModal(false)}
                xp={xp}
                xpLevel={xpLevel}
            />

            {/* ── Milestones Modal ──────────────────────── */}
            <MilestonesModal
                open={showMilestonesModal}
                onClose={() => setShowMilestonesModal(false)}
                stats={stats}
                streak={user?.currentStreak ?? 0}
            />
        </div>
    );
}
