"use client";

import { ThumbsUp, Eye } from "lucide-react";
import ModeBadge from "@/components/events/ModeBadge";
import { EventMode } from "@/types/events";
import { formatCount } from "@/lib/eventUtils";

interface PostItem {
    id: number;
    image: string;
    title: string;
    eventMode: EventMode;
    voteCount: number;
    views: number;
    earned: string;
    eventName: string;
}

export default function ProfilePosts() {
    const posts: PostItem[] = [
        { id: 1, image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=500&fit=crop", title: "Air Max Reimagined", eventMode: "post", voteCount: 1240, views: 4800, earned: "$50", eventName: "Nike Air Max" },
        { id: 2, image: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=500&fit=crop", title: "Summer Frequencies", eventMode: "post", voteCount: 890, views: 3200, earned: "$35", eventName: "Spotify Art" },
        { id: 3, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=500&fit=crop", title: "Bass Drop Visual", eventMode: "post", voteCount: 654, views: 2100, earned: "$22", eventName: "Spotify Art" },
        { id: 4, image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=500&fit=crop", title: "Neon Nightscape", eventMode: "vote", voteCount: 2100, views: 6500, earned: "$45", eventName: "Cyberpunk Build" },
        { id: 5, image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=500&fit=crop", title: "Retro Wave Cover", eventMode: "post", voteCount: 432, views: 1800, earned: "$18", eventName: "Coke Refresh" },
        { id: 6, image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=500&fit=crop", title: "Digital Dreams", eventMode: "vote", voteCount: 789, views: 3400, earned: "$28", eventName: "Meta VR World" },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
                <div
                    key={post.id}
                    className="aspect-[4/5] bg-card border border-border/40 rounded-[20px] overflow-hidden relative group cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-lg"
                >
                    <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Mode badge */}
                    <div className="absolute top-3 left-3">
                        <ModeBadge mode={post.eventMode} />
                    </div>

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Info on hover */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">{post.eventName}</p>
                        <p className="text-xs font-black text-white mb-3 tracking-tight">{post.title}</p>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white/60">
                                <div className="flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" />
                                    <span className="text-[10px] font-bold">{formatCount(post.voteCount)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    <span className="text-[10px] font-bold">{formatCount(post.views)}</span>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg">
                                {post.earned}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
