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
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />

                {/* Hover glow border */}
                <div className="absolute inset-0 rounded-[28px] border-[2px] border-blue-500/0 group-hover:border-blue-500/35 transition-colors duration-300 pointer-events-none shadow-[inset_0_0_30px_rgba(59,130,246,0)] group-hover:shadow-[inset_0_0_30px_rgba(59,130,246,0.08)]" />

                {/* Top Badges Row */}
                {event.rewardPool && (
                    <div className="absolute top-3.5 right-3.5">
                        <div
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md border border-[#B6FF60]/25 bg-black/40 shadow-xl"
                            style={{ boxShadow: "0 0 12px rgba(182,255,96,0.15)" }}
                        >
                            <span className="text-[11px] font-black" style={{ color: "#B6FF60" }}>
                                {event.rewardPool}
                            </span>
                        </div>
                    </div>
                )}

                {/* Bottom Content */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col gap-2.5">
                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-black text-white leading-tight line-clamp-2">
                        {event.title}
                    </h3>

                    {/* Brand + participants row */}
                    <div className="flex items-center justify-between">
                        {/* Brand identity */}
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border border-white/20 bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                {event.creator.avatar ? (
                                    <img
                                        src={event.creator.avatar}
                                        alt={event.creator.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-[8px] font-black text-white/60 leading-none">
                                        {event.creator.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] truncate max-w-[120px]">
                                {event.creator.name}
                            </span>
                        </div>

                        {/* Participant count */}
                        <div className="flex items-center gap-1 text-white/30">
                            <Users className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{formatCount(event.participationCount)}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
