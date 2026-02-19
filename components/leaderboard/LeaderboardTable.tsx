"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import CompactLeaderboardCard from "@/components/leaderboard/CompactLeaderboardCard";
import { getLeaderboard } from "@/services/mockUserService";
import type { LeaderboardEntry } from "@/types/api";

function TableSkeleton() {
    return (
        <div className="bg-card/50 backdrop-blur-xl border border-border/80 rounded-[32px] overflow-hidden shadow-2xl animate-pulse">
            <div className="hidden md:grid grid-cols-[80px_1fr_120px_110px_120px_120px_1fr] gap-4 px-8 py-5 border-b border-border/60">
                {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-3 bg-secondary/60 rounded-full" />)}
            </div>
            <div className="divide-y divide-border/40">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="px-8 py-6 flex items-center gap-6">
                        <div className="w-8 h-4 bg-secondary/60 rounded-full shrink-0" />
                        <div className="w-10 h-10 bg-secondary/60 rounded-full shrink-0" />
                        <div className="flex-1 h-4 bg-secondary/60 rounded-full max-w-[160px]" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LeaderboardTable() {
    const [users, setUsers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getLeaderboard()
            .then((res) => { setUsers(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <TableSkeleton />;
    if (!users.length) return null;

    return (
        <div className="bg-card/50 backdrop-blur-xl border border-border/80 rounded-[32px] overflow-hidden shadow-2xl">
            {/* Header - Desktop */}
            <div className="hidden md:grid grid-cols-[80px_1fr_120px_110px_120px_120px_1fr] gap-4 px-8 py-5 text-[10px] text-foreground/30 uppercase tracking-[0.2em] font-black border-b border-border/60">
                <span>Rank</span>
                <span>User Identity</span>
                <span>Experience</span>
                <span>Streak</span>
                <span>Total Votes</span>
                <span>Rewards</span>
                <span>Achievements</span>
            </div>

            {/* Desktop Rows */}
            <div className="hidden md:block divide-y divide-border/40">
                {users.map((user, i) => (
                    <motion.div
                        key={user.userId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                            "group transition-all duration-300",
                            user.isCurrentUser ? "bg-primary/5" : "hover:bg-foreground/[0.02]"
                        )}
                    >
                        <Link href={user.isCurrentUser ? "/profile" : `/profile/${user.username.toLowerCase()}`} className="block">
                            <div className="grid grid-cols-[80px_1fr_120px_110px_120px_120px_1fr] gap-4 items-center px-8 py-6 cursor-pointer">
                                <span className={cn("text-sm font-black tracking-tight", user.rank <= 3 ? "text-primary" : "text-foreground/30")}>
                                    #{user.rank.toString().padStart(2, '0')}
                                </span>

                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full border-2 border-border/50 object-cover bg-background group-hover:border-primary transition-colors" />
                                        {user.isCurrentUser && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn("text-sm font-black tracking-tight", user.isCurrentUser ? "text-primary" : "text-foreground")}>
                                            {user.username}
                                        </span>
                                        {user.isCurrentUser && <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5">Community Member</span>}
                                    </div>
                                </div>

                                <span className="text-sm font-black text-primary tracking-tight">{user.xp.toLocaleString()} XP</span>

                                <span className="text-sm font-black text-orange-500 flex items-center gap-2">
                                    <Flame className="w-4 h-4 fill-current" />
                                    {user.streak}d
                                </span>

                                <span className="text-sm font-bold text-foreground/60 flex items-center gap-2">
                                    <ThumbsUp className="w-4 h-4 text-foreground/20 group-hover:text-accent transition-colors" />
                                    {user.totalVotesReceived > 1000 ? `${(user.totalVotesReceived / 1000).toFixed(1)}k` : user.totalVotesReceived}
                                </span>

                                <span className="text-sm font-black text-accent tracking-tight">${user.totalRewardsEarned}</span>

                                <div className="flex flex-wrap gap-2">
                                    {user.badges.map((badge) => (
                                        <span key={badge} className="px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-secondary/50 border border-border/40 text-foreground/50 group-hover:border-primary/20 transition-colors">
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-6 p-4">
                <div className="grid grid-cols-3 gap-2">
                    {users.slice(0, 3).map((user) => (
                        <CompactLeaderboardCard key={user.userId} user={user} />
                    ))}
                </div>
                <div className="flex flex-col space-y-2">
                    {users.slice(3).map((user, i) => (
                        <motion.div key={user.userId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                            <Link href={user.isCurrentUser ? "/profile" : `/profile/${user.username.toLowerCase()}`} className="block">
                                <div className={cn("flex items-center gap-3 p-3 rounded-[20px] border transition-colors", user.isCurrentUser ? "bg-primary/5 border-primary/20" : "bg-card border-border/50 hover:bg-secondary/30")}>
                                    <span className="text-xs font-black text-foreground/30 w-5 text-center">#{user.rank}</span>
                                    <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full border border-border object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-foreground truncate">{user.username}</p>
                                        <span className="text-[10px] text-primary font-black">{user.xp < 1000 ? user.xp : `${(user.xp / 1000).toFixed(1)}k`} XP</span>
                                    </div>
                                    <span className="text-xs font-black text-accent">${user.totalRewardsEarned}</span>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
