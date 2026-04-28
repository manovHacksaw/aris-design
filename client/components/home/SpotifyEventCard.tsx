"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import type { EventData } from "@/types/events";

interface Props {
    event: EventData;
}

export default function SpotifyEventCard({ event }: Props) {
    const [hovered, setHovered] = useState(false);

    return (
        <Link href={`/events/${event.id}`} className="block flex-shrink-0 w-[280px] sm:w-[300px]">
            <motion.div
                onHoverStart={() => setHovered(true)}
                onHoverEnd={() => setHovered(false)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer bg-surface border border-surface-border"
            >
                {/* Image */}
                <img
                    src={event.image}
                    alt={event.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Base gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-black/90 via-black/5 dark:via-black/10 to-transparent" />

                {/* Default info */}
                <AnimatePresence>
                    {!hovered && (
                        <motion.div
                            initial={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-0 left-0 right-0 p-4"
                        >
                            <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                                {event.title}
                            </h3>
                            {event.rewardPool && (
                                <p className="text-xs text-white/70 font-semibold mt-0.5">
                                    {event.rewardPool}
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence> 

                {/* Hover info */}
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/70 dark:from-black/95 via-black/30 dark:via-black/50 to-transparent"
                        >
                            <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug mb-2">
                                {event.title}
                            </h3>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {event.rewardPool && (
                                    <span className="text-[10px] font-black text-white/70 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                        {event.rewardPool} pool
                                    </span>
                                )}
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${event.status === "live"
                                        ? "text-green-400 bg-green-400/10 border border-green-400/20"
                                        : event.status === "ended"
                                            ? "text-white/30 bg-white/5 border border-white/10"
                                            : "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                                    }`}>
                                    {event.status}
                                </span>
                            </div>
                            <p className="text-xs text-white/50 truncate">
                                {event.creator.name}
                            </p>
                            {event.timeRemaining && (
                                <p className="text-[11px] text-white/35 mt-0.5">{event.timeRemaining}</p>
                            )}
                            {event.participationCount !== undefined && (
                                <p className="text-[11px] text-white/35">{event.participationCount.toLocaleString()} participants</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </Link>
    );
}
