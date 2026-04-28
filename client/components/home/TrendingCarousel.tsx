"use client";

import { motion } from "framer-motion";
import { TrendingUp, Trophy, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import ModeBadge from "@/components/events/ModeBadge";
import StatusBadge from "@/components/events/StatusBadge";
import { formatCount } from "@/lib/eventUtils";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function computeTimeRemaining(endTime: string): string {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h left`;
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
}

// Map real Event to the shape TrendingCarousel needs for rendering
type CarouselItem = {
    id: string;
    title: string;
    description: string;
    eventType: "vote" | "post";
    status: "live" | "ending_soon";
    leaderboardPool: number;
    timeRemaining: string;
    totalParticipants: number;
    coverImage: string;
    brand: { name: string; avatar: string; handle: string };
};

function toCarouselItem(e: Event): CarouselItem {
    const statusMap: Record<string, "live" | "ending_soon"> = {
        posting: "live",
        voting: "live",
        scheduled: "live",
        draft: "live",
        completed: "ending_soon",
    };
    return {
        id: e.id,
        title: e.title,
        description: e.description ?? "",
        eventType: e.eventType === "vote_only" ? "vote" : "post",
        status: statusMap[e.status] ?? "live",
        leaderboardPool: e.leaderboardPool ?? 0,
        timeRemaining: computeTimeRemaining(e.endTime),
        totalParticipants: e._count?.submissions ?? e._count?.votes ?? e.eventAnalytics?.uniqueParticipants ?? 0,
        coverImage: e.imageUrl || (e.imageCid ? `${PINATA_GW}/${e.imageCid}` : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"),
        brand: {
            name: e.brand?.name ?? "Unknown",
            avatar: e.brand?.logoUrl || (e.brand?.logoCid ? `${PINATA_GW}/${e.brand.logoCid}` : ""),
            handle: `@${(e.brand?.name ?? "").toLowerCase().replace(/\s+/g, "")}`,
        },
    };
}

export default function TrendingCarousel() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [trendingItems, setTrendingItems] = useState<CarouselItem[]>([]);

    useEffect(() => {
        getEvents({ limit: 10 })
            .then((res) => setTrendingItems((res.events || []).map(toCarouselItem)))
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
                <h2 className="text-2xl font-display flex items-center gap-2.5 text-foreground">
                    <TrendingUp className="text-primary w-5 h-5" />
                    Trending Challenges
                </h2>
                <div className="flex gap-2 relative z-20">
                    <button
                        onClick={() => scroll('left')}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-card hover:bg-primary hover:text-white text-foreground/40 transition-all border border-border shadow-soft hover:border-primary"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-card hover:bg-primary hover:text-white text-foreground/40 transition-all border border-border shadow-soft hover:border-primary"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollContainerRef}
                    className="flex gap-5 md:gap-6 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide snap-x relative z-0"
                >
                    {trendingItems.map((item) => (
                        <Link key={item.id} href={`/events/${item.id}`} className="block">
                            <motion.div
                                whileHover={{ y: -8, scale: 1.02 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="min-w-[230px] md:min-w-[270px] snap-center rounded-3xl bg-card overflow-hidden group cursor-pointer relative transition-all shadow-card hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.15)]"
                            >
                                {/* Portrait image */}
                                <div className="relative w-full aspect-[3/4] overflow-hidden">
                                    <img
                                        src={item.coverImage}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 dark:from-black/60 via-transparent to-transparent" />

                                    {/* Pool badge top right */}
                                    <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20">
                                        <Trophy className="w-3 h-3 text-yellow-300 fill-yellow-300/30" />
                                        <span className="text-[9px] font-semibold text-white">${item.leaderboardPool.toLocaleString()}</span>
                                    </div>

                                    {/* Bottom text overlay */}
                                    <div className="absolute inset-x-0 bottom-0 p-4">
                                        <h3 className="font-semibold text-base text-white leading-snug line-clamp-2 mb-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-[11px] text-white/50">{item.brand.name}</p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between px-4 py-3.5">
                                    <div className="flex items-center gap-1.5 text-foreground/40">
                                        <Users className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-medium">{formatCount(item.totalParticipants)}</span>
                                    </div>
                                    <button className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all">
                                        {item.eventType === "vote" ? "Vote" : "Join"}
                                    </button>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>

                {/* Gradient fade right */}
                <div className="absolute top-0 right-0 bottom-6 w-16 md:w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
            </div>
        </section>
    );
}
