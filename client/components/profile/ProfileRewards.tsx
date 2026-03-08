"use client";

import { Award, TrendingUp, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RewardItem {
    id: number;
    type: string;
    amount: string;
    campaign: string;
    date: string;
    status: "confirmed" | "pending" | "claimed";
    icon: "award" | "trophy" | "zap";
}

const iconMap = {
    award: Award,
    trophy: Trophy,
    zap: Zap,
};

const statusConfig = {
    confirmed: { label: "Confirmed", className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/10" },
    pending: { label: "Pending", className: "text-amber-400 bg-amber-400/10 border-amber-400/10" },
    claimed: { label: "Claimed", className: "text-primary bg-primary/10 border-primary/10" },
};

export default function ProfileRewards() {
    const rewards: RewardItem[] = [
        { id: 1, type: "Trend Setter", amount: "$25.00", campaign: "Summer Vibes", date: "Mar 10, 2024", status: "confirmed", icon: "award" },
        { id: 2, type: "Top Voter", amount: "$15.50", campaign: "Daily Streak", date: "Mar 08, 2024", status: "claimed", icon: "zap" },
        { id: 3, type: "Early Adopter", amount: "$100.00", campaign: "Genesis Launch", date: "Feb 23, 2024", status: "confirmed", icon: "trophy" },
        { id: 4, type: "Community Pick", amount: "$40.00", campaign: "Nike Air Max", date: "Feb 15, 2024", status: "pending", icon: "award" },
    ];

    // Total earnings summary
    const totalEarned = rewards.reduce((sum, r) => sum + parseFloat(r.amount.replace("$", "")), 0);

    return (
        <div className="space-y-6">
            {/* Summary card */}
            <div className="bg-card border border-border/40 rounded-[22px] p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest mb-1">Total Rewards</p>
                    <p className="text-3xl font-black text-foreground tracking-tighter">${totalEarned.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
                    <TrendingUp className="w-4 h-4" />
                    +12% this month
                </div>
            </div>

            {/* Rewards list */}
            <div className="space-y-3">
                {rewards.map((reward) => {
                    const Icon = iconMap[reward.icon];
                    const status = statusConfig[reward.status];

                    return (
                        <div
                            key={reward.id}
                            className="bg-card border border-border/40 rounded-[18px] p-5 flex items-center gap-4 hover:border-primary/20 transition-all group cursor-pointer"
                        >
                            {/* Icon */}
                            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10 group-hover:scale-105 transition-transform">
                                <Icon className="w-5 h-5" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{reward.type}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-foreground/40 font-bold">{reward.campaign}</span>
                                    <span className="text-foreground/20">·</span>
                                    <span className="text-[10px] text-foreground/30 font-bold">{reward.date}</span>
                                </div>
                            </div>

                            {/* Amount + Status */}
                            <div className="shrink-0 text-right">
                                <p className="text-lg font-black text-foreground tracking-tighter mb-1">{reward.amount}</p>
                                <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border", status.className)}>
                                    {status.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
