"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const timeTabs = ["Daily", "Weekly", "Monthly", "All-time"];

export default function LeaderboardFilters() {
    const [activeTime, setActiveTime] = useState("Weekly");

    return (
        <div className="flex items-center justify-end">
            <div className="flex bg-secondary/30 backdrop-blur-md border border-border/40 rounded-lg p-1 shadow-sm">
                {timeTabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTime(tab)}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                            activeTime === tab
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground/40 hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
}
