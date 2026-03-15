"use client";

import { useState, useEffect } from "react";
import { getEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import type { EventData } from "@/types/events";
import EventRow from "./EventRow";
import { useUser } from "@/context/UserContext";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function computeTimeRemaining(endTime: string): string {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h left`;
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
}

function toEventData(e: Event): EventData {
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

export default function EventsTabFeed() {
    const { user } = useUser();
    const username = user?.displayName ?? user?.username ?? "You";

    const [curated, setCurated] = useState<EventData[]>([]);
    const [voteEvents, setVoteEvents] = useState<EventData[]>([]);
    const [postEvents, setPostEvents] = useState<EventData[]>([]);

    const [loadingCurated, setLoadingCurated] = useState(true);
    const [loadingVote, setLoadingVote] = useState(true);
    const [loadingPost, setLoadingPost] = useState(true);

    useEffect(() => {
        // Curated for you — general feed
        getEvents({ limit: 10 })
            .then((res) => setCurated((res.events || []).map(toEventData)))
            .catch(() => { })
            .finally(() => setLoadingCurated(false));

        // Vote phase — earn guaranteed cents
        getEvents({ limit: 10, eventType: "vote_only" } as any)
            .then((res) => setVoteEvents((res.events || []).map(toEventData)))
            .catch(() => { })
            .finally(() => setLoadingVote(false));

        // Post phase — show your creativity
        getEvents({ limit: 10, eventType: "post_and_vote" } as any)
            .then((res) => setPostEvents((res.events || []).map(toEventData)))
            .catch(() => { })
            .finally(() => setLoadingPost(false));
    }, []);

    return (
        <div className="space-y-10">
            {/* Curated for you */}
            <EventRow
                madeFor="Made for"
                title={username}
                events={curated}
                loading={loadingCurated}
                showAllHref="/explore"
            />

            {/* Vote phase events */}
            <EventRow
                title="Earn guaranteed 3 cents"
                events={voteEvents}
                loading={loadingVote}
                showAllHref="/explore"
            />

            {/* Post phase events */}
            <EventRow
                title="Show your creativity"
                events={postEvents}
                loading={loadingPost}
                showAllHref="/explore"
            />
        </div>
    );
}
