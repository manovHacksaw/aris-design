"use client";

import { motion } from "framer-motion";

export default function Marquee() {
    return (
        <div className="w-full bg-card border-y border-border py-2 overflow-hidden flex items-center relative">
            <div className="flex gap-8 whitespace-nowrap text-xs font-medium text-gray-400 animate-marquee items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">TESTNET DISCLAIMER: This is a testnet version. Assets have no real value.</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_david just earned $15.50 voting</span>
                <span className="flex items-center gap-2"><span className="text-primary">●</span> New Challenge from Subscribed Brand: GoPro Series</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_sarah submitted to Spotify Wrapped</span>
                <span className="flex items-center gap-2"><span className="text-accent">●</span> Your Feed: 12 new posts from people you follow</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_mike won $500 in NVIDIA Contest</span>
                <span className="flex items-center gap-2"><span className="text-primary">●</span> New Challenge from Subscribed Brand: Red Bull Stunts</span>
                {/* Duplicate for seamless loop */}
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">TESTNET DISCLAIMER: This is a testnet version. Assets have no real value.</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_david just earned $15.50 voting</span>
                <span className="flex items-center gap-2"><span className="text-primary">●</span> New Challenge from Subscribed Brand: GoPro Series</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_sarah submitted to Spotify Wrapped</span>
                <span className="flex items-center gap-2"><span className="text-accent">●</span> Your Feed: 12 new posts from people you follow</span>
                <span className="flex items-center gap-2"><span className="text-green-400">●</span> @followed_mike won $500 in NVIDIA Contest</span>
                <span className="flex items-center gap-2"><span className="text-primary">●</span> New Challenge from Subscribed Brand: Red Bull Stunts</span>
            </div>
        </div>
    );
}
