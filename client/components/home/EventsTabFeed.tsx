"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
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
    const hasAnyEvents = curated.length > 0 || joinedEvents.length > 0;

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
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                    {!hasAnyEvents ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center">
                                <Info className="w-8 h-8 text-foreground/20" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-foreground/60 font-black uppercase tracking-[0.2em] text-[10px]">No active events</p>
                                <p className="text-foreground/30 text-xs max-w-[280px] font-medium leading-relaxed">
                                    There are no active events available right now.<br />Check back soon for new opportunities.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-1">
                            <p className="text-foreground/60 font-black uppercase tracking-[0.2em] text-[10px]">No matches found</p>
                            <p className="text-foreground/30 text-xs font-medium">Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
