"use client";

import { useState, useEffect } from "react";
import type { Event } from "@/services/event.service";
import { getEventsVotedByUser } from "@/services/event.service";
import { getUserSubmissions } from "@/services/user.service";
import EventRow from "./EventRow";
import { useUser } from "@/context/UserContext";
import { getHomeFeedData } from "./homeFeedData";

export default function EventsTabFeed() {
    const { user } = useUser();
    const username = user?.displayName ?? user?.username ?? "You";

    const [curated, setCurated] = useState<Event[]>([]);
    const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
    const [loadingCurated, setLoadingCurated] = useState(true);
    const [loadingJoined, setLoadingJoined] = useState(false);

    useEffect(() => {
        getHomeFeedData()
            .then((res) => setCurated(res.curated))
            .catch(() => {})
            .finally(() => setLoadingCurated(false));
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        setLoadingJoined(true);
        Promise.all([
            getEventsVotedByUser(user.id).catch(() => [] as Event[]),
            getUserSubmissions(user.id).catch(() => []),
        ]).then(([voted, submissions]) => {
            const byId = new Map<string, Event>();
            (voted as Event[]).forEach((e) => byId.set(e.id, e));
            (submissions as { event?: Event | null }[]).forEach((s) => {
                if (s.event?.id && !byId.has(s.event.id)) byId.set(s.event.id, s.event as Event);
            });
            setJoinedEvents(Array.from(byId.values()));
        }).catch(() => {}).finally(() => setLoadingJoined(false));
    }, [user?.id]);

    return (
        <div className="space-y-10">
            <EventRow
                madeFor="Made for"
                title={username}
                events={curated}
                loading={loadingCurated}
                showAllHref="/explore"
            />

            {(loadingJoined || joinedEvents.length > 0) && (
                <EventRow
                    title="Joined Events"
                    events={joinedEvents}
                    loading={loadingJoined}
                    showAllHref="/explore"
                />
            )}
        </div>
    );
}
