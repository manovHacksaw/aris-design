"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Zap, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getUserStats } from "@/services/mockUserService";
import { getHotChallenges, getRecentSubmissions } from "@/services/mockEventService";
import type { UserStats, HotChallenge, RecentSubmission } from "@/types/api";

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function RightDashboard() {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [hotChallenges, setHotChallenges] = useState<HotChallenge[]>([]);
    const [recentSubs, setRecentSubs] = useState<RecentSubmission[]>([]);

    useEffect(() => {
        getUserStats().then(setStats).catch(() => { });
        getHotChallenges().then(setHotChallenges).catch(() => { });
        getRecentSubmissions().then(setRecentSubs).catch(() => { });
    }, []);

    return (
        <div className="flex flex-col gap-6 sticky top-6">
            {/* 1. Streak & Status Card */}
            <div className="bg-card backdrop-blur-xl rounded-[32px] p-6 border border-card-border shadow-spotify overflow-hidden relative group h-[200px] flex flex-col justify-center">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-500" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-1">Current Streak</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-black text-foreground tabular-nums drop-shadow-sm">
                                    {stats?.streak ?? "—"}
                                </h3>
                                <span className="text-sm font-black text-orange-500 uppercase tracking-widest animate-pulse">Days</span>
                            </div>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 rotate-3 group-hover:rotate-0 transition-transform duration-300">
                            <Flame className="w-7 h-7 text-white fill-current animate-bounce" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-foreground/60 uppercase">{stats?.rankLabel ?? "—"}</span>
                            <span className="text-[11px] font-black text-orange-500">{stats ? `${stats.rankProgress}% to ${stats.nextTierLabel}` : "—"}</span>
                        </div>
                        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/50">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats?.rankProgress ?? 0}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. XP Growth Card */}
            <div className="bg-card backdrop-blur-xl rounded-[32px] p-6 border border-card-border shadow-spotify">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-foreground tracking-tight">XP Analysis</h3>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mt-1">Weekly progress update</p>
                    </div>
                    <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center border border-border">
                        <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                </div>
                <div className="h-32 flex items-end justify-between gap-1.5 mb-6">
                    {(stats?.weeklyXp ?? [40, 65, 45, 80, 55, 90, 75]).map((height, i, arr) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={cn(
                                "w-full rounded-t-xl transition-all duration-300 relative group/bar",
                                i === arr.length - 1 ? "bg-primary shadow-[0_0_20px_rgba(47,106,255,0.4)]" : "bg-primary/10 hover:bg-primary/30"
                            )}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                {Math.round(height * 10)}
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-foreground/30 font-black uppercase tracking-widest px-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
                </div>
            </div>

            {/* 3. Recent Activity */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[13px] font-black text-foreground uppercase tracking-widest">Recent Activity</h3>
                    <Link href="/activity" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 transition-colors">
                        View All <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>
                <div className="space-y-3">
                    {[
                        {
                            id: 1,
                            type: "Post Event",
                            title: "Nike Air Max Redesign",
                            status: "Completed",
                            points: "+250 XP"
                        },
                        {
                            id: 2,
                            type: "Vote Event",
                            title: "Summer Vibes Campaign",
                            status: "In Progress",
                            points: "+50 XP"
                        }
                    ].map((item) => (
                        <Link href="/activity" key={item.id} className="block bg-card/50 hover:bg-card hover:-translate-y-1 transition-all border border-border rounded-[24px] p-5 group cursor-pointer shadow-sm hover:shadow-md">
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", item.type === "Vote Event" ? "text-accent" : "text-primary")}>{item.type}</span>
                                <span className="text-[10px] font-black text-foreground/40 bg-secondary px-2 py-0.5 rounded-full">{item.status}</span>
                            </div>
                            <h4 className="text-sm font-black text-foreground mb-3 tracking-tight">{item.title}</h4>
                            <div className="flex items-center gap-1 text-primary font-black text-xs">
                                <Zap className="w-3 h-3 fill-current" />
                                {item.points}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* 4. Recent Submissions */}
            {recentSubs.length > 0 && (
                <div className="space-y-4">
                    <div className="px-2">
                        <h3 className="text-[13px] font-black text-foreground uppercase tracking-widest">Recent Submissions</h3>
                    </div>
                    <div className="bg-card/30 backdrop-blur-xl border border-border rounded-[32px] overflow-hidden">
                        {recentSubs.map((item) => (
                            <div key={item.id} className={cn(
                                "flex items-center gap-4 p-5 transition-all hover:bg-foreground/5 cursor-pointer border-b border-border/50 last:border-0",
                                item.isActive && "bg-primary/10 hover:bg-primary/20"
                            )}>
                                <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                                    <img src={item.coverImage} className="w-full h-full object-cover" alt={item.username} />
                                    {item.isActive && (
                                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                                            <Play className="w-5 h-5 text-white fill-current" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={cn("text-sm font-black truncate tracking-tight", item.isActive ? "text-primary" : "text-foreground")}>
                                        {item.eventTitle}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">{item.username}</span>
                                        <span className="text-[10px] text-foreground/20">•</span>
                                        <span className="text-[10px] font-bold text-foreground/30">{relativeTime(item.createdAt)}</span>
                                    </div>
                                </div>
                                {item.isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                            </div>
                        ))}
                    </div>
                    <button className="w-full text-center text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] py-2 hover:text-foreground/60 transition-colors">
                        All Activity
                    </button>
                </div>
            )}
        </div>
    );
}
