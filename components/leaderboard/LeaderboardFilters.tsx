"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const categoryTabs = ["Creators", "Brands", "Voters"];
const timeTabs = ["Daily", "Weekly", "All-time"];

export default function LeaderboardFilters() {
    const [activeCategory, setActiveCategory] = useState("Creators");
    const [activeTime, setActiveTime] = useState("Weekly");

    return (
        <div className="space-y-4">
            {/* Category + Time Filters in one row */}
            <div className="flex flex-wrap items-center gap-6">
                {/* Category Tabs */}
                <div className="flex bg-secondary/30 backdrop-blur-md border border-border/40 rounded-full p-1.5 shadow-sm">
                    {categoryTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveCategory(tab)}
                            className={cn(
                                "px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300",
                                activeCategory === tab
                                    ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                                    : "text-foreground/40 hover:text-foreground hover:bg-foreground/5"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Time Period Tabs */}
                <div className="flex bg-secondary/30 backdrop-blur-md border border-border/40 rounded-full p-1.5 shadow-sm">
                    {timeTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTime(tab)}
                            className={cn(
                                "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300",
                                activeTime === tab
                                    ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                                    : "text-foreground/40 hover:text-foreground hover:bg-foreground/5"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
