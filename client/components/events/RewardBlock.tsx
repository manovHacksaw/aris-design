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
        return (
            <div className={cn("flex items-center justify-between", className)}>
                <div className="flex items-center gap-1.5 min-w-0">
                    <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-black text-foreground truncate">{baseReward}</span>
                    <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest hidden sm:inline-block">Base Pool</span>
                </div>

                {topReward ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                        <span className="text-sm font-black text-foreground truncate">{topReward}</span>
                        <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest hidden sm:inline-block">Top Pool</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Trophy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm font-black text-foreground truncate">{rewardPool}</span>
                        <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest hidden sm:inline-block">Top Pool</span>
                    </div>
                )}
            </div>
        );
    }

    // Full variant — two prominent blocks + breakdown
    return (
        <div className={cn("bg-card border border-border/40 rounded-[28px] p-6 space-y-4", className)}>
            {/* Two pool blocks side-by-side */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/8 border border-primary/20 rounded-[16px] p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-black text-primary/70 uppercase tracking-[0.12em]">Base Pool</span>
                    </div>
                    <p className="text-xl font-black text-foreground tracking-tight">{baseReward}</p>
                    <p className="text-[10px] text-foreground/40 font-medium">
                        {mode === "vote" ? "Guaranteed per vote" : "Per submission"}
                    </p>
                </div>

                <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-[16px] p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-[10px] font-black text-yellow-400/70 uppercase tracking-[0.12em]">Top Pool</span>
                    </div>
                    <p className="text-xl font-black text-foreground tracking-tight">
                        {topReward || rewardPool}
                    </p>
                    <p className="text-[10px] text-foreground/40 font-medium">For voters of #1 content</p>
                </div>
            </div>

            <div className="h-px bg-border/40" />

            {/* Breakdown */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-foreground/60">
                            {mode === "vote" ? "Base Pool — Per Vote" : "Base Reward"}
                        </span>
                    </div>
                    <span className="text-sm font-black text-foreground">{baseReward}</span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-xs font-bold text-foreground/60">Top Pool — Voters of #1</span>
                    </div>
                    <span className="text-sm font-black text-yellow-400">{topReward || rewardPool}</span>
                </div>

                {participationReward && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-foreground/30" />
                            <span className="text-xs font-bold text-foreground/60">Participation Bonus</span>
                        </div>
                        <span className="text-sm font-black text-foreground/60">{participationReward}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
