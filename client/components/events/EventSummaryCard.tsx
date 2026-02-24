"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventData } from "@/types/events";
import { getStatusStyles, formatCount } from "@/lib/eventUtils";
import ModeBadge from "./ModeBadge";
import StatusBadge from "./StatusBadge";
import RewardBlock from "./RewardBlock";

interface EventSummaryCardProps {
    event: EventData;
}

export default function EventSummaryCard({ event }: EventSummaryCardProps) {
    const styles = getStatusStyles(event.status, event.userState);

    return (
        <Link href={`/events/${event.id}`} className="block h-full">
            <motion.div
                whileHover={{ y: -4 }}
                className={cn(
                    "bg-card rounded-[24px] overflow-hidden group cursor-pointer flex flex-col h-full transition-all border shadow-spotify hover:shadow-xl",
                    styles.borderClass,
                    styles.bgTint
                )}
            >
                {/* Image Area */}
                <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                    <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent opacity-60" />

                    {/* Badges */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                        <ModeBadge mode={event.mode} />
                    </div>
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <StatusBadge status={event.status} userState={event.userState} />
                    </div>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4 md:p-5 flex flex-col flex-1">
                    {/* Creator */}
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <img
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-border p-0.5 bg-secondary flex-shrink-0"
                            src={event.creator.avatar}
                            alt={event.creator.name}
                        />
                        <span className="text-[10px] sm:text-[11px] text-foreground/50 font-bold tracking-tight truncate">
                            {event.creator.name}
                        </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-black text-foreground text-sm sm:text-base md:text-lg leading-tight tracking-tight mb-3 sm:mb-4 line-clamp-2">
                        {event.title}
                    </h4>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Reward */}
                    <RewardBlock
                        rewardPool={event.rewardPool}
                        baseReward={event.baseReward}
                        topReward={event.topReward}
                        mode={event.mode}
                        variant="compact"
                        className="mb-4"
                    />

                    {/* Progress bar (vote mode) */}
                    {event.mode === "vote" && event.progress !== undefined && (
                        <div className="w-full bg-secondary rounded-full h-1 mb-4 overflow-hidden">
                            <div
                                className="bg-primary/60 h-full rounded-full transition-all"
                                style={{ width: `${event.progress}%` }}
                            />
                        </div>
                    )}

                    {/* Footer: Participants + Time */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 sm:gap-1.5 text-foreground/40 min-w-0">
                            <Users className="w-3 h-3 flex-shrink-0" />
                            <span className="text-[9px] sm:text-[10px] font-bold truncate">
                                {formatCount(event.participationCount)}
                            </span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex-shrink-0">
                            {event.status === "ended" ? "Ended" : event.timeRemaining}
                        </span>
                    </div>

                    {/* CTA */}
                    {styles.ctaEnabled && (
                        <button className="w-full bg-foreground text-background text-[10px] sm:text-xs font-black py-2.5 sm:py-3 rounded-[14px] active:scale-[0.98] transition-all mt-3 sm:mt-4 hover:bg-foreground/90 uppercase tracking-widest">
                            {event.mode === "vote" ? "Vote Now" : "Participate"}
                        </button>
                    )}

                    {!styles.ctaEnabled && event.userState === "participated" && (
                        <div className="w-full text-center text-[9px] sm:text-[10px] font-black text-primary/60 uppercase tracking-widest mt-3 sm:mt-4 py-2.5 sm:py-3">
                            You participated
                        </div>
                    )}
                </div>
            </motion.div>
        </Link>
    );
}
