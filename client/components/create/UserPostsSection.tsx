"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Heart, Clock, FileImage } from "lucide-react";
import { getUserSubmissions } from "@/services/user.service";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface PostedSubmission {
    id: string;
    eventId: string;
    imageUrl?: string;
    imageCid?: string;
    content?: string;
    createdAt: string;
    _count?: { votes: number };
    event?: {
        id: string;
        title: string;
        imageUrl?: string;
        imageCid?: string;
        status?: string;
    };
}

function imageFor(s: PostedSubmission) {
    if (s.imageUrl) return s.imageUrl;
    if (s.imageCid) return `${PINATA_GW}/${s.imageCid}`;
    if (s.event?.imageUrl) return s.event.imageUrl;
    if (s.event?.imageCid) return `${PINATA_GW}/${s.event.imageCid}`;
    return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=70";
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7) return `${d}d ago`;
    return `${Math.floor(d / 7)}w ago`;
}

interface Props {
    userId: string;
}

export default function UserPostsSection({ userId }: Props) {
    const [posts, setPosts] = useState<PostedSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        getUserSubmissions(userId)
            .then((data) => setPosts(data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [userId]);

    if (!loading && posts.length === 0) return null;

    return (
        <section>
            <div className="flex items-end justify-between mb-5">
                <div>
                    <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-0.5">Your work</p>
                    <h2 className="text-2xl font-black text-white tracking-tight">Posted</h2>
                </div>
                <Link
                    href="/dashboard"
                    className="text-[11px] font-black text-white/30 hover:text-white uppercase tracking-[0.15em] transition-colors"
                >
                    Show all
                </Link>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[168px] sm:w-[180px] p-3">
                            <div className="aspect-square rounded-lg bg-white/[0.06] animate-pulse mb-3" />
                            <div className="h-3.5 bg-white/[0.06] rounded animate-pulse mb-2 w-4/5" />
                            <div className="h-3 bg-white/[0.04] rounded animate-pulse w-3/5" />
                        </div>
                    ))
                    : posts.map((post, i) => (
                        <Link
                            key={post.id}
                            href={`/events/${post.eventId}`}
                            className="block flex-shrink-0 w-[168px] sm:w-[180px]"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.04 }}
                                whileHover={{ scale: 1.02 }}
                                className="group p-3 rounded-xl hover:bg-white/[0.06] transition-colors duration-200"
                            >
                                <div className="relative aspect-square rounded-lg overflow-hidden bg-white/[0.06] mb-3">
                                    <img
                                        src={imageFor(post)}
                                        alt={post.event?.title ?? "Submission"}
                                        className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-75"
                                    />
                                    {/* Vote count badge */}
                                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                                        <span className="text-[10px] font-black text-white">
                                            {post._count?.votes ?? 0}
                                        </span>
                                    </div>
                                    {/* Status dot */}
                                    {post.event?.status === "voting" || post.event?.status === "posting" ? (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.4)]" />
                                    ) : null}
                                </div>

                                <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug mb-1">
                                    {post.event?.title ?? "Event"}
                                </h3>
                                <p className="text-xs text-white/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {timeAgo(post.createdAt)}
                                </p>
                            </motion.div>
                        </Link>
                    ))}
            </div>
        </section>
    );
}
