"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, Sparkles } from "lucide-react";

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
        <div className="relative w-full h-[400px] sm:h-[450px] lg:h-[500px] rounded-3xl overflow-hidden mb-10 group">
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
            <div className="absolute bottom-0 left-0 p-6 sm:p-10 lg:p-16 w-full max-w-4xl space-y-4">
                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">JOIN EVENTS. EARN DOLLARS.</h2>

                <motion.h1
                    key={`title-${currentIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl sm:text-4xl lg:text-6xl font-display font-black text-white leading-[1.1] uppercase drop-shadow-lg"
                >
                    {currentEvent.title}
                </motion.h1>

                <motion.div
                    key={`stats-${currentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap items-center gap-4 text-sm font-semibold text-white/80"
                >
                    <span className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                        {currentEvent.brand?.name || "Unknown Brand"}
                    </span>
                    <span className="flex items-center gap-1.5 bg-lime-400/20 text-lime-400 px-3 py-1 rounded-full backdrop-blur-md border border-lime-400/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        ${totalReward.toFixed(2)} USDC Rewards
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                        <Users className="w-3.5 h-3.5" />
                        {participants} Participants
                    </span>
                    <span className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/20 uppercase tracking-wider text-[10px]">
                        {domains.join(", ")}
                    </span>
                </motion.div>

                <motion.div
                    key={`actions-${currentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="pt-4 flex gap-4"
                >
                    <a href={`/events/${currentEvent.id}`} className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all text-sm shadow-xl shadow-primary/20">
                        Participate <ChevronRight className="w-4 h-4" />
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
