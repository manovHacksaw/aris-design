"use client";

import { Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventMode } from "@/types/events";

interface RewardBlockProps {
    rewardPool: string;
    baseReward: string;
    topReward?: string;
    participationReward?: string;
    mode: EventMode;
    variant?: "compact" | "full";
    className?: string;
}

export default function RewardBlock({
    rewardPool,
    baseReward,
    topReward,
    participationReward,
    mode,
    variant = "compact",
    className,
}: RewardBlockProps) {
    if (variant === "compact") {
        if (mode === "vote") {
            return (
                <div className={cn("flex items-center justify-between", className)}>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm font-black text-foreground truncate">{baseReward}</span>
                        <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest hidden sm:inline-block">/ Vote</span>
                    </div>

                    {topReward ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Trophy className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                            <span className="text-sm font-black text-foreground truncate">{topReward}</span>
                            <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest hidden sm:inline-block">Top</span>
                        </div>
                    ) : (
                        /* Fallback if no top reward, show pool? User said Base, Top. If no top, maybe just Base? Or Pool? I'll show Pool as fallback or nothing? 
                           Let's show Pool as fallback to avoid emptiness */
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Trophy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span className="text-sm font-black text-foreground truncate">{rewardPool}</span>
                        </div>
                    )}
                </div>
            );
        }

        // Post Mode
        return (
            <div className={cn("flex items-center justify-between", className)}>
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-black text-foreground truncate">{baseReward}</span>
                    <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest hidden sm:inline-block">Base</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                    <Trophy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-black text-foreground truncate">{rewardPool}</span>
                    <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest hidden sm:inline-block">Pool</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("bg-card border border-border/40 rounded-[28px] p-6 space-y-4", className)}>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.15em]">Total Reward Pool</p>
                    <p className="text-2xl font-black text-foreground tracking-tighter">{rewardPool}</p>
                </div>
            </div>

            <div className="h-px bg-border/40" />

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-foreground/60">
                            {mode === "vote" ? "Per Vote" : "Base Reward"}
                        </span>
                    </div>
                    <span className="text-sm font-black text-foreground">{baseReward}</span>
                </div>

                {topReward && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-accent" />
                            <span className="text-xs font-bold text-foreground/60">Top Prize</span>
                        </div>
                        <span className="text-sm font-black text-accent">{topReward}</span>
                    </div>
                )}

                {participationReward && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-foreground/30" />
                            <span className="text-xs font-bold text-foreground/60">Participation</span>
                        </div>
                        <span className="text-sm font-black text-foreground/60">{participationReward}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
