"use client";

import { motion } from "framer-motion";
import { TrendingUp, Trophy, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getTrendingEvents } from "@/services/mockEventService";
import type { TrendingEvent } from "@/types/api";
import ModeBadge from "@/components/events/ModeBadge";
import StatusBadge from "@/components/events/StatusBadge";
import { formatCount } from "@/lib/eventUtils";

export default function TrendingCarousel() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [trendingItems, setTrendingItems] = useState<TrendingEvent[]>([]);

    useEffect(() => {
        getTrendingEvents()
            .then((res) => setTrendingItems(res.data))
            .catch(() => {/* fail silently – carousel simply stays empty */});
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 400;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="relative">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black flex items-center gap-2 text-foreground tracking-tight">
                    <TrendingUp className="text-accent w-6 h-6" />
                    Trending Challenges
                </h2>
                <div className="flex gap-3 relative z-20">
                    <button
                        onClick={() => scroll('left')}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-secondary hover:bg-foreground hover:text-background text-foreground/40 transition-all border border-border shadow-md"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-secondary hover:bg-foreground hover:text-background text-foreground/40 transition-all border border-border shadow-md"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 md:gap-6 overflow-x-auto pb-8 -mx-4 px-4 scrollbar-hide snap-x relative z-0"
                >
                    {trendingItems.map((item) => (
                        <Link key={item.id} href={`/events/${item.id}`} className="block">
                            <motion.div
                                whileHover={{ y: -4 }}
                                className="min-w-[320px] md:min-w-[420px] snap-center rounded-[28px] bg-card overflow-hidden group cursor-pointer relative transition-all border border-border/60 shadow-lg"
                            >
                                {/* Image Section */}
                                <div className="h-44 md:h-52 relative overflow-hidden">
                                    <img
                                        src={item.coverImage}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                    />
                                    {/* Badges */}
                                    <div className="absolute top-4 left-4 flex items-center gap-2">
                                        <ModeBadge mode={item.eventType} />
                                        <StatusBadge status={item.status} />
                                    </div>
                                    <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-xl px-4 py-2 rounded-2xl flex items-center gap-2 border border-border/50 shadow-sm">
                                        <Trophy className="text-primary w-3.5 h-3.5" />
                                        <span className="text-xs font-black text-foreground">${item.leaderboardPool.toLocaleString()} Pool</span>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-6 md:p-8">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-lg md:text-xl text-foreground mb-1 tracking-tighter truncate">{item.title}</h3>
                                            <p className="text-xs md:text-sm text-foreground/40 font-bold">{item.description}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-1">Time Left</p>
                                            <p className="text-xs md:text-sm font-black text-foreground tracking-tight">{item.timeRemaining}</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between pt-5 border-t border-border/40">
                                        <div className="flex items-center gap-2 text-foreground/40">
                                            <Users className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold">{formatCount(item.totalParticipants)} joined</span>
                                        </div>
                                        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-foreground transition-colors">
                                            {item.eventType === "vote" ? "Vote Now" : "Participate"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>

                {/* Smooth Gradient Fade on Right */}
                <div className="absolute top-0 right-0 bottom-8 w-32 bg-gradient-to-l from-background via-background/20 to-transparent pointer-events-none z-10 hidden md:block" />
            </div>
        </section>
    );
}
