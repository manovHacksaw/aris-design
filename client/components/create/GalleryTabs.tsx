"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Heart, Clock, FileImage, Trash2, ChevronDown } from "lucide-react";
import { getUserSubmissions } from "@/services/user.service";
import { fetchDrafts, deleteDraftFromBackend, type UserDraft } from "@/services/draft.service";
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

type Tab = "posted" | "saved";

export default function GalleryTabs({ userId }: { userId?: string }) {
    const [activeTab, setActiveTab] = useState<Tab>("posted");
    const [open, setOpen] = useState(false);
    const [posts, setPosts] = useState<PostedSubmission[]>([]);
    const [drafts, setDrafts] = useState<UserDraft[]>([]);
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
        fetchDrafts().then(setDrafts).catch(() => {});
    }, []);

    const handleDeleteDraft = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        await deleteDraftFromBackend(id);
        setDrafts((prev) => prev.filter((d) => d.id !== id));
    };

    const hasPosts = !loadingPosts && posts.length > 0;
    const hasSaved = drafts.length > 0;
    if (!loadingPosts && !hasPosts && !hasSaved) return null;

    const totalCount = posts.length + drafts.length;

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: "posted", label: "Posted", count: posts.length },
        { key: "saved", label: "Saved", count: drafts.length },
    ];

    return (
        <section>
            {/* Collapsed header — always visible */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between group mb-1"
            >
                <div className="flex items-center gap-3">
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">
                        Your gallery
                    </p>
                    {totalCount > 0 && (
                        <span className="text-[10px] font-black text-white/15 uppercase tracking-widest">
                            {totalCount} item{totalCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-white/25 transition-transform duration-300",
                        open && "rotate-180"
                    )}
                />
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="gallery-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3">
                            {/* Tabs + Show all */}
                            <div className="flex items-end justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={cn(
                                                "relative pb-1.5 text-sm font-bold uppercase tracking-wide transition-colors",
                                                activeTab === tab.key
                                                    ? "text-foreground"
                                                    : "text-foreground/30 hover:text-foreground/50"
                                            )}
                                        >
                                            {tab.label}
                                            {tab.count > 0 && (
                                                <span className="ml-1.5 text-[10px] text-foreground/20">
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
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                        <div className="aspect-[4/5] rounded-xl bg-surface animate-pulse" />
                        <div className="h-3 bg-surface rounded animate-pulse w-3/4" />
                        <div className="h-2.5 bg-surface rounded animate-pulse w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-12 text-center rounded-2xl border border-dashed border-surface-border bg-surface">
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
                            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-surface mb-2">
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
                                    <span className="text-[9px] font-bold text-foreground">
                                        {post._count?.votes ?? 0}
                                    </span>
                                </div>
                                {/* Live dot */}
                                {(post.event?.status === "voting" ||
                                    post.event?.status === "posting") && (
                                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_4px_1px_rgba(163,230,53,0.4)]" />
                                    )}
                            </div>
                            <h3 className="text-[11px] font-semibold text-foreground line-clamp-1 leading-snug mb-0.5">
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

/* ──── Saved Grid ──── */

function DraftsGrid({
    drafts,
    onDelete,
}: {
    drafts: UserDraft[];
    onDelete: (e: React.MouseEvent, id: string) => void;
}) {
    if (drafts.length === 0) {
        return (
            <div className="py-12 text-center rounded-2xl border border-dashed border-surface-border bg-surface">
                <FileImage className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25 font-medium">
                    No saved images yet
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {drafts.map((draft, i) => (
                <div
                    key={draft.id}
                    className="block group"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        className="opacity-80 hover:opacity-100 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-surface mb-2">
                            {draft.imageUrl ? (
                                <img
                                    src={draft.imageUrl}
                                    alt={draft.prompt ?? "Saved image"}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <FileImage className="w-6 h-6 text-white/10" />
                                </div>
                            )}
                            {/* Delete button */}
                            <button
                                onClick={(e) => onDelete(e, draft.id)}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                            >
                                <Trash2 className="w-2.5 h-2.5 text-foreground/50" />
                            </button>
                        </div>
                        <h3 className="text-[11px] font-semibold text-foreground/70 line-clamp-1 leading-snug mb-0.5">
                            {draft.prompt ? `"${draft.prompt}"` : "Saved image"}
                        </h3>
                        <p className="text-[10px] text-foreground/20 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {timeAgo(draft.createdAt)}
                        </p>
                    </motion.div>
                </div>
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
