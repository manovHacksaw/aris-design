"use client";

import { useEffect, useState } from "react";
import FeedItem from "./FeedItem";
import { getSocialFeed } from "@/services/mockEventService";
import type { SocialPost } from "@/types/api";

export default function SocialFeed() {
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSocialFeed()
            .then((res) => { setPosts(res.data); setLoading(false); })
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
                    image={post.coverImage}
                    caption={post.caption}
                    reward={post.reward}
                    votes={post.votes}
                />
            ))}
        </div>
    );
}
