"use client";

import { useState, useEffect } from "react";
import { getEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import type { EventData } from "@/types/events";
import EventRow from "./EventRow";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function computeTimeRemaining(endTime: string): string {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h left`;
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
}

export function toEventData(e: Event): EventData {
    const statusMap: Record<string, EventData["status"]> = {
        posting: "live",
        voting: "live",
        scheduled: "upcoming",
        draft: "upcoming",
        completed: "ended",
    };
    return {
        id: e.id,
        mode: e.eventType === "vote_only" ? "vote" : "post",
        status: statusMap[e.status] ?? "upcoming",
        title: e.title,
        creator: {
            name: e.brand?.name ?? "Unknown",
            avatar: e.brand?.logoUrl || (e.brand?.logoCid ? `${PINATA_GW}/${e.brand.logoCid}` : ""),
            handle: `@${(e.brand?.name ?? "").toLowerCase().replace(/\s+/g, "")}`,
        },
        rewardPool: `$${(e.leaderboardPool ?? 0).toLocaleString()}`,
        baseReward: `$${(e.baseReward ?? 0).toFixed(2)}`,
        topReward: e.topReward ? `$${e.topReward.toLocaleString()}` : undefined,
        participationCount: e._count?.submissions ?? e._count?.votes ?? 0,
        timeRemaining: computeTimeRemaining(e.endTime),
        image: e.imageUrl || (e.imageCid ? `${PINATA_GW}/${e.imageCid}` : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"),
        description: e.description ?? "",
        progress: undefined,
        userState: undefined,
    };
}

export default function TrendingEvents() {
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getEvents({ limit: 10 })
            .then((res) => setEvents((res.events || []).map(toEventData)))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <EventRow
            title="Trending Events"
            events={events}
            loading={loading}
            showAllHref="/explore"
        />
    );
}
