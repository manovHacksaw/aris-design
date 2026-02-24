"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getFriendActivity } from "@/services/mockUserService";
import type { FriendActivity } from "@/types/api";

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function FriendsFeed() {
    const [items, setItems] = useState<FriendActivity[]>([]);

    useEffect(() => {
        getFriendActivity()
            .then(setItems)
            .catch(() => {/* fail silently – section is hidden when empty */});
    }, []);

    if (!items.length) return null;

    return (
        <section>
            <h2 className="text-lg font-bold text-foreground mb-5">What Your Friends Are Doing</h2>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {items.map((item, i) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.35 }}
                        whileHover={{ y: -3 }}
                        className="min-w-[280px] bg-card/60 backdrop-blur-xl rounded-[22px] border border-border shadow-spotify p-5 cursor-pointer group flex-shrink-0 transition-all hover:bg-card hover:border-primary/20"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <img
                                src={item.friendAvatar}
                                alt={item.friendName}
                                className="w-9 h-9 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-foreground leading-snug">
                                    <span className="font-black">@{item.friendName}</span>{" "}
                                    <span className="text-foreground/60 font-medium">{item.actionText}</span>
                                </p>
                                <p className="text-xs font-black text-primary truncate tracking-tight">{item.eventTitle}</p>
                            </div>
                            <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest flex-shrink-0">
                                {relativeTime(item.createdAt)}
                            </span>
                        </div>
                        <div className="rounded-[18px] overflow-hidden h-32 border border-border/50">
                            <img
                                src={item.eventImage}
                                alt={item.eventTitle}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
