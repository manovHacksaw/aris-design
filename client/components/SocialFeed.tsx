"use client";

import { useEffect, useState } from "react";
import FeedItem from "./FeedItem";
import { getEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function toFeedPost(e: Event) {
    return {
        id: e.id,
        username: e.brand?.name ?? "Unknown",
        image: e.imageUrl || (e.imageCid ? `${PINATA_GW}/${e.imageCid}` : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"),
        caption: e.description ?? e.title,
        reward: e.leaderboardPool ?? 0,
        votes: e._count?.votes ?? 0,
    };
}

export default function SocialFeed() {
    const [posts, setPosts] = useState<ReturnType<typeof toFeedPost>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getEvents({ limit: 5 })
            .then((res) => { setPosts((res.events || []).map(toFeedPost)); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="pb-24 pt-4 px-4 space-y-6 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-[22px] border border-border/40 overflow-hidden">
                        <div className="h-64 bg-secondary/50" />
                        <div className="p-4 space-y-2">
                            <div className="h-3 bg-secondary/50 rounded w-1/4" />
                            <div className="h-4 bg-secondary/50 rounded w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!posts.length) {
        return (
            <div className="pb-24 pt-12 px-4 text-center">
                <p className="text-foreground/40 font-bold text-sm">No posts yet.</p>
            </div>
        );
    }

    return (
        <div className="pb-24 pt-4 px-4 space-y-6">
            {posts.map((post) => (
                <FeedItem
                    key={post.id}
                    username={post.username}
                    image={post.image}
                    caption={post.caption}
                    reward={post.reward}
                    votes={post.votes}
                />
            ))}
        </div>
    );
}
