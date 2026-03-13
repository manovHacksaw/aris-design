"use client";

import { motion } from "framer-motion";
import { Search, Sparkles, Trophy, Palette, PenLine, Video, Building2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const categories = [
    { label: "ALL", icon: Sparkles },
    { label: "ARTISTS", icon: Palette },
    { label: "DESIGNERS", icon: PenLine },
    { label: "CREATORS", icon: Video },
    { label: "BRANDS", icon: Building2 },
    { label: "STARTUPS", icon: Rocket },
];

export default function HomeHeader() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("ALL");

    return (
        <div className="space-y-6 mb-8">
            {/* Title + Subheading */}
            <div className="space-y-3">
                <motion.h1
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="text-6xl md:text-8xl font-black tracking-tighter uppercase font-display leading-none"
                    style={{
                        background: "linear-gradient(135deg, #fff 60%, rgba(255,255,255,0.45) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 0 32px rgba(59,130,246,0.25))",
                    }}
                >
                    Home
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.35 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5"
                >
                    <p className="text-sm md:text-base font-bold text-white/35 tracking-wide">
                        Participate in Events and Earn Dollars
                    </p>

                    <div className="flex items-center gap-2.5">
                        {/* Base Reward Badge */}
                        <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full overflow-hidden group cursor-default">
                            <div className="absolute inset-0 bg-yellow-400/[0.06] border border-yellow-400/20 rounded-full" />
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                            <Sparkles className="w-3 h-3 text-yellow-400 relative z-10 fill-yellow-400/30" />
                            <span className="text-[10px] font-black uppercase text-yellow-400 tracking-[0.18em] relative z-10">
                                Base Reward
                            </span>
                        </div>

                        {/* Top Prize Badge */}
                        <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full overflow-hidden group cursor-default">
                            <div className="absolute inset-0 bg-blue-500/[0.06] border border-blue-500/25 rounded-full" />
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                            <Trophy className="w-3 h-3 text-blue-400 relative z-10 fill-blue-400/20" />
                            <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.18em] relative z-10">
                                Top Prize
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Search Bar */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
                className="relative group max-w-3xl"
            >
                {/* Ambient glow on focus */}
                <div className="absolute -inset-px bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-blue-500/30 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm pointer-events-none" />

                {/* Inner container */}
                <div className="relative flex items-center bg-white/[0.03] border border-white/8 group-focus-within:border-blue-500/35 rounded-2xl transition-all duration-300">
                    <Search className="absolute left-5 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors duration-300 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search events, brands, or categories..."
                        className="w-full bg-transparent py-4 pl-12 pr-6 text-sm font-medium text-white placeholder:text-white/20 outline-none"
                    />
                </div>
            </motion.div>

            {/* Category Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
            >
                {categories.map((cat) => {
                    const isActive = activeCategory === cat.label;
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.label}
                            onClick={() => setActiveCategory(cat.label)}
                            className={cn(
                                "relative flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black whitespace-nowrap uppercase tracking-wider transition-all duration-200 overflow-hidden",
                                isActive
                                    ? "text-white shadow-lg shadow-blue-500/25"
                                    : "bg-white/[0.03] border border-white/8 text-white/35 hover:border-white/15 hover:text-white/60"
                            )}
                        >
                            {isActive && (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
                                    <div className="absolute inset-0 opacity-40 bg-gradient-to-b from-white/20 to-transparent" />
                                </>
                            )}
                            <Icon className={cn("w-3 h-3 relative z-10", isActive ? "text-white/90" : "text-white/30")} />
                            <span className="relative z-10">{cat.label}</span>
                        </button>
                    );
                })}
            </motion.div>
        </div>
    );
}
