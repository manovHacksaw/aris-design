"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTopUsers } from "@/services/mockUserService";
import type { LeaderboardEntry } from "@/types/api";

const PodiumCard = ({ user, isPrimary }: { user: LeaderboardEntry; isPrimary: boolean }) => {
    const borderColor = user.rank === 1 ? "border-primary/20" : "border-border/60";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: user.rank * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            className={cn(
                "relative bg-card backdrop-blur-xl border rounded-[32px] overflow-hidden flex flex-col items-center transition-all duration-300",
                borderColor,
                isPrimary ? "w-full max-w-[340px] shadow-2xl z-10" : "w-full max-w-[280px] shadow-lg opacity-90 hover:opacity-100"
            )}
        >
            {/* Rank Badge - Minimal and Premium */}
            <div className={cn(
                "absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black tracking-widest border transition-all duration-300",
                user.rank === 1
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-background border-border/50 text-foreground/40"
            )}>
                #{user.rank}
            </div>

            {/* Content */}
            <div className={cn(
                "pt-14 pb-8 px-8 text-center w-full flex flex-col items-center",
                isPrimary ? "gap-6" : "gap-5"
            )}>
                {/* Avatar with Glow Effect for #1 */}
                <div className="relative">
                    {user.rank === 1 && (
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                    )}
                    <img
                        src={user.avatar}
                        alt={user.username}
                        className={cn(
                            "relative rounded-full object-cover border-4 bg-background transition-transform duration-500 group-hover:scale-105",
                            user.rank === 1 ? "w-28 h-28 border-primary/20" : "w-24 h-24 border-border/50"
                        )}
                    />
                    {user.rank === 1 && (
                        <div className="absolute -top-4 -right-2 bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                            <Trophy className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {/* Indentity - Stronger Typography */}
                <div className="space-y-1">
                    <h3 className={cn("font-black text-foreground leading-tight tracking-tighter", isPrimary ? "text-xl" : "text-lg")}>
                        @{user.username}
                    </h3>
                    <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em]">{user.displayName}</p>
                </div>

                {/* Stats Grid - Cleaner and more structured */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    {/* Total Earned - Highlighted */}
                    <div className="col-span-2 bg-secondary/50 backdrop-blur-md border border-border/40 rounded-[20px] p-4 group-hover:bg-secondary transition-colors">
                        <p className="text-[9px] text-foreground/30 uppercase tracking-[0.2em] font-black mb-1">Total Rewards</p>
                        <p className="text-2xl font-black text-primary tracking-tighter">
                            ${user.totalRewardsEarned.toLocaleString()}
                        </p>
                    </div>

                    {/* Challenges Won */}
                    <div className="bg-secondary/30 border border-border/30 rounded-[18px] p-3 hover:bg-secondary/50 transition-colors">
                        <p className="text-[9px] text-foreground/30 uppercase tracking-[0.2em] font-black mb-1">Won</p>
                        <p className="text-xs font-black text-foreground flex items-center justify-center gap-1.5">
                            <Star className="w-3 h-3 text-accent fill-accent/20" />
                            {user.challengesWon}
                        </p>
                    </div>

                    {/* Votes received */}
                    <div className="bg-secondary/30 border border-border/30 rounded-[18px] p-3 hover:bg-secondary/50 transition-colors">
                        <p className="text-[9px] text-foreground/30 uppercase tracking-[0.2em] font-black mb-1">Votes</p>
                        <p className="text-xs font-black text-foreground flex items-center justify-center gap-1.5">
                            <Users className="w-3 h-3 text-foreground/40" />
                            {user.totalVotesReceived >= 1000 ? `${(user.totalVotesReceived / 1000).toFixed(1)}k` : user.totalVotesReceived}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function TopUsers() {
    const [top3, setTop3] = useState<LeaderboardEntry[]>([]);

    useEffect(() => {
        getTopUsers()
            .then(setTop3)
            .catch(() => {/* fail silently */});
    }, []);

    if (top3.length < 3) return null;

    // Display order: #2 left, #1 centre, #3 right
    const [second, first, third] = [
        top3.find((u) => u.rank === 2) ?? top3[1],
        top3.find((u) => u.rank === 1) ?? top3[0],
        top3.find((u) => u.rank === 3) ?? top3[2],
    ];

    return (
        <section className="py-8 px-4 md:px-0">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-6 md:gap-4 max-w-5xl mx-auto">
                {/* #2 - Left */}
                <div className="order-2 md:order-1 flex-1 w-full md:w-auto flex justify-center md:justify-end md:mb-8">
                    <PodiumCard user={second} isPrimary={false} />
                </div>

                {/* #1 - Centre */}
                <div className="order-1 md:order-2 flex-1 w-full md:w-auto flex justify-center mb-4 md:mb-0">
                    <PodiumCard user={first} isPrimary={true} />
                </div>

                {/* #3 - Right */}
                <div className="order-3 md:order-3 flex-1 w-full md:w-auto flex justify-center md:justify-start md:mb-8">
                    <PodiumCard user={third} isPrimary={false} />
                </div>
            </div>
        </section>
    );
}
