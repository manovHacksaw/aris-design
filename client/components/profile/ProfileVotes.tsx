"use client";

import { ThumbsUp } from "lucide-react";
import ModeBadge from "@/components/events/ModeBadge";
import { EventMode } from "@/types/events";

interface VoteItem {
    id: number;
    title: string;
    creator: string;
    date: string;
    reward: string;
    eventMode: EventMode;
    eventName: string;
    image: string;
    votedFor: string;
}

export default function ProfileVotes() {
    const votes: VoteItem[] = [
        { id: 1, title: "Futuristic Air Max", creator: "@david_art", date: "2 hours ago", reward: "+$0.50", eventMode: "vote", eventName: "Nike Air Max", image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=120&h=120&fit=crop", votedFor: "David Art" },
        { id: 2, title: "Summer Vibes Cover", creator: "@neonvibe", date: "5 hours ago", reward: "+$0.25", eventMode: "vote", eventName: "Spotify Art", image: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&h=120&fit=crop", votedFor: "NeonVibe" },
        { id: 3, title: "Cyberpunk Rig Setup", creator: "@retrostyle", date: "yesterday", reward: "+$1.20", eventMode: "vote", eventName: "Cyberpunk Build", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=120&h=120&fit=crop", votedFor: "RetroStyle" },
        { id: 4, title: "Mountain Peak Shot", creator: "@adventure_tom", date: "2 days ago", reward: "+$0.40", eventMode: "vote", eventName: "North Face", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=120&h=120&fit=crop", votedFor: "Adventure Tom" },
    ];

    return (
        <div className="space-y-3">
            {votes.map((vote) => (
                <div
                    key={vote.id}
                    className="bg-card border border-border/40 rounded-[18px] p-4 flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer group"
                >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-[12px] bg-secondary overflow-hidden shrink-0 border border-border/40">
                        <img
                            src={vote.image}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            alt={vote.title}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <ModeBadge mode={vote.eventMode} />
                            <span className="text-[10px] text-foreground/30 font-bold">{vote.eventName}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            Voted for {vote.votedFor}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-foreground/40 font-bold">{vote.creator}</span>
                            <span className="text-foreground/20">·</span>
                            <span className="text-[10px] text-foreground/30 font-bold">{vote.date}</span>
                        </div>
                    </div>

                    {/* Reward */}
                    <div className="shrink-0 flex items-center gap-1.5 bg-emerald-400/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-400/10">
                        <ThumbsUp className="w-3 h-3" />
                        <span className="text-xs font-black">{vote.reward}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
