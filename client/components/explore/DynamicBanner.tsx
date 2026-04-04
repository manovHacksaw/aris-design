"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, Sparkle, Award, Sparkles } from "lucide-react";

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

    useEffect(() => {
        if (!events || events.length === 0) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % events.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [events]);

    if (!events || events.length === 0) return null;

    const currentEvent = events[currentIndex];
    const image = currentEvent.imageUrl || (currentEvent.imageCid ? `${PINATA_GW}/${currentEvent.imageCid}` : "");
    const totalReward = (currentEvent.topReward || 0) + (currentEvent.baseReward || 0) + (currentEvent.leaderboardPool || 0);
    const participants = (currentEvent._count?.submissions || 0) + (currentEvent._count?.votes || 0);
    const domains = currentEvent.brand?.categories || ["OTHER"];

    return (
        <div className="relative w-full h-[400px] sm:h-[450px] lg:h-[500px] rounded-none md:rounded-2xl overflow-hidden mb-10 group shadow-2xl">
            {/* Background Image Carousel */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                >
                    {image ? (
                        <img src={image} alt={currentEvent.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-blue-900/40" />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Gradient Overlays for Netflix style */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 p-8 sm:p-12 lg:p-20 w-full max-w-5xl space-y-6">
                <div className="flex flex-col gap-2">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md"
                    >
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">JOIN EVENTS. EARN DOLLARS.</span>
                    </motion.div>

                    <motion.h1
                        key={`title-${currentIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl sm:text-6xl lg:text-8xl font-display font-black text-white leading-[0.95] uppercase drop-shadow-2xl italic tracking-tighter"
                    >
                        {currentEvent.title}
                    </motion.h1>
                </div>

                <motion.div
                    key={`stats-${currentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap items-center gap-3 text-xs font-bold text-white/90"
                >
                    <div className="bg-white/5 px-4 py-2 rounded-xl backdrop-blur-xl border border-white/10 flex items-center gap-2 group-hover:bg-white/10 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        {currentEvent.brand?.name || "Unknown Brand"}
                    </div>

                    <div className="flex items-center gap-2 bg-lime-400/10 text-lime-400 px-4 py-2 rounded-xl backdrop-blur-xl border border-lime-400/20 shadow-[0_0_20px_rgba(163,230,53,0.1)]">
                        <Award className="w-4 h-4" />
                        <span className="tracking-tight">${totalReward.toLocaleString()} Rewards</span>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl backdrop-blur-xl border border-white/10">
                        <Users className="w-4 h-4 text-white/60" />
                        {participants.toLocaleString()}
                    </div>
                </motion.div>

                <motion.div
                    key={`actions-${currentIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pt-6 flex items-center gap-6"
                >
                    <a href={`/events/${currentEvent.id}`} className="group/btn relative flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all overflow-hidden shadow-2xl shadow-white/10">
                        <span className="relative z-10 text-sm">Join Event</span>
                        <ChevronRight className="relative z-10 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 bg-primary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                    </a>
                </motion.div>
            </div>

            {/* Pagination Indicators */}
            <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 flex gap-2">
                {events.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`transition-all rounded-full h-1.5 ${i === currentIndex ? "bg-white w-6" : "bg-white/30 w-1.5 hover:bg-white/50"}`}
                    />
                ))}
            </div>
        </div>
    );
}
