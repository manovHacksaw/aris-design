"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, Sparkle, Award, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface BannerEvent {
    id: string;
    title: string;
    imageCid?: string;
    imageUrl?: string;
    brand?: { name: string; categories: string[] };
    category?: string;
    topReward?: number;
    baseReward?: number;
    leaderboardPool?: number;
    _count?: { submissions: number; votes: number };
}

export default function DynamicBanner({ events }: { events: BannerEvent[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!events || events.length === 0) return;
        
        const duration = 6000; // 6 seconds per slide
        const interval = 100; // update progress every 100ms
        const increment = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    setCurrentIndex((curr) => (curr + 1) % events.length);
                    return 0;
                }
                return prev + increment;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [events, currentIndex]);

    if (!events || events.length === 0) return null;

    const currentEvent = events[currentIndex];
    const image = currentEvent.imageUrl || (currentEvent.imageCid ? `${PINATA_GW}/${currentEvent.imageCid}` : "");
    const totalReward = (currentEvent.topReward || 0) + (currentEvent.baseReward || 0) + (currentEvent.leaderboardPool || 0);
    const participants = (currentEvent._count?.submissions || 0) + (currentEvent._count?.votes || 0);

    return (
        <div className="relative w-full h-[450px] sm:h-[500px] lg:h-[550px] rounded-2xl overflow-hidden mb-12 group bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* Background Image Carousel */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                >
                    {image ? (
                        <div className="relative w-full h-full">
                            <img src={image} alt={currentEvent.title} className="w-full h-full object-cover brightness-[0.7] transform transition-transform duration-10000 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-primary/5" />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#252525]" />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Premium Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/10 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-14 lg:p-20 z-10">
                <div className="max-w-4xl space-y-8">
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3"
                        >
                            <div className="h-px w-8 bg-primary/40" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] drop-shadow-[0_0_10px_rgba(163,230,53,0.3)]">
                                Featured Opportunity
                            </span>
                        </motion.div>

                        <motion.h1
                            key={`title-${currentIndex}`}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="text-5xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.9] uppercase tracking-tighter"
                        >
                            {currentEvent.title.split(' ').map((word, i) => (
                                <span key={i} className={i % 2 === 1 ? "text-primary/90 italic" : "text-white"}>
                                    {word}{' '}
                                </span>
                            ))}
                        </motion.h1>
                    </div>

                    <motion.div
                        key={`stats-${currentIndex}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap items-center gap-4"
                    >
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#a3e635]" />
                            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">
                                {currentEvent.brand?.name || "Global"}
                            </span>
                        </div>

                        <div className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full flex items-center gap-2.5 shadow-[0_10px_20px_rgba(132,225,28,0.2)]">
                            <Award className="w-4 h-4 fill-current opacity-40" />
                            <span className="text-[11px] font-black uppercase tracking-tight">
                                ${totalReward.toLocaleString()} Pool
                            </span>
                        </div>

                        <div className="bg-black/20 backdrop-blur-2xl border border-white/15 px-5 py-2.5 rounded-full flex items-center gap-3">
                            <Users className="w-4 h-4 text-white/60" />
                            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">
                                {participants.toLocaleString()} Active
                            </span>
                        </div>
                    </motion.div>

                    <motion.div
                        key={`actions-${currentIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="pt-4"
                    >
                        <a 
                            href={`/events/${currentEvent.id}`} 
                            className="group/btn relative inline-flex items-center gap-4 bg-white text-black px-12 py-5 rounded-full font-black uppercase tracking-[0.2em] hover:scale-105 transition-all duration-500 overflow-hidden"
                        >
                            <span className="relative z-10 text-[11px]">Secure your spot</span>
                            <ChevronRight className="relative z-10 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-primary translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500" />
                        </a>
                    </motion.div>
                </div>
            </div>

            {/* Progressive Pagination */}
            <div className="absolute bottom-8 right-8 lg:bottom-16 lg:right-20 flex items-center gap-5 z-20">
                {events.slice(0, 5).map((_item, i) => (
                    <button
                        key={i}
                        onClick={() => { setCurrentIndex(i); setProgress(0); }}
                        className="group flex flex-col gap-2 cursor-pointer"
                    >
                        <div className="h-1 w-12 sm:w-16 bg-white/10 rounded-full overflow-hidden relative">
                            {i === currentIndex && (
                                <motion.div 
                                    className="absolute inset-0 bg-primary origin-left"
                                    style={{ width: `${progress}%` }}
                                />
                            )}
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest transition-colors",
                            i === currentIndex ? "text-primary" : "text-white/20 group-hover:text-white/40"
                        )}>
                            0{i + 1}
                        </span>
                    </button>
                ))}
            </div>

            {/* Decorative Side Label */}
            <div className="absolute top-1/2 -right-8 -rotate-90 origin-center hidden xl:block">
                <span className="text-[9px] font-black text-white/10 uppercase tracking-[1em] whitespace-nowrap">
                    ARIS PERFORMANCE DISCOVERY SYSTEM // 2026
                </span>
            </div>
        </div>
    );
}
