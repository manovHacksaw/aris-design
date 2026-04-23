"use client";

import { Search, X } from "lucide-react";
import { ArisSelect } from "@/components/ui/ArisSelect";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface HomeFilterBarProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    activeTab: string;
    setActiveTab: (val: string) => void;
    selectedCategory: string;
    setSelectedCategory: (val: string) => void;
}

export function HomeFilterBar({ searchQuery, setSearchQuery, activeTab, setActiveTab, selectedCategory, setSelectedCategory }: HomeFilterBarProps) {
    const router = useRouter();

    return (
        <div className="w-full flex flex-col gap-3">
            {/* Search Input */}
            <div className="w-full relative group bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-primary/40 focus-within:bg-white/[0.05] rounded-xl overflow-hidden transition-all flex items-center backdrop-blur-md">
                <Search className="absolute left-4 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors shrink-0 pointer-events-none" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events, brands, or creators..."
                    className="w-full bg-transparent py-3.5 sm:py-4 pl-11 pr-10 text-xs sm:text-sm font-bold text-foreground placeholder:text-foreground/30 outline-none transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 text-foreground/20 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Tabs / Filters */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <ArisSelect
                    value={activeTab.toUpperCase()}
                    onChange={(val) => {
                        const tab = val.toLowerCase();
                        if (tab !== "events") {
                            router.push(`/explore?tab=${tab}`);
                        } else {
                            setActiveTab("events");
                        }
                    }}
                    options={["EVENTS", "CONTENT"]}
                    placeholder="View"
                    minWidth="110px"
                />
                
                <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />
                
                {["ALL", "AI", "DESIGN", "MARKETING", "WEB3", "GAMING", "FASHION", "FOOD", "TECH"].map((cat) => (
                    <button
                        key={cat}
                        className={cn(
                            "px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                            cat === selectedCategory 
                                ? "bg-white text-black border-white" 
                                : "bg-white/[0.03] border-white/10 text-foreground/40 hover:text-white hover:bg-white/10"
                        )}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>
    );
}
