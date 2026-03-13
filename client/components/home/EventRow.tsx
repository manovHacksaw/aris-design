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
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[168px] sm:w-[180px] p-3">
                            <div className="aspect-square rounded-lg bg-white/[0.06] animate-pulse mb-3" />
                            <div className="h-3.5 bg-white/[0.06] rounded animate-pulse mb-2 w-4/5" />
                            <div className="h-3 bg-white/[0.04] rounded animate-pulse w-3/5" />
                        </div>
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
        </section>
    );
}
