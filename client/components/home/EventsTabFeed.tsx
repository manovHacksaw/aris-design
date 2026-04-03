"use client";

import { useState, useEffect } from "react";
import type { Event } from "@/services/event.service";
import EventRow from "./EventRow";
import { useUser } from "@/context/UserContext";
import { getHomeFeedData } from "./homeFeedData";

export default function EventsTabFeed() {
    const { user } = useUser();
    const username = user?.displayName ?? user?.username ?? "You";

    const [curated, setCurated] = useState<Event[]>([]);
    const [voteEvents, setVoteEvents] = useState<Event[]>([]);
    const [postEvents, setPostEvents] = useState<Event[]>([]);

    const [loadingCurated, setLoadingCurated] = useState(true);
    const [loadingVote, setLoadingVote] = useState(true);
    const [loadingPost, setLoadingPost] = useState(true);

    useEffect(() => {
        getHomeFeedData()
            .then((res) => {
                setCurated(res.curated);
                setVoteEvents(res.voteEvents);
                setPostEvents(res.postEvents);
            })
            .catch(() => { })
            .finally(() => {
                setLoadingCurated(false);
                setLoadingVote(false);
                setLoadingPost(false);
            });
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
