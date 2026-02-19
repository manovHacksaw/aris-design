"use client";

import { motion } from "framer-motion";

export default function Marquee() {
    return (
        <div className="w-full bg-card border-y border-border py-2 overflow-hidden flex items-center relative">
            <div className="flex gap-8 whitespace-nowrap text-xs font-medium text-gray-400 animate-marquee">
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_david just earned $15.50 voting</span>
                <span className="flex items-center gap-2"><span className="text-primary">●</span> New Challenge from Subscribed Brand: GoPro Series</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_sarah submitted to Spotify Wrapped</span>
                <span className="flex items-center gap-2"><span className="text-muted-pink">●</span> Your Feed: 12 new posts from people you follow</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_mike won $500 in NVIDIA Contest</span>
                <span className="flex items-center gap-2"><span className="text-primary">●</span> New Challenge from Subscribed Brand: Red Bull Stunts</span>
                {/* Duplicate for seamless loop */}
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_david just earned $15.50 voting</span>
                <span className="flex items-center gap-2"><span className="text-primary">●</span> New Challenge from Subscribed Brand: GoPro Series</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_sarah submitted to Spotify Wrapped</span>
                <span className="flex items-center gap-2"><span className="text-muted-pink">●</span> Your Feed: 12 new posts from people you follow</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_mike won $500 in NVIDIA Contest</span>
                <span className="flex items-center gap-2"><span className="text-primary">●</span> New Challenge from Subscribed Brand: Red Bull Stunts</span>
            </div>
        </div>
    );
}
