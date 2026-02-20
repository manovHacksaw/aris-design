"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Zap, Radio, Sparkles, Trophy, Flame, Clock, ThumbsUp, PenTool } from "lucide-react";

export default function FilterChips() {
    const filters = [
        { label: "Movers", icon: Zap },
        { label: "Live", icon: Radio },
        { label: "Vote", icon: ThumbsUp },
        { label: "Post", icon: PenTool },
        { label: "New", icon: Sparkles },
        { label: "Highest Reward", icon: Trophy },
        { label: "Most Voted", icon: Flame },
        { label: "Ending Soon", icon: Clock },
    ];

    const [activeFilter, setActiveFilter] = useState("Movers");

    return (
        <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {filters.map((filter) => {
                    const Icon = filter.icon;
                    const isActive = activeFilter === filter.label;

                    return (
                        <button
                            key={filter.label}
                            onClick={() => setActiveFilter(filter.label)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                                isActive
                                    ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                                    : "bg-secondary text-foreground/70 hover:bg-secondary/80 hover:text-foreground hover:scale-105"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "fill-current" : "")} />
                            {filter.label}
                        </button>
                    );
                })}
            </div>
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background via-background/50 to-transparent pointer-events-none" />
        </div>
    );
}
