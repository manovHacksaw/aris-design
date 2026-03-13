"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventData } from "@/types/events";
import { formatCount } from "@/lib/eventUtils";

interface SquareEventCardProps {
    event: EventData;
    className?: string;
}

export default function SquareEventCard({ event, className }: SquareEventCardProps) {
    return (
        <Link href={`/events/${event.id}`} className={cn("block w-full", className)}>
            <motion.div
                whileHover={{ y: -5, scale: 1.015 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative aspect-square rounded-[28px] overflow-hidden group cursor-pointer border border-white/8 hover:border-white/0"
            >
                {/* Background Image */}
                <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                />

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />

                {/* Hover glow border */}
                <div className="absolute inset-0 rounded-[28px] border-[2px] border-blue-500/0 group-hover:border-blue-500/35 transition-colors duration-300 pointer-events-none shadow-[inset_0_0_30px_rgba(59,130,246,0)] group-hover:shadow-[inset_0_0_30px_rgba(59,130,246,0.08)]" />

                {/* Top Badges Row */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-start">
                    {/* Mode Tag */}
                    <div className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md border border-white/15 text-white shadow-xl",
                        event.mode === "vote" ? "bg-purple-600/75" : "bg-blue-600/75"
                    )}>
                        {event.mode === "vote" ? "Vote" : "Post"}
                    </div>

                    {/* Reward Pool — neon accent */}
                    {event.rewardPool && (
                        <div
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md border border-[#B6FF60]/25 bg-black/40 shadow-xl"
                            style={{ boxShadow: "0 0 12px rgba(182,255,96,0.15)" }}
                        >
                            <span className="text-[11px] font-black" style={{ color: "#B6FF60" }}>
                                {event.rewardPool}
                            </span>
                        </div>
                    )}
                </div>

                {/* Bottom Content */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col gap-1">
                    <p className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.18em]">
                        {event.creator.name}
                    </p>
                    <h3 className="text-sm sm:text-base font-black text-white leading-tight line-clamp-2">
                        {event.title}
                    </h3>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-white/8">
                        <div className="flex items-center gap-1.5 text-white/40">
                            <Users className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{formatCount(event.participationCount)}</span>
                        </div>
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            {event.timeRemaining}
                        </span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
