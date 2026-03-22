"use client";

import { useState, useEffect } from "react";
import type { EventData } from "@/types/events";
import EventRow from "./EventRow";
import { getHomeFeedData } from "./homeFeedData";

export default function TrendingEvents() {
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getHomeFeedData()
            .then((res) => setEvents(res.curated))
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
