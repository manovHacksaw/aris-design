"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Users, Clock, Zap } from "lucide-react";
import Countdown from "@/components/events/Countdown";
import { formatCount } from "@/lib/eventUtils";
import { cn } from "@/lib/utils";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface OpportunityCardProps {
    event: any;
    className?: string;
}

export default function OpportunityCard({ event, className }: OpportunityCardProps) {
    const brandName = event.brand?.name || "Aris Brand";
    const participants =
        event._count?.submissions || event._count?.votes || event.eventAnalytics?.uniqueParticipants || 0;
    const basePool = event.baseReward ? `$${event.baseReward}` : null;
    const topPool = event.leaderboardPool
        ? `$${event.leaderboardPool.toLocaleString()}`
        : event.topReward
            ? `$${event.topReward.toLocaleString()}`
            : null;
    const image = event.imageCid
        ? `${PINATA_GW}/${event.imageCid}`
        : event.imageUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80";

    const isLive = event.status === "posting" || event.status === "voting";
    const ctaText = event.status === "voting" || event.eventType === "vote_only" ? "Vote" : "Submit";

    return (
        <Link href={`/events/${event.id}`} className={cn("block group cursor-pointer", className)}>
            <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full bg-white/[0.02] rounded-2xl overflow-hidden flex flex-col border border-white/[0.06] hover:border-white/[0.10] transition-all duration-200"
            >
                {/* Image — shorter 4:3 ratio */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-white/[0.04] flex-shrink-0">
                    <img
                        src={image}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />

                    {/* Minimal gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Live badge — small */}
                    {isLive && (
                        <div className="absolute top-2.5 left-2.5 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-white">
                                LIVE
                            </span>
                        </div>
                    )}

                    {/* Reward chips — top right */}
                    {(basePool || topPool) && (
                        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
                            {topPool && (
                                <div className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                                    <Trophy className="w-2 h-2 text-yellow-400 fill-yellow-400/30" />
                                    <span className="text-[8px] font-bold text-yellow-300">{topPool}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Countdown — bottom */}
                    {event.endTime && isLive && (
                        <div className="absolute bottom-2 left-2.5 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                            <Countdown targetDate={event.endTime} className="bg-transparent border-none p-0" />
                        </div>
                    )}
                </div>

                {/* Bottom info */}
                <div className="px-3 py-2.5 flex flex-col gap-1.5 flex-1">
                    <h3 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                        {event.title}
                    </h3>
                    <p className="text-[9px] text-white/35 font-medium">by {brandName}</p>

                    {/* Stats row */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.04]">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-white/30">
                                <Users className="w-3 h-3" />
                                <span className="text-[9px] font-medium">{formatCount(participants)}</span>
                            </div>
                            {basePool && (
                                <div className="flex items-center gap-1 text-white/30">
                                    <Zap className="w-2.5 h-2.5 text-blue-400/60" />
                                    <span className="text-[9px] font-medium">{basePool}/vote</span>
                                </div>
                            )}
                        </div>
                        <span className="text-[9px] font-bold text-lime-400/70 uppercase tracking-wide group-hover:text-lime-400 transition-colors">
                            {ctaText} →
                        </span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

export function OpportunityCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("w-full bg-white/[0.02] rounded-2xl overflow-hidden border border-white/[0.06] animate-pulse", className)}>
            <div className="w-full aspect-[4/3] bg-white/[0.04]" />
            <div className="px-3 py-2.5 space-y-2">
                <div className="h-3 bg-white/[0.04] rounded w-3/4" />
                <div className="h-2.5 bg-white/[0.03] rounded w-1/2" />
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <div className="h-2.5 w-10 bg-white/[0.04] rounded" />
                    <div className="h-2.5 w-14 bg-white/[0.04] rounded" />
                </div>
            </div>
        </div>
    );
}
