"use client";

import Link from "next/link";
import type { Event } from "@/services/event.service";
import PremiumEventCard from "@/components/events/PremiumEventCard";

interface EventRowProps {
    title: string;
    madeFor?: string;        // e.g. "Made For" above the title like Spotify
    events: Event[];
    loading?: boolean;
    showAllHref?: string;
}

export default function EventRow({
    title,
    madeFor,
    events,
    loading = false,
    showAllHref = "/explore",
}: EventRowProps) {
    return (
        <section>
            {/* Section header */}
            <div className="flex items-end justify-between mb-4 group/header">
                <div>
                    {madeFor && (
                        <p className="text-xs font-bold text-foreground/40 mb-0.5 uppercase tracking-wider">
                            {madeFor}
                        </p>
                    )}
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                        {title}
                    </h2>
                </div>

                <Link
                    href={showAllHref}
                    className="text-[11px] font-black text-foreground/40 hover:text-foreground uppercase tracking-[0.15em] transition-colors duration-150 pb-1"
                >
                    Show all
                </Link>
            </div>

            {/* Horizontal scroll row */}
            <div className="relative">
                <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    {loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[240px] sm:w-[300px] aspect-[3/4] rounded-2xl bg-foreground/[0.05] animate-pulse border border-border"
                                style={{ animationDelay: `${i * 80}ms` }}
                            />
                        ))
                        : events.map((event) => (
                            <div key={event.id} className="flex-shrink-0 w-[240px] sm:w-[300px]">
                                <PremiumEventCard event={event} />
                            </div>
                        ))}

                    {!loading && events.length === 0 && (
                        <p className="text-sm text-foreground/30 font-medium py-8 pl-3">
                            No events available right now.
                        </p>
                    )}
                </div>
                {/* Right fade */}
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-background to-transparent pointer-events-none" />
            </div>
        </section>
    );
}
