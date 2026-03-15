"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Users, Building2, Trophy, ThumbsUp, ImageIcon,
    Calendar, Crown, X, Star, Flame, Lock, CheckCircle2,
    MousePointerClick, DollarSign, ArrowUpRight, TrendingUp, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { getUserStats, getUserSubmissions } from "@/services/user.service";
import { getEventsVotedByUser } from "@/services/event.service";
import type { UserStats } from "@/types/user";

// ─── Types ──────────────────────────────────────────────────────

type TabType = "overall" | "vote" | "post";

interface ActivityItem {
    id: string;
    type: "vote" | "post";
    title: string;
    brand: string;
    date: string;
    status: string;
    rank?: number | null;
    votesCast?: number;
    votesReceived?: number;
    earnings?: number;
    xpEarned?: number;
    imageUrl?: string;
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

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
    const isPost = item.type === "post";
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group cursor-pointer"
        >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/[0.05] border border-white/[0.06]">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className={cn("w-full h-full flex items-center justify-center", isPost ? "bg-lime-500/10" : "bg-blue-500/10")}>
                        {isPost
                            ? <ImageIcon className="w-5 h-5 text-lime-400/50" />
                            : <MousePointerClick className="w-5 h-5 text-blue-400/50" />
                        }
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", isPost ? "text-lime-400/70" : "text-blue-400/70")}>
                        {isPost ? "Post" : "Vote"}
                    </span>
                    <span className="text-white/20 text-[9px]">·</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wide truncate">{item.brand}</span>
                </div>
                <h4 className="text-sm font-black text-white truncate tracking-tight">{item.title}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Calendar className="w-3 h-3 text-white/20" />
                    <span className="text-[10px] text-white/30 font-medium">{item.date}</span>
                    {isPost && item.votesReceived !== undefined && (
                        <>
                            <span className="text-white/15">·</span>
                            <ThumbsUp className="w-3 h-3 text-white/20" />
                            <span className="text-[10px] text-white/30 font-medium">{item.votesReceived.toLocaleString()} votes</span>
                        </>
                    )}
                    {!isPost && item.votesCast !== undefined && item.votesCast > 0 && (
                        <>
                            <span className="text-white/15">·</span>
                            <span className="text-[10px] text-white/30 font-medium">{item.votesCast} cast</span>
                        </>
                    )}
                </div>
            </div>

            {/* Right: status/rank + earnings */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
                {item.rank ? (
                    <RankBadge rank={item.rank} />
                ) : (
                    <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                        ["posting", "voting", "scheduled"].includes(item.status)
                            ? "bg-lime-400/10 text-lime-400 border-lime-400/20"
                            : "bg-white/[0.04] text-white/30 border-white/[0.06]"
                    )}>
                        {item.status}
                    </span>
                )}
                {!!item.earnings && item.earnings > 0 && (
                    <span className="text-[10px] font-black text-lime-400">${item.earnings.toFixed(2)}</span>
                )}
                {isPost && !!item.xpEarned && item.xpEarned > 0 && (
                    <span className="text-[9px] font-black text-yellow-400/70">+{item.xpEarned} XP</span>
                )}
            </div>
            <ArrowUpRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
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
    const [showAllAchievements, setShowAllAchievements] = useState(false);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([
            getUserStats().catch(() => null),
            getUserSubmissions(user.id).catch(() => []),
            getEventsVotedByUser(user.id).catch(() => []),
        ]).then(([statsData, submissions, votedEvents]) => {
            setStats(statsData);

            setPostEvents((submissions as any[]).map((s: any) => ({
                id: s.id,
                type: "post" as const,
                title: s.event?.title || "Untitled Event",
                brand: s.event?.brand?.name || "Unknown",
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
                type: "vote" as const,
                title: e.title || "Untitled Event",
                brand: e.brand?.name || "Unknown",
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
    const visibleAchievements = showAllAchievements ? achievements : achievements.slice(0, 4);

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
                        <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-white uppercase leading-[0.92] tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
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
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30 leading-none mb-1">{stat.label}</p>
                                                <p className="font-display text-3xl text-white tracking-tight leading-none">{stat.value}</p>
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
                                        : "bg-white/[0.04] text-white/40 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80"
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
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                                    {activeTab === "overall" ? "All Activity" : activeTab === "vote" ? "Vote Events" : "Post Events"}
                                </p>
                                <span className="text-[10px] font-black text-white/20">
                                    {filteredActivity.length} events
                                </span>
                            </div>

                            {loading ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-[76px] rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                                    ))}
                                </div>
                            ) : filteredActivity.length === 0 ? (
                                <div className="py-20 text-center bg-white/[0.02] rounded-[24px] border border-dashed border-white/[0.07]">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                                        {activeTab === "vote"
                                            ? <MousePointerClick className="w-5 h-5 text-white/20" />
                                            : <ImageIcon className="w-5 h-5 text-white/20" />
                                        }
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                                        No {activeTab === "overall" ? "" : activeTab + " "}activity yet
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        {paginatedActivity.map((item, i) => (
                                            <ActivityRow key={item.id + i} item={item} index={i} />
                                        ))}
                                    </div>
                                    {hasMore && (
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            className="w-full py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:bg-white/[0.05] hover:text-white/60 transition-all"
                                        >
                                            Load More
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── Right: Gamified XP & Achievements ── */}
                        <div className="lg:w-[300px] xl:w-[320px] flex-shrink-0 space-y-4">

                            {/* ── Level Card ─────────────────────── */}
                            <div className={cn(
                                "relative overflow-hidden rounded-[24px] border p-5",
                                tier.border, tier.glow,
                                "bg-gradient-to-br from-white/[0.04] to-transparent"
                            )}>
                                {/* Background glow blob */}
                                <div className={cn("absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[60px] opacity-40", tier.bg)} />

                                <div className="relative z-10">
                                    {/* Tier badge + level */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">Current Rank</p>
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
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Total XP</span>
                                        <span className="font-display text-lg text-white tracking-tight">{xp.toLocaleString()}</span>
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
                                        <div className="flex justify-between text-[9px] font-black text-white/25">
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
                            </div>

                            {/* ── Achievements ───────────────────── */}
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                                        {activeTab === "vote" ? "Vote" : activeTab === "post" ? "Post" : ""} Achievements
                                    </span>
                                    <span className="text-[9px] font-black text-white/20">
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
                                                                done ? a.color : pct > 0 ? "text-white/60" : "text-white/25"
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
                                                                <p className={cn("text-[9px] font-medium", pct > 0 ? "text-white/30" : "text-white/15")}>
                                                                    {a.current}/{a.target}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    {achievements.length > 4 && (
                                        <button
                                            onClick={() => setShowAllAchievements(v => !v)}
                                            className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[9px] font-black uppercase tracking-[0.2em] text-white/30 hover:bg-white/[0.06] hover:text-white/50 transition-all"
                                        >
                                            {showAllAchievements ? "Show Less" : `Show All ${achievements.length}`}
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                </main>
            </SidebarLayout>
        </div>
    );
}
