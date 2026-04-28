import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Users, Clock, Zap } from "lucide-react";
import Countdown from "./Countdown";
import { formatCount } from "@/lib/eventUtils";
import { cn } from "@/lib/utils";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface EventCardProps {
    event: any;
    className?: string;
    isJoined?: boolean;
}

export default function EventCard({ event, className, isJoined }: EventCardProps) {
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
        : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80";

    const isLive = event.status === "posting" || event.status === "voting";
    const ctaText = event.status === "voting" || event.eventType === "vote_only" ? "Vote Now" : "Participate";

    return (
        <Link href={`/events/${event.id}`} className={cn("block group cursor-pointer", className)}>
            <motion.div
                whileHover={{ y: -6, scale: 1.015 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full h-full bg-card rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all duration-300"
            >
                {/* Image — portrait Pinterest ratio */}
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-secondary flex-shrink-0">
                    <img
                        src={image}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Gradient overlay — only bottom third */}
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />

                    {/* Live badge — top left */}
                    {isLive && (
                        <div className="absolute top-3.5 left-3.5 bg-red-500/25 px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white">LIVE</span>
                        </div>
                    )}

                    {/* Reward badges — top right, stacked */}
                    {(basePool || topPool) && (
                        <div className="absolute top-3.5 right-3.5 flex flex-col gap-1 items-end">
                            {basePool && (
                                <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                                    <Zap className="w-2.5 h-2.5 text-blue-400" />
                                    <span className="text-[9px] font-bold text-blue-300">{basePool}/vote</span>
                                </div>
                            )}
                            {topPool && (
                                <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                                    <Trophy className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400/30" />
                                    <span className="text-[9px] font-bold text-yellow-300">{topPool} Top</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Countdown — bottom left if live */}
                    {event.endTime && isLive && (
                        <div className="absolute bottom-14 left-3.5 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                            <Clock className="w-3 h-3 text-white/60" />
                            <Countdown targetDate={event.endTime} className="bg-transparent border-none p-0" />
                        </div>
                    )}

                    {/* Bottom overlay — title + brand */}
                    <div className="absolute inset-x-0 bottom-0 p-4">
                        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-1">
                            {event.title}
                        </h3>
                        <p className="text-[10px] text-white/50">by {brandName}</p>
                    </div>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-foreground/40">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">{formatCount(participants)}</span>
                    </div>
                    <button className="bg-secondary text-foreground/70 group-hover:bg-primary group-hover:text-white px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-wide transition-all">
                        {isJoined ? "View Entry" : ctaText}
                    </button>
                </div>
            </motion.div>
        </Link>
    );
}

export function EventCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("w-full bg-card rounded-3xl overflow-hidden animate-pulse", className)}>
            <div className="w-full aspect-[3/4] bg-secondary" />
            <div className="px-4 py-3.5 flex items-center justify-between">
                <div className="h-3 w-12 bg-secondary rounded-full" />
                <div className="h-6 w-20 bg-secondary rounded-full" />
            </div>
        </div>
    );
}
