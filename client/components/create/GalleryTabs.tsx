"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart, Clock, FileImage, Trash2, ArrowRight } from "lucide-react";
import { getUserSubmissions } from "@/services/user.service";
import { getDrafts, deleteDraft, type SubmissionDraft } from "./DraftsSection";
import { cn } from "@/lib/utils";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

/* ──────── Types ──────── */

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

/* ──────── Helpers ──────── */

function imageFor(s: PostedSubmission) {
    if (s.imageUrl) return s.imageUrl;
    if (s.imageCid) return `${PINATA_GW}/${s.imageCid}`;
    if (s.event?.imageUrl) return s.event.imageUrl;
    if (s.event?.imageCid) return `${PINATA_GW}/${s.event.imageCid}`;
    return null;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m || 1}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7) return `${d}d ago`;
    return `${Math.floor(d / 7)}w ago`;
}

/* ──────── Component ──────── */

type Tab = "posted" | "drafts";

export default function GalleryTabs({ userId }: { userId?: string }) {
    const [activeTab, setActiveTab] = useState<Tab>("posted");
    const [posts, setPosts] = useState<PostedSubmission[]>([]);
    const [drafts, setDrafts] = useState<SubmissionDraft[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoadingPosts(false);
            return;
        }
        getUserSubmissions(userId)
            .then((data) => setPosts(data || []))
            .catch(() => { })
            .finally(() => setLoadingPosts(false));
    }, [userId]);

    useEffect(() => {
        setDrafts(getDrafts());
    }, []);

    const handleDeleteDraft = (e: React.MouseEvent, eventId: string) => {
        e.preventDefault();
        e.stopPropagation();
        deleteDraft(eventId);
        setDrafts(getDrafts());
    };

    const hasPosts = !loadingPosts && posts.length > 0;
    const hasDrafts = drafts.length > 0;
    if (!loadingPosts && !hasPosts && !hasDrafts) return null;

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: "posted", label: "Posted", count: posts.length },
        { key: "drafts", label: "Drafts", count: drafts.length },
    ];

    return (
        <section>
            {/* Header + Tabs */}
            <div className="flex items-end justify-between mb-4">
                <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                        Your gallery
                    </p>
                    <div className="flex items-center gap-4">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "relative pb-1.5 text-sm font-bold uppercase tracking-wide transition-colors",
                                    activeTab === tab.key
                                        ? "text-white"
                                        : "text-white/30 hover:text-white/50"
                                )}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className="ml-1.5 text-[10px] text-white/20">
                                        {tab.count}
                                    </span>
                                )}
                                {activeTab === tab.key && (
                                    <motion.div
                                        layoutId="gallery-tab-underline"
                                        className="absolute left-0 right-0 -bottom-px h-[2px] bg-lime-400 rounded-full"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                {activeTab === "posted" && hasPosts && (
                    <Link
                        href="/dashboard"
                        className="text-[10px] font-black text-[#A78BFA] hover:text-[#A78BFA]/80 uppercase tracking-[0.15em] transition-colors"
                    >
                        Show all
                    </Link>
                )}
            </div>

            {/* Content */}
            {activeTab === "posted" ? (
                <PostedGrid posts={posts} loading={loadingPosts} />
            ) : (
                <DraftsGrid drafts={drafts} onDelete={handleDeleteDraft} />
            )}
        </section>
    );
}

/* ──── Posted Grid ──── */

function PostedGrid({
    posts,
    loading,
}: {
    posts: PostedSubmission[];
    loading: boolean;
}) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="aspect-[4/5] rounded-xl bg-white/[0.04] animate-pulse" />
                        <div className="h-3 bg-white/[0.04] rounded animate-pulse w-3/4" />
                        <div className="h-2.5 bg-white/[0.03] rounded animate-pulse w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-12 text-center rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01]">
                <FileImage className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25 font-medium">
                    No posts yet — start creating!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {posts.slice(0, 8).map((post, i) => {
                const img = imageFor(post);
                return (
                    <Link
                        key={post.id}
                        href={`/events/${post.eventId}`}
                        className="block group"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.25 }}
                            className="hover:-translate-y-0.5 transition-transform duration-200"
                        >
                            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/[0.04] mb-2">
                                {img ? (
                                    <img
                                        src={img}
                                        alt={post.event?.title ?? "Submission"}
                                        className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-90"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <FileImage className="w-6 h-6 text-white/10" />
                                    </div>
                                )}
                                {/* Vote pill */}
                                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                                    <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                                    <span className="text-[9px] font-bold text-white">
                                        {post._count?.votes ?? 0}
                                    </span>
                                </div>
                                {/* Live dot */}
                                {(post.event?.status === "voting" ||
                                    post.event?.status === "posting") && (
                                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_4px_1px_rgba(163,230,53,0.4)]" />
                                    )}
                            </div>
                            <h3 className="text-[11px] font-semibold text-white line-clamp-1 leading-snug mb-0.5">
                                {post.event?.title ?? "Event"}
                            </h3>
                            <p className="text-[10px] text-white/25 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {timeAgo(post.createdAt)}
                            </p>
                        </motion.div>
                    </Link>
                );
            })}
        </div>
    );
}

/* ──── Drafts Grid ──── */

function DraftsGrid({
    drafts,
    onDelete,
}: {
    drafts: SubmissionDraft[];
    onDelete: (e: React.MouseEvent, eventId: string) => void;
}) {
    if (drafts.length === 0) {
        return (
            <div className="py-12 text-center rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01]">
                <FileImage className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25 font-medium">
                    No drafts saved
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {drafts.map((draft, i) => (
                <Link
                    key={draft.id}
                    href={`/events/${draft.eventId}`}
                    className="block group"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        className="opacity-60 hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/[0.04] mb-2">
                            {draft.imagePreview || draft.eventImage ? (
                                <img
                                    src={draft.imagePreview || draft.eventImage}
                                    alt={draft.eventTitle}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <FileImage className="w-6 h-6 text-white/10" />
                                </div>
                            )}
                            {/* Draft badge */}
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 backdrop-blur-sm">
                                <span className="text-[8px] font-black text-orange-400 uppercase tracking-wider">
                                    Draft
                                </span>
                            </div>
                            {/* Delete button */}
                            <button
                                onClick={(e) => onDelete(e, draft.eventId)}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                            >
                                <Trash2 className="w-2.5 h-2.5 text-white/50" />
                            </button>
                            {/* Continue overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                <div className="flex items-center gap-1 px-2.5 py-1 bg-white/90 rounded-full">
                                    <span className="text-[10px] font-black text-black">
                                        Continue
                                    </span>
                                    <ArrowRight className="w-2.5 h-2.5 text-black" />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-[11px] font-semibold text-white/70 line-clamp-1 leading-snug mb-0.5">
                            {draft.eventTitle || "Untitled"}
                        </h3>
                        <p className="text-[10px] text-white/20 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {timeAgo(draft.savedAt)}
                        </p>
                    </motion.div>
                </Link>
            ))}
        </div>
    );
}

function timeAgoShort(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m || 1}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}
