"use client";

import Link from "next/link";
import { Users, Clock, Eye, MousePointer2, Sparkles } from "lucide-react";
import { formatCount, calculateTotalPool, formatTimeRemaining } from "@/lib/eventUtils";
import { cn } from "@/lib/utils";

interface PremiumEvent {
    id: string;
    title: string;
    image?: string;
    imageUrl?: string;
    imageCid?: string;
    status: string;
    eventType: string;
    category?: string;
    baseReward?: number;
    topReward?: number;
    leaderboardPool?: number;
    capacity?: number;
    endTime?: string | Date;
    participationCount?: number;
    _count?: { submissions: number; votes: number };
    brand?: { id?: string; name: string; logoUrl?: string; logoCid?: string } | null;
    eventAnalytics?: { totalViews: number };
}

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface PremiumEventCardProps {
    event: PremiumEvent | any;
    className?: string;
}

export default function PremiumEventCard({ event, className }: PremiumEventCardProps) {
    const brand = event.brand || { name: "Unknown" };
    const logoSrc = brand.logoUrl || (brand.logoCid ? `${PINATA_GW}/${brand.logoCid}` : null);
    const totalReward = calculateTotalPool(event);

    const displayImage = event.image || event.imageUrl || (event.imageCid ? `${PINATA_GW}/${event.imageCid}` : "");
    const rawPCount = event.participationCount ?? (
        event.eventType === "vote_only"
            ? (event._count?.votes || 0)
            : ((event._count?.submissions || 0) + (event._count?.votes || 0))
    );

    // Human-readable brand name for URL
    const brandPath = brand.name ? `/brand/${encodeURIComponent(brand.name)}` : "#";

    return (
        <div className={cn("relative block group w-full outline-none", className)}>
            {/* Primary Event Link acting as a clickable overlay */}
            <Link
                href={`/events/${event.id}`}
                className="absolute inset-0 z-10 w-full h-full rounded-2xl focus:outline-none"
                aria-label={`View ${event.title}`}
            />

            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#111] border border-white/5 transition-all duration-500 ease-out group-hover:border-white/20 group-hover:-translate-y-2 group-hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] active:scale-[0.98] cursor-pointer">

                {/* Background Image Area */}
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={event.title}
                            className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />
                    )}
                </div>

                {/* Gradients for text readability */}
                <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-black/80 via-black/40 to-transparent opacity-90 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent opacity-95 pointer-events-none" />

                {/* Content Layout */}
                <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">

                    {/* Top Section: Brand (Always visible) */}
                    <div className="flex justify-between items-start">
                        <Link
                            href={brandPath}
                            onClick={(e) => e.stopPropagation()}
                            className="relative z-20 pointer-events-auto flex items-center gap-2 w-fit transition-colors group/brand"
                        >
                            <div className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/10 group-hover/brand:border-white/30 transition-colors">
                                {logoSrc ? (
                                    <img src={logoSrc} alt={brand.name} className="w-full h-full object-cover group-hover/brand:opacity-90" />
                                ) : (
                                    <span className="text-[10px] font-bold text-white/70 group-hover/brand:text-white">
                                        {(brand.name ?? "?")[0]}
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] font-bold text-white/90 group-hover/brand:text-white tracking-widest uppercase line-clamp-1 drop-shadow-sm transition-colors">
                                {brand.name || "Unknown"}
                            </span>
                        </Link>
                    </div>

                    {/* Bottom Section: Category, Title, Footer Stats */}
                    <div className="flex flex-col gap-4 pointer-events-none">

                        {/* Category & Title */}
                        <div className="flex flex-col gap-2">
                            {event.category && (
                                <div className="w-fit px-2 py-1 rounded-md bg-white/5 border border-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-[9px] font-bold text-white/60 tracking-[0.15em] uppercase leading-none">
                                        {event.category}
                                    </span>
                                </div>
                            )}

                            <h3 className="text-2xl sm:text-[26px] font-bold text-white leading-tight line-clamp-2">
                                {event.title}
                            </h3>
                        </div>

                        {/* Footer Stats Row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-white/10">
                            {/* Task Type */}
                            <div className="flex items-center gap-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                {event.eventType === "vote_only" || event.status === "voting" ? (
                                    <>
                                        <MousePointer2 className="w-[13px] h-[13px] text-white/90" />
                                        <span className="text-[10px] font-bold text-white/90 tracking-widest uppercase whitespace-nowrap">
                                            Vote
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-[13px] h-[13px] text-white/90" />
                                        <span className="text-[10px] font-bold text-white/90 tracking-widest uppercase whitespace-nowrap">
                                            Create
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Participants */}
                            <div className="flex items-center gap-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <Users className="w-[13px] h-[13px] text-white/90" />
                                <span className="text-[10px] font-bold text-white/90 tracking-widest uppercase whitespace-nowrap">
                                    {formatCount(rawPCount)}
                                </span>
                            </div>

                            {/* Views */}
                            <div className="flex items-center gap-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <Eye className="w-[13px] h-[13px] text-white/90" />
                                <span className="text-[10px] font-bold text-white/90 tracking-widest uppercase whitespace-nowrap">
                                    {formatCount(event.eventAnalytics?.totalViews || 0)}
                                </span>
                            </div>

                            {/* Countdown */}
                            <div className="flex items-center gap-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <Clock className="w-[13px] h-[13px] text-[#FF8C00]" />
                                <span className="text-[10px] font-bold text-white/90 tracking-widest uppercase whitespace-nowrap">
                                    {formatTimeRemaining(event.endTime)}
                                </span>
                            </div>

                            {/* Reward (Lucrative Highlighting) */}
                            {totalReward > 0 && (
                                <div className="flex items-center gap-1 ml-auto transition-transform group-hover:scale-105">
                                    <span className="text-[12px] font-black text-[#D9FF00] tracking-tighter drop-shadow-[0_0_12px_rgba(217,255,0,0.5)]">
                                        ${totalReward.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export function PremiumEventCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#111] animate-pulse border border-white/5", className)}>
            <div className="absolute inset-0 bg-white/5" />
            <div className="absolute bottom-0 left-0 w-full p-5 space-y-4">
                <div className="h-4 bg-white/10 rounded w-1/4" />
                <div className="h-8 bg-white/10 rounded w-3/4" />
                <div className="h-6 bg-white/5 rounded w-full" />
            </div>
        </div>
    );
}
