"use client";

import { motion } from "framer-motion";
import { Trophy, Zap, MousePointerClick, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserStatsCardProps {
    user: {
        rank: number;
        username: string;
        avatar: string;
        xp: number;
        votesCast: number;
        votesReceived: number;
        streak: number;
        level?: number;
        nextLevelXp?: number;
    };
}

export default function UserStatsCard({ user }: UserStatsCardProps) {
    const xpProgress = user.nextLevelXp ? (user.xp / user.nextLevelXp) * 100 : 75; // Mock progress if not provided

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full relative overflow-hidden rounded-[24px] bg-gradient-to-br from-primary/10 via-background to-secondary/5 border border-primary/20 shadow-2xl p-6 md:p-8"
        >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">

                {/* Identity Section */}
                <div className="flex flex-col items-center md:items-start gap-4 shrink-0">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                        <img
                            src={user.avatar}
                            alt={user.username}
                            className="relative w-24 h-24 rounded-full border-4 border-background object-cover shadow-xl"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-foreground text-background text-xs font-black px-3 py-1 rounded-full border-2 border-background shadow-lg">
                            LVL {user.level || 5}
                        </div>
                    </div>

                    <div className="text-center md:text-left space-y-1">
                        <h2 className="text-2xl font-black tracking-tighter text-foreground">@{user.username}</h2>
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                Rank #{user.rank}
                            </span>
                            <span className="text-xs text-foreground/40 font-bold">Top 5%</span>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* XP Card */}
                    <div className="bg-background/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-background/60 transition-colors group">
                        <div className="p-2 rounded-full bg-primary/10 text-primary mb-1 group-hover:scale-110 transition-transform">
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-black">Total XP</span>
                        <span className="text-2xl font-black text-foreground tracking-tight">{user.xp.toLocaleString()}</span>
                    </div>

                    {/* Votes Cast */}
                    <div className="bg-background/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-background/60 transition-colors group">
                        <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 mb-1 group-hover:scale-110 transition-transform">
                            <MousePointerClick className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-black">Votes Cast</span>
                        <span className="text-2xl font-black text-foreground tracking-tight">{user.votesCast.toLocaleString()}</span>
                    </div>

                    {/* Votes Received */}
                    <div className="bg-background/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-background/60 transition-colors group">
                        <div className="p-2 rounded-full bg-blue-500/10 text-blue-500 mb-1 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-black">Votes Received</span>
                        <span className="text-2xl font-black text-foreground tracking-tight">{user.votesReceived.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
