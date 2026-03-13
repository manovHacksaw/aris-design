"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { EventData } from "@/types/events";

interface Props {
    event: EventData;
}

export default function SpotifyEventCard({ event }: Props) {
    return (
        <Link href={`/events/${event.id}`} className="block flex-shrink-0 w-[168px] sm:w-[180px]">
            <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="group p-3 rounded-xl bg-white/0 hover:bg-white/[0.06] transition-colors duration-200 cursor-pointer"
            >
                {/* Square Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-white/[0.06] mb-3">
                    <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-[0.65]"
                    />

                    {/* Reward pill — top left */}
                    {event.rewardPool && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                            <span
                                className="text-[10px] font-black"
                                style={{ color: "#B6FF60" }}
                            >
                                {event.rewardPool}
                            </span>
                        </div>
                    )}

                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug mb-1">
                    {event.title}
                </h3>

                {/* Meta: brand · reward */}
                <p className="text-xs text-white/40 truncate">
                    {event.creator.name}
                    {event.rewardPool ? ` · ${event.rewardPool}` : ""}
                </p>
            </motion.div>
        </Link>
    );
}
