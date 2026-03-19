"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Zap, Radio, Sparkles, Trophy, Flame, Clock, ThumbsUp, PenTool } from "lucide-react";

const filters = [
    { label: "Movers",         icon: Zap,      activeClass: "bg-orange-500/20 border-orange-500/40 text-orange-400" },
    { label: "Live",           icon: Radio,    activeClass: "bg-lime-400/20 border-lime-400/40 text-lime-400" },
    { label: "Vote",           icon: ThumbsUp, activeClass: "bg-blue-500/20 border-blue-500/40 text-blue-400" },
    { label: "Post",           icon: PenTool,  activeClass: "bg-purple-500/20 border-purple-500/40 text-purple-400" },
    { label: "New",            icon: Sparkles, activeClass: "bg-primary/20 border-primary/40 text-primary" },
    { label: "Highest Reward", icon: Trophy,   activeClass: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" },
    { label: "Most Voted",     icon: Flame,    activeClass: "bg-red-500/20 border-red-500/40 text-red-400" },
    { label: "Ending Soon",    icon: Clock,    activeClass: "bg-amber-500/20 border-amber-500/40 text-amber-400" },
];

export default function FilterChips() {
    const [activeFilter, setActiveFilter] = useState("Movers");

    return (
        <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {filters.map((filter) => {
                    const Icon = filter.icon;
                    const isActive = activeFilter === filter.label;

                    return (
                        <button
                            key={filter.label}
                            onClick={() => setActiveFilter(filter.label)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black whitespace-nowrap transition-all border",
                                isActive
                                    ? `${filter.activeClass} shadow-sm`
                                    : "bg-transparent border-border text-foreground/40 hover:text-foreground/70 hover:border-border/80"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {filter.label}
                        </button>
                    );
                })}
            </div>
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background via-background/50 to-transparent pointer-events-none" />
        </div>
    );
}
