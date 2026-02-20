"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EventData } from "@/types/events";

interface CompactEventCardProps {
    event: EventData;
}

export default function CompactEventCard({ event }: CompactEventCardProps) {
    return (
        <Link href={`/events/${event.id}`} className="block h-full">
            <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-card rounded-[16px] overflow-hidden border border-border/50 shadow-sm h-full flex flex-col"
            >
                {/* Image Aspect Ratio Square-ish */}
                <div className="relative aspect-square">
                    <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Minimal Overlay Info */}
                    <div className="absolute bottom-2 left-2 right-2">
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-white border border-white/20 backdrop-blur-md",
                            event.mode === 'vote' ? "bg-purple-500/80" : "bg-blue-500/80"
                        )}>
                            {event.mode === 'vote' ? 'Vote' : 'Post'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-2.5 flex flex-col flex-1">
                    <h3 className="text-xs font-bold text-foreground leading-tight line-clamp-2 mb-1">
                        {event.title}
                    </h3>
                    <p className="text-[10px] text-foreground/50 line-clamp-1 mb-2">
                        {event.creator.name}
                    </p>

                    <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                        {event.mode === 'vote' ? (
                            <>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[8px] uppercase font-bold text-foreground/40 leading-none mb-0.5">Base</span>
                                    <span className="text-[10px] font-black text-foreground truncate">{event.baseReward}</span>
                                </div>
                                {event.topReward && (
                                    <div className="flex flex-col items-end min-w-0">
                                        <span className="text-[8px] uppercase font-bold text-foreground/40 leading-none mb-0.5">Top Prize</span>
                                        <span className="text-[10px] font-black text-accent truncate">{event.topReward}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[8px] uppercase font-bold text-foreground/40 leading-none mb-0.5">Base</span>
                                    <span className="text-[10px] font-black text-foreground truncate">{event.baseReward}</span>
                                </div>
                                <div className="flex flex-col items-end min-w-0">
                                    <span className="text-[8px] uppercase font-bold text-foreground/40 leading-none mb-0.5">Pool</span>
                                    <span className="text-[10px] font-black text-primary truncate">{event.rewardPool}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
