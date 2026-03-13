"use client";

import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Search, Sparkles, Shirt, Laptop, Wallet, Smartphone, Coffee, Gamepad, Rocket } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const sectors = [
    { label: "ALL", icon: Sparkles },
    { label: "APPAREL", icon: Shirt },
    { label: "SAAS", icon: CloudIcon },
    { label: "FINANCE", icon: Wallet },
    { label: "ELECTRONICS", icon: Smartphone },
    { label: "F&B", icon: Coffee },
    { label: "GAMING", icon: Gamepad },
    { label: "STARTUPS", icon: Rocket },
];

export default function ExploreHeader() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeSector, setActiveSector] = useState("ALL");
    const [visible, setVisible] = useState(true);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() || 0;
        if (latest > previous && latest > 150) {
            setVisible(false);
        } else {
            setVisible(true);
        }
    });

    return (
        <AnimatePresence>
            <motion.div
                variants={{
                    visible: { y: 0, opacity: 1 },
                    hidden: { y: -100, opacity: 0 }
                }}
                animate={visible ? "visible" : "hidden"}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="sticky top-0 z-[100] w-full bg-background/80 backdrop-blur-xl border-b border-white/5 pt-8 pb-4"
            >
                <div className="max-w-[1400px] mx-auto px-4 md:px-8 space-y-8">
                    {/* Title + Desc */}
                    <div className="space-y-1">
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">Discover</h1>
                        <p className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Explore events, brands and creators</p>
                    </div>

                    {/* Search & Tabs Row */}
                    <div className="flex flex-col lg:flex-row items-center gap-6">
                        {/* Search Bar */}
                        <div className="relative w-full lg:max-w-md group">
                            <div className="absolute inset-px bg-gradient-to-r from-primary/30 to-blue-600/30 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all blur-sm" />
                            <div className="relative flex items-center bg-white/[0.03] border border-white/10 group-focus-within:border-primary/40 rounded-2xl overflow-hidden transition-all">
                                <Search className="absolute left-4 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search events, brands, or creators..."
                                    className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/20 outline-none"
                                />
                            </div>
                        </div>

                        {/* Sector Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full">
                            {sectors.map((sector) => {
                                const isActive = activeSector === sector.label;
                                const Icon = sector.icon;
                                return (
                                    <button
                                        key={sector.label}
                                        onClick={() => setActiveSector(sector.label)}
                                        className={cn(
                                            "relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                            isActive
                                                ? "bg-white text-black shadow-lg shadow-white/5"
                                                : "bg-white/5 text-white/30 border border-white/5 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-white/20")} />
                                        <span>{sector.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function CloudIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.4-1.9-4.3-4.3-4.5-.3-3.1-2.9-5.5-5.7-5.5-2.5 0-4.6 1.8-5.4 4.2-2 .4-3.6 2.1-3.6 4.3 0 2.5 2 4.5 4.5 4.5" />
        </svg>
    );
}
