"use client";

import { motion } from "framer-motion";
import { Flame, TrendingUp, Trophy, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User, UserStats } from "@/types/user";
import { xpToLevel, xpForNextLevel, levelToRank } from "@/types/user";

interface ProfileActivityProps {
    isOwnProfile?: boolean;
    user: User | null;
    stats: UserStats | null;
}

export default function ProfileActivity({ isOwnProfile = false, user, stats }: ProfileActivityProps) {
    const xp = user?.xp ?? 0;
    const streak = user?.currentStreak ?? 0;
    const level = xpToLevel(xp);
    const nextRank = levelToRank(level + 1);
    const { current, next, progress } = xpForNextLevel(xp);
    const xpToNext = next - current;

    // How many days this week had activity (approximate from streak, max 7)
    const activeDaysThisWeek = Math.min(streak % 7 || (streak > 0 ? 7 : 0), 7);

    return (
        <div className="space-y-4">
            {/* XP Progress Card */}
            <div className="bg-card border border-border/40 rounded-[22px] p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.15em] mb-1">Season XP</p>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-foreground tabular-nums">
                                {current.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-foreground/30">/ {next.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                        <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/30 mb-3">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    />
                </div>
                <p className="text-[10px] text-foreground/30 font-bold">
                    <span className="text-primary font-black">{xpToNext.toLocaleString()} XP</span> to {nextRank}
                </p>
            </div>

            {/* Streak Card */}
            <div className="bg-card border border-border/40 rounded-[22px] p-6 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />

                <div className="flex items-center justify-between mb-4 relative">
                    <div>
                        <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.15em] mb-1">Active Streak</p>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-foreground tabular-nums">{streak || "—"}</span>
                            {streak > 0 && <span className="text-xs font-black text-orange-500">days</span>}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Flame className="w-5 h-5 text-white fill-current" />
                    </div>
                </div>

                {/* Streak dots */}
                <div className="flex gap-1.5">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex-1 h-1.5 rounded-full",
                                i < activeDaysThisWeek ? "bg-orange-500" : "bg-secondary"
                            )}
                        />
                    ))}
                </div>
                <p className="text-[10px] text-foreground/30 font-bold mt-2">{activeDaysThisWeek}/7 this week</p>
            </div>

            {/* Achievements / Badges */}
            <div className="bg-card border border-border/40 rounded-[22px] p-6">
                <h4 className="text-xs font-black text-foreground/40 uppercase tracking-widest mb-4">Badges</h4>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { icon: Trophy, label: "Top 10", color: "text-primary bg-primary/10 border-primary/10" },
                        { icon: Zap, label: "Early Bird", color: "text-amber-400 bg-amber-400/10 border-amber-400/10" },
                        { icon: Target, label: "50 Votes", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/10" },
                    ].map((badge) => (
                        <div key={badge.label} className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl border", badge.color)}>
                            <badge.icon className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{badge.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity (own profile only) */}
            {isOwnProfile && stats && (
                <div className="bg-card border border-border/40 rounded-[22px] p-6">
                    <h4 className="text-xs font-black text-foreground/40 uppercase tracking-widest mb-4">Recent Activity</h4>
                    <div className="space-y-4">
                        {stats.posts > 0 && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-foreground/70">{stats.posts} post{stats.posts !== 1 ? "s" : ""} submitted</p>
                                    <p className="text-[10px] text-foreground/30 font-bold">Total submissions</p>
                                </div>
                                <span className="text-[10px] font-black text-primary">+{(stats.posts * 50).toLocaleString()} XP</span>
                            </div>
                        )}
                        {stats.votes > 0 && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-foreground/70">{stats.votes} vote{stats.votes !== 1 ? "s" : ""} cast</p>
                                    <p className="text-[10px] text-foreground/30 font-bold">Total participation</p>
                                </div>
                                <span className="text-[10px] font-black text-primary">+{(stats.votes * 25).toLocaleString()} XP</span>
                            </div>
                        )}
                        {stats.posts === 0 && stats.votes === 0 && (
                            <p className="text-xs text-foreground/30 font-medium text-center py-2">No activity yet. Start exploring!</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
