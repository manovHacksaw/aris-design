"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Search, Sparkles, Shirt, Wallet, Smartphone, Coffee, Gamepad, Rocket, Laptop } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const sectors = [
    { label: "ALL", icon: Sparkles },
    { label: "APPAREL", icon: Shirt },
    { label: "SAAS", icon: Laptop },
    { label: "FINANCE", icon: Wallet },
    { label: "ELECTRONICS", icon: Smartphone },
    { label: "F&B", icon: Coffee },
    { label: "GAMING", icon: Gamepad },
    { label: "STARTUPS", icon: Rocket },
];

interface ExploreHeaderProps {
    activeSector: string;
    onSectorChange: (s: string) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

export default function ExploreHeader({ activeSector, onSectorChange, searchQuery, onSearchChange }: ExploreHeaderProps) {
    const [visible, setVisible] = useState(true);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() || 0;
        if (latest > previous && latest > 120) {
            setVisible(false);
        } else {
            setVisible(true);
        }
    });

    return (
        <motion.div
            variants={{
                visible: { y: 0, opacity: 1 },
                hidden: { y: -110, opacity: 0 }
            }}
            animate={visible ? "visible" : "hidden"}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="sticky top-0 z-[100] w-full bg-background/85 backdrop-blur-2xl border-b border-white/5 pt-8 pb-5 space-y-6"
        >
            {/* Title + Search Row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
                <div className="shrink-0">
                    <h1 className="font-display text-[3.5rem] sm:text-[5rem] leading-[0.88] tracking-tight text-white uppercase">Discover</h1>
                    <p className="mt-1 text-[10px] font-black text-white/25 uppercase tracking-[0.25em]">Explore events, brands and creators</p>
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 max-w-xl group">
                    <div className="absolute inset-px bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all blur-sm" />
                    <div className="relative flex items-center bg-white/[0.04] border border-white/8 group-focus-within:border-primary/40 rounded-2xl overflow-hidden transition-all">
                        <Search className="absolute left-4 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search events, brands, or creators..."
                            className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/20 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Sector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {sectors.map((sector) => {
                    const isActive = activeSector === sector.label;
                    const Icon = sector.icon;
                    return (
                        <button
                            key={sector.label}
                            onClick={() => onSectorChange(sector.label)}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
                                isActive
                                    ? "bg-white text-black shadow-lg"
                                    : "bg-white/5 text-white/30 border border-white/8 hover:bg-white/10 hover:text-white/70"
                            )}
                        >
                            <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "")} />
                            {sector.label}
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
}
