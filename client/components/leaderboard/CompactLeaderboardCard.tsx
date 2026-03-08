"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface CompactLeaderboardCardProps {
    user: {
        rank: number;
        username: string;
        avatar: string;
        xp: number;
        streak: number;
        totalRewardsEarned: number;
        isCurrentUser?: boolean;
    };
}

export default function CompactLeaderboardCard({ user }: CompactLeaderboardCardProps) {
    return (
        <Link href={user.isCurrentUser ? "/profile" : `/profile/${user.username.toLowerCase()}`} className="block h-full">
            <motion.div
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "bg-card rounded-[18px] p-2 border border-border/50 shadow-sm h-full flex flex-col items-center text-center relative overflow-hidden",
                    user.isCurrentUser && "bg-primary/5 border-primary/20"
                )}
            >
                {/* Rank Badge - Floating */}
                <div className={cn(
                    "absolute top-1.5 left-1.5 text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full z-10",
                    user.rank <= 3 ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-secondary text-foreground/40"
                )}>
                    #{user.rank}
                </div>

                {/* Avatar - Slightly smaller */}
                <div className="relative w-10 h-10 mb-1.5 mt-2">
                    <img
                        src={user.avatar}
                        alt={user.username}
                        className={cn(
                            "w-full h-full rounded-full object-cover border-2",
                            user.rank <= 3 ? "border-primary" : "border-border"
                        )}
                    />
                    {user.isCurrentUser && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />}
                </div>

                {/* Name */}
                <h3 className="text-[10px] font-black text-foreground truncate w-full mb-1.5 leading-tight">
                    {user.username}
                </h3>

                {/* Simplified Stats: Just XP and Reward (Stacked or tiny grid) */}
                <div className="w-full mt-auto space-y-1">
                    <div className="bg-secondary/40 rounded-[8px] py-1 px-1">
                        <span className="block text-[8px] text-foreground/30 font-bold uppercase leading-none mb-0.5">XP</span>
                        <span className="block text-[9px] font-black text-primary leading-none">
                            {user.xp < 1000 ? user.xp : `${(user.xp / 1000).toFixed(1)}k`}
                        </span>
                    </div>
                    <div className="bg-secondary/40 rounded-[8px] py-1 px-1">
                        <span className="block text-[8px] text-foreground/30 font-bold uppercase leading-none mb-0.5">Earned</span>
                        <span className="block text-[9px] font-black text-accent leading-none">
                            ${user.totalRewardsEarned}
                        </span>
                    </div>
                </div>

            </motion.div>
        </Link>
    );
}
