"use client";

import { useState, useEffect } from "react";
import type { Event } from "@/services/event.service";
import { getEventsVotedByUser } from "@/services/event.service";
import { getUserSubmissions } from "@/services/user.service";
import EventRow from "./EventRow";
import { useUser } from "@/context/UserContext";
import { getHomeFeedData } from "./homeFeedData";

interface EventsTabFeedProps {
    searchQuery?: string;
    category?: string;
}

export default function EventsTabFeed({ searchQuery = "", category = "ALL" }: EventsTabFeedProps) {
    const { user } = useUser();
    const username = user?.displayName ?? user?.username ?? "You";

    const [curated, setCurated] = useState<Event[]>([]);
    const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
    const [loadingCurated, setLoadingCurated] = useState(true);
    const [loadingJoined, setLoadingJoined] = useState(false);

    useEffect(() => {
        getHomeFeedData()
            .then((res) => setCurated(res.curated))
            .catch(() => { })
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
        }).catch(() => { }).finally(() => setLoadingJoined(false));
    }, [user?.id]);

    const filterEvents = (list: Event[]) => {
        return list.filter((e) => {
            const matchesSearch = !searchQuery ||
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.brandName?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = category === "ALL" ||
                e.category?.toUpperCase() === category.toUpperCase() ||
                e.tags?.some(t => t.toUpperCase() === category.toUpperCase());

            return matchesSearch && matchesCategory;
        });
    };

    const filteredCurated = filterEvents(curated);
    const filteredJoined = filterEvents(joinedEvents);

    return (
        <div className="space-y-10">
            {(loadingCurated || filteredCurated.length > 0) && (
                <EventRow
                    madeFor="Made for"
                    title={username}
                    events={filteredCurated}
                    loading={loadingCurated}
                    showAllHref="/explore"
                />
            )}

            {(loadingJoined || filteredJoined.length > 0) && (
                <EventRow
                    title="Joined Events"
                    events={filteredJoined}
                    loading={loadingJoined}
                    showAllHref="/explore"
                />
            )}

            {!loadingCurated && !loadingJoined && filteredCurated.length === 0 && filteredJoined.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-foreground/40 font-bold">No events match your filters.</p>
                </div>
            )}
        </div>
    );
}
