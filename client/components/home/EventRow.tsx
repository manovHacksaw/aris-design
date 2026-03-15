"use client";

import Link from "next/link";
import type { EventData } from "@/types/events";
import SpotifyEventCard from "./SpotifyEventCard";

interface EventRowProps {
    title: string;
    madeFor?: string;        // e.g. "Made For" above the title like Spotify
    events: EventData[];
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
                        <p className="text-xs font-bold text-white/40 mb-0.5 uppercase tracking-wider">
                            {madeFor}
                        </p>
                    )}
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {title}
                    </h2>
                </div>

                <Link
                    href={showAllHref}
                    className="text-[11px] font-black text-white/30 hover:text-white uppercase tracking-[0.15em] transition-colors duration-150 pb-1"
                >
                    Show all
                </Link>
            </div>

            {/* Horizontal scroll row */}
            <div className="relative">
                <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    {loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[280px] sm:w-[300px] aspect-[4/5] rounded-2xl bg-white/[0.05] animate-pulse border border-white/[0.06]"
                                style={{ animationDelay: `${i * 80}ms` }}
                            />
                        ))
                        : events.map((event) => (
                            <SpotifyEventCard key={event.id} event={event} />
                        ))}

                    {!loading && events.length === 0 && (
                        <p className="text-sm text-white/20 font-medium py-8 pl-3">
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
