"use client";

import { useEffect, useState } from "react";
import Masonry from "react-masonry-css";
import EventSummaryCard from "@/components/events/EventSummaryCard";
import CompactEventCard from "@/components/events/CompactEventCard";
import { getEvents } from "@/services/mockEventService";
import type { ApiEvent } from "@/types/api";
import type { EventData } from "@/types/events";

// ─── Adapter: ApiEvent → EventData ───────────────────────────────────────────

function toEventData(e: ApiEvent & { timeRemaining?: string }): EventData {
    return {
        id: e.id,
        mode: e.eventType,
        status: (e.status === "scheduled" || e.status === "draft") ? "upcoming" : e.status as import("@/types/events").EventStatus,
        title: e.title,
        creator: {
            name: e.brand.name,
            avatar: e.brand.avatar,
            handle: e.brand.handle,
        },
        rewardPool: `$${e.leaderboardPool.toLocaleString()}`,
        baseReward: `$${e.baseReward.toFixed(2)}`,
        topReward: e.topReward ? `$${e.topReward.toLocaleString()}` : undefined,
        participationCount: e.eventType === "vote" ? e.totalVotes : e.totalSubmissions,
        timeRemaining: e.timeRemaining ?? "",
        image: e.coverImage,
        description: e.description,
        progress: e.progress ?? undefined,
        userState: e.userState ?? undefined,
    };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FeedSkeleton() {
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-[24px] border border-border/40 overflow-hidden animate-pulse">
                        <div className="h-44 bg-secondary/60" />
                        <div className="p-5 space-y-3">
                            <div className="h-3 bg-secondary/60 rounded-full w-1/3" />
                            <div className="h-4 bg-secondary/60 rounded-full w-3/4" />
                            <div className="h-3 bg-secondary/60 rounded-full w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

const breakpointColumnsObj = { default: 3, 1300: 3, 1100: 2, 700: 1 };

export default function FeedGrid() {
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        setError(null);
        getEvents()
            .then((res) => {
                setEvents(res.data.map(toEventData));
                setLoading(false);
            })
            .catch(() => {
                setError("Failed to load events. Please try again.");
                setLoading(false);
            });
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) return <FeedSkeleton />;

    if (error) {
        return (
            <div className="w-full py-16 flex flex-col items-center gap-3 text-center">
                <p className="text-foreground/40 font-bold text-sm">{error}</p>
                <button onClick={load} className="text-xs font-black text-primary uppercase tracking-widest hover:underline">
                    Retry
                </button>
            </div>
        );
    }

    if (!events.length) {
        return (
            <div className="w-full py-16 text-center">
                <p className="text-foreground/40 font-bold text-sm">No events available right now.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Desktop Masonry Layout */}
            <div className="hidden md:block">
                <Masonry
                    breakpointCols={breakpointColumnsObj}
                    className="flex w-auto -ml-4"
                    columnClassName="pl-4 bg-clip-padding space-y-4"
                >
                    {events.map((event) => (
                        <div key={event.id} className="mb-4">
                            <EventSummaryCard event={event} />
                        </div>
                    ))}
                </Masonry>
            </div>

            {/* Mobile Compact Grid */}
            <div className="md:hidden grid grid-cols-2 gap-3">
                {events.map((event) => (
                    <CompactEventCard key={event.id} event={event} />
                ))}
            </div>
        </div>
    );
}
