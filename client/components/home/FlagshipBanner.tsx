"use client";

import { motion } from "framer-motion";
import { Trophy, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

interface FlagshipBannerProps {
    event?: {
        id: string;
        title: string;
        reward: string;
        brandName: string;
        brandLogo: string;
        imageUrl: string;
    };
}

export default function FlagshipBanner({ event }: FlagshipBannerProps) {
    const activeEvent = event || {
        id: "aris-flagship",
        title: "Aris Creator Genesis Challenge",
        reward: "$10,000",
        brandName: "ARIS",
        brandLogo: "/aris-logo.png",
        imageUrl: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full rounded-[28px] overflow-hidden group border border-white/8 shadow-2xl"
            style={{ height: 280 }}
        >
            {/* Background Image */}
            <div className="absolute inset-0">
                <img
                    src={activeEvent.imageUrl}
                    className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.04]"
                    alt="Flagship Event"
                />
                {/* Dark gradient layers */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* Ambient blue glow in corner */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

            {/* Content */}
            <div className="relative h-full flex items-center px-8 md:px-12 z-10">
                <div className="max-w-lg space-y-5">

                    {/* Featured Label */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_2px_rgba(96,165,250,0.6)] animate-pulse" />
                        <span className="text-[10px] font-black text-white/50 tracking-[0.25em] uppercase">
                            Featured Flagship
                        </span>
                        <div className="h-px flex-1 bg-white/10 max-w-[60px]" />
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-[0.95] uppercase font-display">
                        {activeEvent.title}
                    </h2>

                    {/* Reward Display — VERY PROMINENT */}
                    <div className="flex items-end gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                                Total Prize Pool
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span
                                    className="text-4xl md:text-5xl font-black tracking-tighter leading-none"
                                    style={{
                                        color: "#B6FF60",
                                        textShadow: "0 0 30px rgba(182,255,96,0.5), 0 0 60px rgba(182,255,96,0.25)"
                                    }}
                                >
                                    {activeEvent.reward}
                                </span>
                                <span className="text-sm font-black text-white/30 uppercase tracking-wider">USD</span>
                            </div>
                        </div>

                        {/* Host badge */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/8 backdrop-blur-md rounded-xl border border-white/10 mb-1">
                            <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                    <path d="M12 4L4 18H20L12 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="text-[11px] font-black text-white/60 tracking-wider uppercase">
                                {activeEvent.brandName}
                            </span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <Link href={`/events/${activeEvent.id}`}>
                        <button className="group/btn relative flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] overflow-hidden transition-all duration-200 active:scale-95 mt-2">
                            {/* Button bg */}
                            <div className="absolute inset-0 bg-white" />
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />

                            {/* Glow */}
                            <div className="absolute inset-0 shadow-[0_0_30px_-4px_rgba(59,130,246,0)] group-hover/btn:shadow-[0_0_30px_-4px_rgba(59,130,246,0.6)] transition-shadow duration-300 rounded-2xl pointer-events-none" />

                            <Zap className="w-3.5 h-3.5 text-black group-hover/btn:text-white relative z-10 transition-colors duration-300 fill-black group-hover/btn:fill-white" />
                            <span className="relative z-10 text-black group-hover/btn:text-white transition-colors duration-300">
                                Join Event
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-black group-hover/btn:text-white relative z-10 transition-all duration-300 group-hover/btn:translate-x-0.5" />
                        </button>
                    </Link>
                </div>
            </div>

            {/* Watermark */}
            <div className="absolute right-10 bottom-8 opacity-[0.04] pointer-events-none select-none">
                <h1 className="text-[100px] font-black tracking-tighter leading-none font-display">ARIS</h1>
            </div>

            {/* Hover border glow */}
            <div className="absolute inset-0 rounded-[28px] border border-blue-500/0 group-hover:border-blue-500/20 transition-colors duration-500 pointer-events-none" />
        </motion.div>
    );
}
