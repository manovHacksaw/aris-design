import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Users, Clock, Play } from "lucide-react";
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
    const pool = event.leaderboardPool ? `$${event.leaderboardPool.toLocaleString()}` : "TBD";
    const image = event.imageCid
        ? `${PINATA_GW}/${event.imageCid}`
        : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80";

    const isLive = event.status === "posting" || event.status === "voting";
    const ctaText = event.status === "voting" || event.eventType === "vote_only" ? "Vote Now" : "Participate";

    return (
        <Link href={`/events/${event.id}`} className={cn("block group cursor-pointer", className)}>
            <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full bg-card rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-lg hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:border-white/15 transition-all"
            >
                {/* Top Image Section */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-secondary">
                    <img
                        src={image}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    {/* Subtle bottom gradient to blend image into card */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent opacity-80" />

                    {/* Badges Overlay */}
                    <div className="absolute top-3 inset-x-3 flex justify-between items-start pointer-events-none">
                        {isLive ? (
                            <div className="bg-red-500/20 text-red-500 px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-red-500/20 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white drop-shadow-md">LIVE</span>
                            </div>
                        ) : (
                            <div className="bg-white/10 text-white/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/10 shadow-sm">
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none drop-shadow-sm">{event.status || "ENDED"}</span>
                            </div>
                        )}

                        {event.endTime && isLive && (
                            <div className="bg-black/40 text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/10">
                                <Clock className="w-3 h-3 text-white/50" />
                                {/* Re-use countdown but without icon, just text */}
                                <Countdown targetDate={event.endTime} className="bg-transparent border-none p-0 flex-row-reverse" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Content Section */}
                <div className="flex flex-col flex-1 p-4 md:p-5">
                    <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-black text-foreground leading-tight tracking-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                            {event.title}
                        </h3>
                        <p className="text-xs text-foreground/50 font-medium uppercase tracking-widest mb-4">
                            by {brandName}
                        </p>
                    </div>

                    <div className="flex items-end justify-between border-t border-border/60 pt-4 mb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Entry / Cost</span>
                            <span className="text-xs font-black text-foreground tracking-wide">FREE</span>
                        </div>

                        <div className="flex flex-col gap-1 items-end">
                            <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Prize Pool</span>
                            <div className="flex items-center gap-1">
                                <Trophy className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/20" />
                                <span className="text-xs font-black text-yellow-500">{pool}</span>
                            </div>
                        </div>
                    </div>

                    {/* Call to Action Row */}
                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-foreground/60 w-1/2">
                            {/* "Avatars" Mock + Count */}
                            <div className="flex -space-x-1.5 shrink-0">
                                <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[8px]">👤</div>
                                <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[8px]">👤</div>
                            </div>
                            <span className="text-[10px] font-bold tracking-wide truncate">+{formatCount(participants)} joined</span>
                        </div>

                        <button className="bg-secondary text-foreground group-hover:bg-white group-hover:text-black hover:scale-105 active:scale-95 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                            {isJoined ? "View Entry" : ctaText}
                        </button>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
export function EventCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("w-full h-full bg-card rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-lg animate-pulse", className)}>
            {/* Top Image Section Skeleton */}
            <div className="relative w-full aspect-[4/3] bg-white/5" />

            {/* Bottom Content Section Skeleton */}
            <div className="flex flex-col flex-1 p-4 md:p-5 gap-4">
                <div className="flex-1 space-y-3">
                    {/* Title Skeleton */}
                    <div className="h-6 w-3/4 bg-white/5 rounded-lg" />
                    {/* Subtitle Skeleton */}
                    <div className="h-3 w-1/4 bg-white/5 rounded-full" />
                </div>

                {/* Stats Row Skeleton */}
                <div className="flex items-end justify-between border-t border-border/60 pt-4">
                    <div className="space-y-2">
                        <div className="h-2 w-16 bg-white/5 rounded-full" />
                        <div className="h-3 w-10 bg-white/5 rounded-full" />
                    </div>
                    <div className="space-y-2 flex flex-col items-end">
                        <div className="h-2 w-16 bg-white/5 rounded-full" />
                        <div className="h-3 w-12 bg-white/5 rounded-full" />
                    </div>
                </div>

                {/* CTA Row Skeleton */}
                <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/5" />
                        <div className="h-3 w-16 bg-white/5 rounded-full" />
                    </div>
                    <div className="h-9 w-24 bg-white/10 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
