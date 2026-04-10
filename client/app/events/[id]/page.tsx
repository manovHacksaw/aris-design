"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Trophy, Users, ChevronLeft, Share2, ImageIcon, CheckCircle2, Loader2,
    AlertCircle, Info, Upload, PlusCircle, Vote, ChevronRight,
    Twitter, Instagram, Globe, ExternalLink, LayoutGrid, List, ThumbsUp, Coins,
    ShieldCheck, Tag, Sparkles, Wand2, RefreshCw, X, ZoomIn, Eye
} from "lucide-react";
import { calculateTotalPool } from "@/lib/eventUtils";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { VoteSubmission, PostSubmission, SubmissionStatus } from "@/types/events";
import { formatCount } from "@/lib/eventUtils";
import ModeBadge from "@/components/events/ModeBadge";
import StatusBadge from "@/components/events/StatusBadge";
import VoteSubmissionCard from "@/components/events/VoteSubmissionCard";
import PostSubmissionCard from "@/components/events/PostSubmissionCard";
import { getEventById, Event, voteForProposals } from "@/services/event.service";
import {
    getEventSubmissions,
    voteOnSubmission,
    createSubmission,
    Submission,
} from "@/services/submission.service";
import { uploadToPinata, validateImageFile } from "@/lib/pinata-upload";
import { generateAiImage, refineAiPrompt } from "@/services/ai.service";
import { generateImage, base64ToFile, base64ToObjectUrl } from "@/services/image-generation.service";
import { PinturaImageEditor } from "@/components/create/PinturaImageEditor";
import { useUser } from "@/context/UserContext";
import { useWallet } from "@/context/WalletContext";
import { useLoginModal } from "@/context/LoginModalContext";
import { useSocket } from "@/context/SocketContext";
import { toast } from "sonner";
import Countdown from "@/components/events/Countdown";
import { use } from "react";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function ExpandableDescription({ text, className }: { text: string; className?: string }) {
    const ref = useRef<HTMLParagraphElement>(null);
    const [truncated, setTruncated] = useState(false);
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (el) setTruncated(el.scrollHeight > el.clientHeight + 2);
    }, [text]);
    return (
        <div className="relative max-w-2xl">
            <p
                ref={ref}
                className={cn(className, !expanded && "line-clamp-2 md:line-clamp-3")}
            >
                {text}
            </p>
            {!expanded && truncated && (
                <>
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <button
                        onClick={() => setExpanded(true)}
                        className="text-[10px] text-white/35 hover:text-white/60 font-medium mt-0.5 transition-colors"
                    >
                        Read more
                    </button>
                </>
            )}
        </div>
    );
}

function BigCountdown({ targetDate }: { targetDate: string | Date }) {
    const target = useMemo(() => new Date(targetDate).getTime(), [targetDate]);
    const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target - Date.now()));

    useEffect(() => {
        const tick = () => setTimeLeft(Math.max(0, target - Date.now()));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [target]);

    const days = Math.floor(timeLeft / 86400000);
    const hours = Math.floor((timeLeft / 3600000) % 24);
    const minutes = Math.floor((timeLeft / 60000) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    const units = days > 0
        ? [{ v: days, l: "D" }, { v: hours, l: "H" }, { v: minutes, l: "M" }]
        : [{ v: hours, l: "H" }, { v: minutes, l: "M" }, { v: seconds, l: "S" }];

    if (timeLeft === 0) return <span className="text-4xl font-black text-white/40 uppercase tracking-widest">Ended</span>;

    return (
        <div className="flex items-baseline gap-4">
            {units.map(({ v, l }) => (
                <div key={l} className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-black text-white tabular-nums leading-none">
                        {String(v).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-black text-white/40 uppercase">{l}</span>
                </div>
            ))}
        </div>
    );
}

function imgUrl(imageUrl?: string | null, cid?: string | null): string | undefined {
    if (imageUrl) return imageUrl;
    if (cid) return `${PINATA_GW}/${cid}`;
    return undefined;
}

function ParticipantAvatars({ avatars = [], totalCount, onShowAll }: { avatars?: { id: string; avatarUrl: string | null }[]; totalCount: number; onShowAll?: () => void }) {
    const MAX = 4;
    const shown = avatars.slice(0, MAX);
    const overflow = totalCount > shown.length ? totalCount - shown.length : 0;

    if (totalCount === 0) return null;

    return (
        <button
            type="button"
            onClick={onShowAll}
            className="flex items-center ml-2 group/avatars cursor-pointer"
            title="View all participants"
        >
            <div className="flex -space-x-3 group-hover/avatars:space-x-[-10px] transition-all">
                {shown.map((p: any, i: number) => (
                    <div
                        key={p.id}
                        className="relative w-9 h-9 rounded-full border-2 border-zinc-950 bg-zinc-900 ring-1 ring-white/10 overflow-hidden shrink-0 transition-transform group-hover/avatars:scale-105"
                        style={{ zIndex: 10 + (MAX - i) }}
                    >
                        {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt="participant" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/15 flex items-center justify-center">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-tighter">?</span>
                            </div>
                        )}
                    </div>
                ))}
                {overflow > 0 && (
                    <div className="relative w-9 h-9 rounded-full border-2 border-zinc-950 bg-zinc-900 ring-1 ring-white/10 flex items-center justify-center shrink-0 z-0 group-hover/avatars:bg-zinc-800 transition-colors">
                        <span className="text-[10px] font-black text-white/60 tracking-tighter">+{overflow}</span>
                    </div>
                )}
            </div>
        </button>
    );
}

function avatarUrl(_: unknown, name?: string | null): string {
    const n = encodeURIComponent(name || "User");
    return `https://ui-avatars.com/api/?name=${n}&background=2F6AFF&color=fff`;
}

function toVoteSubmission(sub: Submission, currentUserId?: string | null): VoteSubmission {
    const displayName = sub.user?.displayName || sub.user?.username || "Creator";
    return {
        id: sub.id,
        creator: {
            name: displayName,
            avatar: sub.user?.avatarUrl || avatarUrl(undefined, displayName),
            handle: sub.user?.username || "user",
        },
        media: sub.imageUrl || (sub.imageCid ? `${PINATA_GW}/${sub.imageCid}` : ""),
        mediaType: (!sub.imageUrl && !sub.imageCid) ? "text" : "image",
        textContent: (sub as any).caption || sub.content,
        voteCount: sub._count?.votes ?? 0,
        rank: sub.rank,
        isOwn: sub.userId === currentUserId,
    };
}

function toPostSubmission(sub: Submission, currentUserId?: string | null): PostSubmission {
    const votes = sub._count?.votes ?? 0;
    const status: SubmissionStatus =
        sub.rank === 1 ? "winning" : sub.rank && sub.rank <= 3 ? "ranked" : "eligible";
    const displayName = sub.user?.displayName || sub.user?.username || "Creator";
    return {
        id: sub.id,
        creator: {
            name: displayName,
            avatar: sub.user?.avatarUrl || avatarUrl(undefined, displayName),
            handle: sub.user?.username || "user",
        },
        media: sub.imageUrl || (sub.imageCid ? `${PINATA_GW}/${sub.imageCid}` : ""),
        textContent: sub.content,
        voteCount: votes,
        rank: sub.rank ?? undefined,
        status,
        isOwn: sub.userId === currentUserId,
        engagementStats: { views: 0, shares: 0 },
    };
}

function mapVoteOnlyProposalsToSubmissions(event: Event): Submission[] {
    return (event.proposals || []).map((p) => ({
        id: p.id,
        userId: event.brandId,
        eventId: event.id,
        imageCid: p.imageCid,
        imageUrl: p.imageUrl,
        content: p.title + (p.content ? `\n${p.content}` : ""),
        user: {
            id: event.brandId,
            username: event.brand?.name || "brand",
            displayName: event.brand?.name || "Brand",
            avatarUrl: event.brand?.logoUrl || (event.brand?.logoCid ? `${PINATA_GW}/${event.brand.logoCid}` : undefined),
        },
        _count: { votes: p.voteCount || 0 },
        rank: p.finalRank,
        createdAt: event.createdAt,
        updatedAt: event.createdAt,
    }));
}

function deriveSubmissionsFromEvent(event: Event): Submission[] {
    if (!(event.status === "posting" || event.status === "voting" || event.status === "completed")) {
        return [];
    }

    if (event.eventType === "post_and_vote") {
        return event.submissions || [];
    }

    return mapVoteOnlyProposalsToSubmissions(event);
}

// ─── Social link helpers ─────────────────────────────────────────────────────

const SOCIAL_SLOTS = [
    { key: "twitter", label: "Twitter", icon: <Twitter className="w-3.5 h-3.5" /> },
    { key: "instagram", label: "Instagram", icon: <Instagram className="w-3.5 h-3.5" /> },
    { key: "website", label: "Website", icon: <Globe className="w-3.5 h-3.5" /> },
];

function SocialLinks({ links, eventId }: { links?: Record<string, string>; eventId?: string }) {
    const trackLink = (platform: string) => {
        if (!eventId) return;
        fetch(`/api/analytics/events/${eventId}/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: platform === 'website' ? 'website' : 'social', platform }),
        }).catch(() => { });
    };

    return (
        <div className="pt-3 border-t border-white/[0.06] mt-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30 mb-2.5">Brand Links</p>
            <div className="flex gap-2">
                {SOCIAL_SLOTS.map(({ key, label, icon }) => {
                    const url = links?.[key];
                    return url ? (
                        <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={label}
                            onClick={() => trackLink(key)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-foreground/60 hover:text-foreground hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                        >
                            {icon}
                            <span className="text-[9px] font-black uppercase tracking-wider hidden sm:block">{label}</span>
                        </a>
                    ) : (
                        <div
                            key={key}
                            title={`${label} not linked`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-foreground/20 cursor-not-allowed"
                        >
                            {icon}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function EventSidebar({
    event,
    participantCount,
    mode,
    votedSubmissionId,
    votedSub,
    hasSubmitted,
    mySubmission,
    file,
    preview,
    caption,
    submitting,
    fileRef,
    onFileChange,
    onSubmit,
    onCaptionChange,
    isBrand,
}: {
    event: Event;
    participantCount: number;
    mode: "post" | "vote" | "completed" | "upcoming";
    votedSubmissionId?: string | null;
    votedSub?: Submission | null;
    hasSubmitted?: boolean;
    mySubmission?: Submission | null;
    file?: File | null;
    isBrand?: boolean;
    preview?: string | null;
    caption?: string;
    submitting?: boolean;
    fileRef?: React.RefObject<HTMLInputElement | null>;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit?: () => void;
    onCaptionChange?: (v: string) => void;
}) {
    const targetDate = event.status === "posting" ? event.postingEnd! : event.endTime;
    const socialLinks = (event.brand as any)?.socialLinks as Record<string, string> | undefined;
    const topReward = event.topReward ?? event.leaderboardPool ?? 0;
    const leaderboardPool = event.leaderboardPool ?? 0;

    return (
        <div className="space-y-4">
            {/* ── Rewards card ── */}
            {mode === "vote" || (mode === "completed" && event.eventType === "vote_only") ? (
                /* ── Vote-only flat card ── */
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                    <div className="mb-4">
                        <span className="text-sm font-black text-foreground">Reward Breakdown</span>
                    </div>
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between bg-sky-400/5 border border-sky-400/15 rounded-[12px] px-3 py-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-sky-400/70 mb-0.5">You Vote</p>
                                <p className="text-[11px] text-foreground/60 leading-tight">Per vote you cast in this event</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                <p className="text-base font-black text-sky-400">${(event.baseReward ?? 0.03).toFixed(2)}</p>
                                <p className="text-[9px] text-foreground/40">USDC</p>
                            </div>
                        </div>
                        {topReward > 0 && (
                            <div className="flex items-center justify-between bg-[#A78BFA]/5 border border-[#A78BFA]/15 rounded-[12px] px-3 py-3">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]/70 mb-0.5">Top Reward</p>
                                    <p className="text-[11px] text-foreground/60 leading-tight">Divided among voters of winning content</p>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <p className="text-base font-black text-[#A78BFA]">${topReward.toLocaleString()}</p>
                                    <p className="text-[9px] text-foreground/40">USDC</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {mode === "vote" && (
                        <div className="border-t border-border/40 pt-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-foreground/35 mb-3">How to Earn</p>
                            <ol className="space-y-2.5">
                                {[
                                    "Browse submissions in the grid below.",
                                    "Tap the thumbs-up on your favourite entry to vote.",
                                    "Earn $" + (event.baseReward ?? "0.03") + " USDC automatically for every valid vote.",
                                    "Top voters on the winning entry share the top reward.",
                                ].map((step, i) => (
                                    <li key={i} className="flex gap-2.5 text-[11px] text-foreground/55">
                                        <span className="w-4 h-4 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 bg-sky-400/10 text-sky-400">
                                            {i + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {/* Earnings for completed vote_only */}
                    {mode === "completed" && votedSubmissionId && (
                        <div className="border-t border-border/40 pt-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-foreground/35 mb-3">Your Earnings</p>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-foreground/55">From voting</span>
                                    <span className="text-[11px] font-black text-sky-400">${(event.baseReward ?? 0.03).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1.5 border-t border-border/30 mt-1">
                                    <span className="text-[11px] font-black text-foreground/70">Total Earned</span>
                                    <span className="text-sm font-black text-white">${(event.baseReward ?? 0.03).toFixed(2)} USDC</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : mode === "completed" && event.eventType === "post_and_vote" ? (
                /* ── Post+Vote completed flat card ── */
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                    <div className="mb-4">
                        <span className="text-sm font-black text-foreground">Reward Breakdown</span>
                    </div>
                    <div className="space-y-2 mb-4">
                        {/* You post */}
                        <div className="flex items-center justify-between bg-lime-400/5 border border-lime-400/15 rounded-[12px] px-3 py-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-lime-400/70 mb-0.5">You Post</p>
                                <p className="text-[11px] text-foreground/60 leading-tight">Per vote received on your post</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                <p className="text-base font-black text-lime-400">$0.05</p>
                                <p className="text-[9px] text-foreground/40">USDC</p>
                            </div>
                        </div>
                        {/* You vote */}
                        <div className="flex items-center justify-between bg-sky-400/5 border border-sky-400/15 rounded-[12px] px-3 py-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-sky-400/70 mb-0.5">You Vote</p>
                                <p className="text-[11px] text-foreground/60 leading-tight">Per vote you cast in this event</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                <p className="text-base font-black text-sky-400">$0.03</p>
                                <p className="text-[9px] text-foreground/40">USDC</p>
                            </div>
                        </div>
                        {/* Leaderboard pool */}
                        {leaderboardPool > 0 && (() => {
                            const p1 = leaderboardPool * 0.50;
                            const p2 = leaderboardPool * 0.35;
                            const p3 = leaderboardPool * 0.15;
                            return (
                                <div className="border border-white/[0.08] rounded-[12px] px-3 py-3 space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Leaderboard Rewards</p>
                                    <p className="text-[10px] text-foreground/35">Top 3 creators ranked by votes received</p>
                                    {[
                                        { emoji: "🥇", label: "1st place", amount: p1 },
                                        { emoji: "🥈", label: "2nd place", amount: p2 },
                                        { emoji: "🥉", label: "3rd place", amount: p3 },
                                    ].map((row) => (
                                        <div key={row.label} className="flex items-center justify-between">
                                            <span className="text-[11px] text-foreground/60">{row.emoji} {row.label}</span>
                                            <span className="text-[11px] font-black text-foreground/80">${row.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                    {/* Your Earnings */}
                    {(mySubmission || votedSubmissionId) && (() => {
                        const postEarnings = (mySubmission?._count?.votes ?? 0) * 0.05;
                        const voteEarnings = votedSubmissionId ? 0.03 : 0;
                        const total = postEarnings + voteEarnings;
                        return (
                            <div className="border-t border-border/40 pt-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-foreground/35 mb-3">Your Earnings</p>
                                <div className="space-y-1.5">
                                    {mySubmission && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-foreground/55">From your post ({mySubmission._count?.votes ?? 0} votes)</span>
                                            <span className="text-[11px] font-black text-lime-400">${postEarnings.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {votedSubmissionId && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-foreground/55">From voting</span>
                                            <span className="text-[11px] font-black text-sky-400">$0.03</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-1.5 border-t border-border/30 mt-1">
                                        <span className="text-[11px] font-black text-foreground/70">Total Earned</span>
                                        <span className="text-sm font-black text-white">${total.toFixed(2)} USDC</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            ) : (
                /* ── Non-vote mode: hero card (completed / upcoming) ── */
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] overflow-hidden">
                    <div className="relative bg-gradient-to-br from-[#A78BFA]/15 via-[#A78BFA]/8 to-transparent border-b border-white/[0.07] p-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="w-4 h-4 text-[#A78BFA]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#A78BFA]">Rewards Pool</span>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-foreground/35 mb-1">Total Prizes</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-4xl font-black text-white leading-none">${calculateTotalPool(event).toLocaleString()}</p>
                                    <span className="text-xs font-black text-foreground/40">USDC</span>
                                </div>
                            </div>
                            <span className="text-[9px] bg-[#A78BFA]/15 text-[#A78BFA] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#A78BFA]/25">
                                Guaranteed
                            </span>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="space-y-2">
                            {topReward > 0 && (
                                <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.07] rounded-[12px] px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0">
                                            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-foreground">Grand Prize</p>
                                            <p className="text-[9px] text-foreground/40 font-medium">#1 on leaderboard</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-yellow-400">${topReward.toLocaleString()}</p>
                                        <p className="text-[9px] text-foreground/40">USDC</p>
                                    </div>
                                </div>
                            )}
                            {leaderboardPool > 0 && (
                                <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.07] rounded-[12px] px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center shrink-0">
                                            <Users className="w-3.5 h-3.5 text-[#A78BFA]" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-foreground">Leaderboard Pool</p>
                                            <p className="text-[9px] text-foreground/40 font-medium">Split among top voters</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-[#A78BFA]">${leaderboardPool.toLocaleString()}</p>
                                        <p className="text-[9px] text-foreground/40">USDC</p>
                                    </div>
                                </div>
                            )}
                            {event.baseReward != null && event.baseReward > 0 && (
                                <div className="flex items-center justify-between bg-lime-400/6 border border-lime-400/15 rounded-[12px] px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
                                            <Coins className="w-3.5 h-3.5 text-lime-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-lime-400">Per Vote</p>
                                            <p className="text-[9px] text-foreground/40 font-medium">Every vote earns you this</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-lime-400">${event.baseReward}</p>
                                        <p className="text-[9px] text-foreground/40">USDC</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {mode === "post" && !hasSubmitted && fileRef && !isBrand && (
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-[24px] overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-border/30 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <PlusCircle className="w-3.5 h-3.5 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-foreground">Post Your Entry</h3>
                            <p className="text-[10px] text-foreground/40 font-medium">Upload your image to enter</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        <div
                            onClick={() => fileRef.current?.click()}
                            className={cn(
                                "relative border-2 border-dashed rounded-[16px] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
                                preview ? "border-orange-500/30 h-[180px]" : "border-border/40 hover:border-orange-500/40 h-[120px]"
                            )}
                        >
                            {preview ? (
                                <>
                                    <img src={preview} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <span className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black text-white">Change</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 p-4 text-center">
                                    <Upload className="w-5 h-5 text-foreground/30" />
                                    <p className="text-xs font-black text-foreground/50">Drop image or click</p>
                                    <p className="text-[9px] text-foreground/20 uppercase tracking-widest font-bold">JPEG · PNG · max 5 MB</p>
                                </div>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={onFileChange} />
                        <textarea
                            value={caption}
                            onChange={(e) => onCaptionChange?.(e.target.value)}
                            placeholder="Caption… (optional)"
                            rows={2}
                            maxLength={280}
                            className="w-full bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-foreground/30 resize-none focus:outline-none focus:border-orange-500/50 transition-colors"
                        />
                        <button
                            onClick={onSubmit}
                            disabled={!file || submitting}
                            className="w-full py-3.5 bg-foreground text-background rounded-[14px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-30"
                        >
                            {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5" /> Submit Entry</>}
                        </button>
                    </div>
                </div>
            )}

            {mode === "post" && hasSubmitted && !isBrand && (
                <div className="bg-orange-500/8 border border-orange-500/25 rounded-[20px] p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-orange-500/15 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-foreground">Entry submitted!</p>
                        <p className="text-xs text-foreground/50 mt-0.5">Voting starts when posting ends.</p>
                    </div>
                    {(mySubmission?.imageUrl || mySubmission?.imageCid) && (
                        <img
                            src={mySubmission.imageUrl || `${PINATA_GW}/${mySubmission.imageCid}`}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-orange-500/30"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
    const resolvedParams = use(params as any);
    const id = (resolvedParams as { id: string }).id;
    const { user } = useUser();
    const { isAuthenticated } = useWallet();
    const { openLoginModal } = useLoginModal();
    const { socket } = useSocket();

    const [event, setEvent] = useState<Event | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [votedSubmissionId, setVotedSubmissionId] = useState<string | null>(null);
    const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
    const [optimisticVoteDelta, setOptimisticVoteDelta] = useState<string | null>(null);
    const [previewSubmissionId, setPreviewSubmissionId] = useState<string | null>(null);

    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [mySubmission, setMySubmission] = useState<Submission | null>(null);
    const [participantCount, setParticipantCount] = useState<number>(0);
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    // Tracks whether we've already applied an optimistic +1 for the current user's vote,
    // so the echoed socket broadcast doesn't double-count it.
    const optimisticParticipantPending = useRef(false);

    // Post submission form state (lifted up so sidebar can use it)
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [caption, setCaption] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [pinturaOpen, setPinturaOpen] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // AI generation state
    const [uploadMode, setUploadMode] = useState<"upload" | "ai">("upload");
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiRefining, setAiRefining] = useState(false);
    const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
    const [aiImageFile, setAiImageFile] = useState<File | null>(null);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    useEffect(() => {
        document.body.style.overflow = submitModalOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [submitModalOpen]);
    const [showFullRules, setShowFullRules] = useState(false);

    const [gridView, setGridView] = useState(true);

    useEffect(() => {
        if (!socket || !id) return;
        socket.emit("join-event", id);
        const handleVoteUpdate = ({ submissionId, delta }: { submissionId: string; delta: number }) => {
            setSubmissions((subs) => subs.map((s) => s.id === submissionId ? { ...s, _count: { votes: (s._count?.votes ?? 0) + delta } } : s));
            setOptimisticVoteDelta((prev) => (prev === submissionId ? null : prev));
        };
        const handleParticipantUpdate = ({ delta }: { delta: number }) => {
            if (optimisticParticipantPending.current) {
                optimisticParticipantPending.current = false;
                // Already counted optimistically — skip the echo
            } else {
                setParticipantCount((c) => c + delta);
            }
        };
        socket.on("vote-update", handleVoteUpdate);
        socket.on("participant-update", handleParticipantUpdate);
        return () => {
            socket.emit("leave-event", id);
            socket.off("vote-update", handleVoteUpdate);
            socket.off("participant-update", handleParticipantUpdate);
        };
    }, [socket, id]);


    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setFetchError(null);
                const publicEvent = await getEventById(id, { skipAuth: true });
                setEvent(publicEvent);
                setParticipantCount((publicEvent as any).totalParticipants ?? publicEvent._count?.votes ?? 0);
                setSubmissions(deriveSubmissionsFromEvent(publicEvent));
                setVotedSubmissionId(null);
                setHasSubmitted(false);
                setMySubmission(null);

                if (publicEvent.eventType === "post_and_vote") {
                    try {
                        const res = await getEventSubmissions(id, { sortBy: "votes", limit: 50 });
                        setSubmissions(res.submissions);
                    } catch (submissionError) {
                        console.error("Failed to refresh event submissions:", submissionError);
                    }
                }

                if (user?.id) {
                    try {
                        const authedEvent = await getEventById(id, { noCache: true });
                        setEvent(authedEvent);
                        setParticipantCount((prev) => prev || authedEvent._count?.votes || 0);
                        setSubmissions((current) => {
                            if (current.length > 0 && authedEvent.eventType === "post_and_vote") {
                                return current;
                            }
                            return deriveSubmissionsFromEvent(authedEvent);
                        });

                        if (authedEvent.hasVoted && authedEvent.userVotes?.length) {
                            const vote = authedEvent.userVotes[0];
                            setVotedSubmissionId(vote.submissionId || vote.proposalId || null);
                        } else {
                            setVotedSubmissionId(null);
                        }

                        if (authedEvent.hasSubmitted) {
                            setHasSubmitted(true);
                            setMySubmission((authedEvent.userSubmission as Submission) || null);
                        } else {
                            setHasSubmitted(false);
                            setMySubmission(null);
                        }
                    } catch (authRefreshError) {
                        console.error("Failed to refresh personalized event state:", authRefreshError);
                    }
                }
            } catch (err: any) {
                // Only surface the error if we have no event data yet.
                // The effect re-runs when user?.id resolves; a timeout on that
                // second fetch should not wipe the already-loaded content.
                setEvent((prev) => {
                    if (!prev) setFetchError(err?.message ?? "Failed to load event");
                    return prev;
                });
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id, user?.id]);

    // Step 1: select a submission (sets pending state only)
    const handleVote = useCallback((submissionId: string) => {
        if (!isAuthenticated) { openLoginModal(); return; }
        if (!event || votedSubmissionId || isVotingEnded) return;
        const sub = submissions.find((s) => s.id === submissionId);
        if (!sub) return;
        if (sub.userId === user?.id && event.eventType !== "vote_only") { toast.error("You can't vote for your own submission."); return; }
        // Toggle off if clicking the already-pending card
        setPendingVoteId((prev) => (prev === submissionId ? null : submissionId));
    }, [event, submissions, user?.id, votedSubmissionId, isAuthenticated, openLoginModal]);

    // Step 2: confirm the pending vote (fires the API)
    const handleConfirmVote = useCallback(async () => {
        if (!pendingVoteId || !event) return;
        const confirmingId = pendingVoteId;
        // Optimistic: immediately lock voted state + increment counts
        setOptimisticVoteDelta(confirmingId);
        setVotedSubmissionId(confirmingId);
        setPendingVoteId(null);
        optimisticParticipantPending.current = true;
        setParticipantCount((c) => c + 1);
        try {
            if (event.eventType === "vote_only") await voteForProposals(event.id, [confirmingId]);
            else await voteOnSubmission(event.id, confirmingId);
            setPreviewSubmissionId(null);
            try {
                const confetti = (await import("canvas-confetti")).default;
                confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: ["#84cc16", "#a3e635", "#3B82F6", "#ffffff"] });
            } catch { }
        } catch (err: any) {
            // Roll back optimistic updates
            setOptimisticVoteDelta(null);
            setVotedSubmissionId(null);
            optimisticParticipantPending.current = false;
            setParticipantCount((c) => c - 1);
            toast.error(err?.message ?? "Failed to record vote.");
        }
    }, [pendingVoteId, event]);

    const handleCancelVote = useCallback(() => setPendingVoteId(null), []);

    const handleShareSubmission = useCallback(async (submissionId: string) => {
        const shareUrl = `${window.location.origin}/events/${id}?submission=${submissionId}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: event?.title || "Aris Event", url: shareUrl });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Submission link copied");
            }
        } catch {
            // user cancelled share
        }
    }, [id, event?.title]);

    const handleSelectedFile = (f: File | null | undefined) => {
        if (!f) return;
        const validation = validateImageFile(f);
        if (!validation.valid) { toast.error(validation.error); return; }
        if (preview) URL.revokeObjectURL(preview);
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleSelectedFile(e.target.files?.[0]);
    };

    const handleSubmit = async () => {
        if (!isAuthenticated) { openLoginModal(); return; }
        if (!file && !aiImageFile) { toast.error("Please select or generate an image."); return; }
        setSubmitting(true);
        try {
            let imageUrl: string;
            const uploadFile = aiImageFile ?? file!;
            const res = await uploadToPinata(uploadFile);
            imageUrl = res.imageUrl;
            const sub = await createSubmission({ eventId: event!.id, imageUrl, caption: caption.trim() || undefined });
            toast.success("Submission uploaded!");
            setHasSubmitted(true);
            setMySubmission(sub);
            setSubmissions((prev) => [sub, ...prev]);
        } catch (err: any) {
            toast.error(err?.message ?? "Submission failed.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) { toast.error("Enter a prompt first."); return; }
        if (!isAuthenticated) { openLoginModal(); return; }
        setAiGenerating(true);
        // Revoke previous object URL to avoid memory leaks
        if (aiImageUrl && aiImageUrl.startsWith("blob:")) URL.revokeObjectURL(aiImageUrl);
        try {
            const res = await generateImage(aiPrompt.trim(), user!.id, "user");
            if (res.success && res.image) {
                const objectUrl = base64ToObjectUrl(res.image.data, res.image.mimeType);
                const imgFile = base64ToFile(res.image.data, res.image.mimeType, `ai-generated-${Date.now()}.png`);
                setAiImageUrl(objectUrl);
                setAiImageFile(imgFile);
                setPreview(objectUrl);
                setFile(null);
                setSubmitModalOpen(true);
                if (res.remainingGenerations !== undefined) {
                    toast.success(`Image generated! ${res.remainingGenerations} generation${res.remainingGenerations === 1 ? "" : "s"} left today.`);
                }
            } else {
                toast.error(res.error || "Image generation failed. Please try again.");
            }
        } catch (err: any) {
            toast.error(err?.message ?? "Generation failed.");
        } finally {
            setAiGenerating(false);
        }
    };

    const handleRefinePrompt = async () => {
        if (!aiPrompt.trim()) return;
        setAiRefining(true);
        try {
            const res = await refineAiPrompt(aiPrompt.trim());
            if (res.success && res.refinedPrompt) setAiPrompt(res.refinedPrompt);
        } catch {
            // silent
        } finally {
            setAiRefining(false);
        }
    };

    const coverUrl = imgUrl(event?.imageUrl, event?.imageCid) ?? "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop";

    const enrichedSubmissions = submissions.map((sub) => ({
        ...sub,
        _count: { votes: (sub._count?.votes ?? 0) + (optimisticVoteDelta === sub.id ? 1 : 0) },
    }));
    // participantCount is tracked as state — initialized from event._count.votes,
    // updated optimistically on vote confirm and via 'participant-update' socket event.

    const votedSub = votedSubmissionId ? enrichedSubmissions.find((s) => s.id === votedSubmissionId) : null;
    const previewSub = previewSubmissionId ? enrichedSubmissions.find((s) => s.id === previewSubmissionId) : null;

    const isBrand = user?.role === "BRAND_OWNER";

    // Treat event as ended if status is completed OR the end time has already passed
    const isVotingEnded = !event ? false :
        event.status === "completed" || new Date() > new Date(event.endTime);

    const isCancelled = !!event?.description?.startsWith("[System]: Cancelled");
    const cancelReason = isCancelled
        ? (event!.description!.replace(/^\[System\]: Cancelled:\s*/i, "") || "Not enough posts to proceed.")
        : null;

    const displayMode: "post" | "vote" | "completed" | "upcoming" =
        isVotingEnded ? "completed"
            : event?.status === "posting" ? "post"
                : event?.status === "voting" || event?.eventType === "vote_only" ? "vote"
                    : "upcoming";

    const sortedSubmissions = [...enrichedSubmissions].sort((a, b) => {
        // Voted submission always first
        if (a.id === votedSubmissionId) return -1;
        if (b.id === votedSubmissionId) return 1;
        return (b._count?.votes || 0) - (a._count?.votes || 0);
    });
    const postingTopReward = event ? (event.topReward ?? event.leaderboardPool ?? 0) : 0;
    const recentPostingSubmissions = sortedSubmissions.slice(0, 6);

    const pendingSub = pendingVoteId ? enrichedSubmissions.find((s) => s.id === pendingVoteId) : null;

    const participantAvatars: Array<{ id: string; avatarUrl: string | null; username: string; displayName: string | null }> = (event as any)?.participantAvatars ?? [];

    return (
        <SidebarLayout>
            {/* ── Participants Modal ── */}
            <AnimatePresence>
                {showParticipantsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowParticipantsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-[#0e0e10] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Participants</h3>
                                    <p className="text-[11px] text-white/40 font-medium mt-0.5">{participantCount.toLocaleString()} total</p>
                                </div>
                                <button
                                    onClick={() => setShowParticipantsModal(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 text-white/60" />
                                </button>
                            </div>
                            <div className="p-4 max-h-[360px] overflow-y-auto no-scrollbar space-y-2">
                                {participantAvatars.length > 0 ? (
                                    participantAvatars.map((p) => (
                                        <Link 
                                            href={`/profile/${p.username}`}
                                            key={p.id} 
                                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors group/p"
                                            onClick={() => setShowParticipantsModal(false)}
                                        >
                                            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shrink-0 group-hover/p:border-primary/50 transition-colors">
                                                {p.avatarUrl ? (
                                                    <img src={p.avatarUrl} alt="participant" className="w-full h-full object-cover px-0" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Users className="w-4 h-4 text-white/20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-bold text-white/80 truncate group-hover/p:text-primary transition-colors">
                                                    {p.displayName || p.username}
                                                </p>
                                                <p className="text-[10px] text-white/30 truncate">@{p.username}</p>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover/p:text-primary/50 transition-colors" />
                                        </Link>
                                    ))
                                ) : (
                                    <div className="py-8 text-center">
                                        <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
                                        <p className="text-[11px] text-white/30 font-medium">No participant details available</p>
                                    </div>
                                )}
                                {participantCount > participantAvatars.length && (
                                    <div className="pt-2 text-center">
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider">
                                            +{(participantCount - participantAvatars.length).toLocaleString()} more participants
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Floating Confirm Vote Bar ── */}
            <AnimatePresence>
                {pendingVoteId && !votedSubmissionId && !isVotingEnded && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-background/90 backdrop-blur-xl border border-lime-400/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[320px] max-w-[480px]"
                    >
                        {/* Thumbnail */}
                        {pendingSub && (pendingSub.imageUrl || pendingSub.imageCid) && (
                            <img
                                src={pendingSub.imageUrl || `${PINATA_GW}/${pendingSub.imageCid}`}
                                className="w-10 h-10 rounded-xl object-cover border border-lime-400/30 shrink-0"
                            />
                        )}
                        {/* Label */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-foreground">Confirm your vote</p>
                            <p className="text-[10px] text-foreground/40 font-medium truncate">
                                @{pendingSub?.user?.username || "this entry"} · you can only vote once
                            </p>
                        </div>
                        {/* Cancel */}
                        <button
                            onClick={handleCancelVote}
                            className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-foreground/40 hover:text-foreground hover:bg-white/[0.06] transition-all shrink-0"
                        >
                            Cancel
                        </button>
                        {/* Confirm CTA */}
                        <button
                            onClick={handleConfirmVote}
                            className="flex items-center gap-1.5 px-4 py-2 bg-lime-400 hover:bg-lime-300 rounded-xl text-[11px] font-black uppercase tracking-wider text-black transition-all active:scale-[0.97] shrink-0"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirm Vote
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Fullscreen submission preview ── */}
            <AnimatePresence>
                {previewSub && event && (() => {
                    const previewIdx = sortedSubmissions.findIndex(s => s.id === previewSub.id);
                    const hasPrev = previewIdx > 0;
                    const hasNext = previewIdx < sortedSubmissions.length - 1;
                    const goTo = (idx: number) => setPreviewSubmissionId(sortedSubmissions[idx].id);
                    return (
                        <motion.div
                            key="submission-preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
                            onClick={() => setPreviewSubmissionId(null)}
                            onKeyDown={(e) => {
                                if (e.key === "ArrowLeft" && hasPrev) goTo(previewIdx - 1);
                                if (e.key === "ArrowRight" && hasNext) goTo(previewIdx + 1);
                                if (e.key === "Escape") setPreviewSubmissionId(null);
                            }}
                            tabIndex={-1}
                            ref={(el) => el?.focus()}
                        >
                            <button type="button" onClick={() => setPreviewSubmissionId(null)}
                                className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                                <X className="w-4 h-4" />
                            </button>

                            {/* Prev */}
                            {hasPrev && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); goTo(previewIdx - 1); }}
                                    className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            {/* Next */}
                            {hasNext && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); goTo(previewIdx + 1); }}
                                    className="absolute right-16 md:right-20 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}

                            {/* Counter */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 border border-white/10" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[11px] font-black text-white/50">{previewIdx + 1} / {sortedSubmissions.length}</span>
                            </div>

                            <div className="w-full max-w-[960px] flex flex-col md:flex-row gap-6 items-center md:items-stretch h-[90vh]" onClick={(e) => e.stopPropagation()}>
                                {/* Image */}
                                <div className="flex-1 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={previewSub.imageUrl || `${PINATA_GW}/${previewSub.imageCid}`}
                                        alt="Submission preview"
                                        className="max-w-full max-h-full object-contain rounded-[18px] border border-white/15"
                                    />
                                </div>

                                {/* Details panel */}
                                <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-3">
                                    {/* Caption */}
                                    {previewSub.content && (
                                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[16px] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Caption</p>
                                            <p className="text-sm text-white/80 leading-relaxed">{previewSub.content}</p>
                                        </div>
                                    )}

                                    {/* Guaranteed reward */}
                                    {(event.baseReward ?? 0) > 0 && (
                                        <div className="bg-lime-400/8 border border-lime-400/20 rounded-[16px] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-lime-400/60 mb-1">Vote & Earn</p>
                                            <p className="text-2xl font-black text-lime-400">${event.baseReward?.toFixed(2)}</p>
                                            <p className="text-[11px] text-white/40 mt-0.5">Guaranteed per vote, paid on completion</p>
                                        </div>
                                    )}

                                    {/* Top prize */}
                                    {(event.topReward ?? event.leaderboardPool ?? 0) > 0 && (
                                        <div className="bg-[#A78BFA]/8 border border-[#A78BFA]/20 rounded-[16px] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#A78BFA]/60 mb-1">Top Prize Pool</p>
                                            <p className="text-2xl font-black text-[#A78BFA]">${(event.topReward ?? event.leaderboardPool ?? 0).toFixed(2)}</p>
                                            <p className="text-[11px] text-white/40 mt-0.5 leading-snug">
                                                If this entry wins most votes, you become eligible for the grand prize
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="mt-auto flex flex-col gap-2 pt-1">
                                        {!votedSubmissionId && !(event.eventType !== "vote_only" && previewSub.userId === user?.id) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleVote(previewSub.id);
                                                    setPreviewSubmissionId(null);
                                                }}
                                                className="w-full py-3.5 rounded-[14px] bg-lime-400 text-black text-sm font-black uppercase tracking-widest hover:bg-lime-300 transition-colors"
                                            >
                                                Vote for This
                                            </button>
                                        )}
                                        {votedSubmissionId === previewSub.id && (
                                            <div className="w-full py-3.5 rounded-[14px] bg-lime-400/15 border border-lime-400/30 flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-lime-400" />
                                                <span className="text-sm font-black text-lime-400 uppercase tracking-widest">Voted</span>
                                            </div>
                                        )}
                                        {votedSubmissionId && votedSubmissionId !== previewSub.id && (
                                            <div className="w-full py-3.5 rounded-[14px] bg-white/5 border border-white/10 text-center">
                                                <span className="text-xs font-black text-white/30 uppercase tracking-widest">Vote already cast</span>
                                            </div>
                                        )}
                                        {event.status === "completed" && (
                                            <div className="w-full py-3.5 rounded-[14px] bg-white/5 border border-white/10 text-center">
                                                <span className="text-xs font-black text-white/30 uppercase tracking-widest">Event Ended</span>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleShareSubmission(previewSub.id)}
                                            className="w-full py-3 rounded-[14px] border border-white/15 text-white/60 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-colors"
                                        >
                                            Share
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>


            <main className="w-full pb-24 pt-2">
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1.5 mb-4 px-0">
                    <Link href="/explore" className="text-xs text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1"><ChevronLeft className="w-3 h-3" />Back</Link>
                    <ChevronRight className="w-3 h-3 text-foreground/20" />
                    <span className="text-xs text-foreground/60 font-medium truncate max-w-[260px]">
                        {loading ? "Loading…" : event?.title ?? "Event"}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <button className="p-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-foreground/40 hover:text-foreground transition-colors">
                            <Share2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
                        {/* Left skeleton */}
                        <div className="flex-1 min-w-0">
                            {/* Banner */}
                            <div className="rounded-[24px] bg-white/[0.05] h-[220px] md:h-[260px] mb-5" />
                            {/* Tab bar */}
                            <div className="flex items-center gap-6 border-b border-border/40 pb-3 mb-5">
                                <div className="h-3 w-20 bg-white/[0.06] rounded-full" />
                                <div className="h-3 w-14 bg-white/[0.04] rounded-full" />
                                <div className="h-3 w-10 bg-white/[0.04] rounded-full" />
                                <div className="ml-auto h-3 w-28 bg-white/[0.04] rounded-full" />
                            </div>
                            {/* Cards grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="rounded-[20px] bg-white/[0.05] aspect-[3/4]" />
                                ))}
                            </div>
                        </div>
                        {/* Right skeleton */}
                        <div className="lg:w-[300px] shrink-0 space-y-4">
                            <div className="rounded-[20px] bg-white/[0.05] h-[180px]" />
                            <div className="rounded-[20px] bg-white/[0.05] h-[320px]" />
                        </div>
                    </div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-sm font-bold text-foreground/60">{fetchError}</p>
                        <Link href="/explore" className="text-xs font-black text-primary hover:underline">Back to explore</Link>
                    </div>
                ) : event ? (
                    isCancelled ? (
                        /* ══════════════════════════════════════════════
                           CANCELLED STATE
                        ══════════════════════════════════════════════ */
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Left */}
                            <div className="flex-1 min-w-0">
                                {/* Banner with overlay */}
                                <div className="relative rounded-[24px] overflow-hidden h-[220px] md:h-[280px] mb-5">
                                    {(event.imageUrl || event.imageCid) ? (
                                        <img
                                            src={event.imageUrl || `https://gateway.pinata.cloud/ipfs/${event.imageCid}`}
                                            className="w-full h-full object-cover opacity-30"
                                            alt={event.title}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/[0.04]" />
                                    )}
                                    {/* Dark overlay */}
                                    <div className="absolute inset-0 bg-black/60" />
                                    {/* Cancelled badge + text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Cancelled</span>
                                        </div>
                                        <h1 className="font-display text-4xl md:text-5xl text-white/60 uppercase leading-tight">{event.title}</h1>
                                    </div>
                                </div>

                                {/* Reason card */}
                                <div className="rounded-[20px] bg-red-500/5 border border-red-500/15 p-6 flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                                        <AlertCircle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-foreground/80 mb-1">This event was cancelled</p>
                                        <p className="text-sm text-foreground/50 leading-relaxed">{cancelReason}</p>
                                        <p className="text-xs text-foreground/30 mt-3 font-medium">Hosted by {event.brand?.name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right — minimal info */}
                            <div className="lg:w-[280px] shrink-0 space-y-4">
                                <div className="bg-white/[0.03] border border-white/[0.07] rounded-[20px] p-5 space-y-3">
                                    <div className="flex items-center gap-3">
                                        {event.brand?.logoCid ? (
                                            <img src={`https://gateway.pinata.cloud/ipfs/${event.brand.logoCid}`} className="w-9 h-9 rounded-xl object-cover" alt={event.brand.name} />
                                        ) : (
                                            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                                                <span className="text-sm font-black text-primary">{event.brand?.name?.[0]}</span>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-black text-foreground">{event.brand?.name}</p>
                                            <p className="text-[10px] text-foreground/40">Event Host</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-white/[0.06]" />
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Category</p>
                                        <span className="text-[10px] font-black text-foreground/60 uppercase">{event.category}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Status</p>
                                        <span className="text-[10px] font-black text-red-400 uppercase">Cancelled</span>
                                    </div>
                                </div>
                                <Link href="/explore" className="block w-full py-3 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-center text-xs font-black uppercase tracking-widest text-foreground/50 hover:bg-white/[0.08] hover:text-foreground transition-all">
                                    Browse other events
                                </Link>
                            </div>
                        </div>
                    ) : displayMode === "post" && !isBrand ? (
                        /* ══════════════════════════════════════════════
                           POSTING PHASE — Image #6-style full-width hero
                        ══════════════════════════════════════════════ */
                        <>
                            {/* ── Full-width hero banner (same style as vote layout) ── */}
                            <div className="relative overflow-hidden min-h-[360px] md:min-h-[480px] mb-8 -mx-3 w-[calc(100%+1.5rem)] sm:-mx-4 sm:w-[calc(100%+2rem)] md:-mx-6 md:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
                                <img src={coverUrl} className="absolute inset-0 w-full h-full object-cover object-center" alt="Event" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/20" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="relative z-10 flex flex-col justify-between h-full min-h-[440px] md:min-h-[540px] p-8 md:p-12">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                                            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/15 rounded-full pl-1 pr-3 py-1">
                                                {event.brand?.logoCid ? (
                                                    <img src={`${PINATA_GW}/${event.brand.logoCid}`} className="w-6 h-6 rounded-full object-cover border border-white/20" alt={event.brand?.name} />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                                        <span className="text-[9px] font-black text-white/70">{event.brand?.name?.[0]}</span>
                                                    </div>
                                                )}
                                                <span className="text-[11px] font-black text-white/90">{event.brand?.name}</span>
                                            </div>
                                            {event.category && (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-white/50">
                                                    {event.category}
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="font-display text-6xl md:text-7xl lg:text-8xl text-white uppercase leading-[0.88] tracking-tighter max-w-[70%]">
                                            {event.title}
                                        </h1>
                                        {event.tagline && (
                                            <p className="font-display text-4xl md:text-5xl lg:text-6xl text-lime-400 uppercase leading-[0.88] tracking-tight mt-1">
                                                {event.tagline}
                                            </p>
                                        )}
                                        {event.description && (
                                            <p className="text-sm text-white/60 font-medium leading-relaxed mt-3 max-w-xl line-clamp-2">
                                                {event.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="border-t border-white/10 pt-4 flex items-end gap-0 flex-wrap">
                                        {event.postingEnd && (
                                            <>
                                                <div className="pr-8">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Posting Ends In</p>
                                                    <BigCountdown targetDate={event.postingEnd} />
                                                </div>
                                                <div className="self-stretch w-px bg-white/15 mx-0 mr-8" />
                                            </>
                                        )}
                                        <div className="pr-8">
                                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-1">Submissions So Far</p>
                                            <p className="text-4xl md:text-5xl font-black text-lime-400 leading-none tabular-nums">{sortedSubmissions.length}</p>
                                        </div>
                                        {calculateTotalPool(event) > 0 && (
                                            <>
                                                <div className="self-stretch w-px bg-white/15 mx-0 mr-8" />
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-1">Total Prize Pool</p>
                                                    <div className="flex items-center gap-2">
                                                        <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                                                        <p className="text-4xl md:text-5xl font-black text-yellow-400 leading-none tabular-nums">${calculateTotalPool(event).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-6">

                                {/* ── Left: Submit panel ── */}
                                <div className="flex-1 min-w-0 space-y-5">

                                    {/* ── Already submitted ── */}
                                    {hasSubmitted && mySubmission ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-[24px] border border-lime-400/30 bg-lime-400/5 overflow-hidden"
                                        >
                                            <div className="px-5 py-4 border-b border-lime-400/20 flex items-center gap-3">
                                                <motion.div
                                                    initial={{ scale: 0.92, opacity: 0.7 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="w-8 h-8 rounded-xl bg-lime-400/15 flex items-center justify-center shrink-0"
                                                >
                                                    <CheckCircle2 className="w-4 h-4 text-lime-400" />
                                                </motion.div>
                                                <div>
                                                    <p className="text-sm font-black text-foreground">Your post has been submitted </p>
                                                    <p className="text-[10px] text-foreground/40 font-medium">Submitted successfully · waiting for voting phase</p>
                                                </div>
                                            </div>
                                            {(mySubmission.imageUrl || mySubmission.imageCid) && (
                                                <div className="p-4">
                                                    <img
                                                        src={mySubmission.imageUrl || `${PINATA_GW}/${mySubmission.imageCid}`}
                                                        className="w-full rounded-[16px] border border-lime-400/20 object-contain bg-black"
                                                        alt="Your submission"
                                                    />
                                                    {(mySubmission as any).caption && (
                                                        <p className="mt-3 text-sm text-foreground/60 font-medium leading-relaxed">{(mySubmission as any).caption}</p>
                                                    )}
                                                </div>
                                            )}
                                            {/* Voting phase info */}
                                            <div className="mx-4 mb-4 rounded-[14px] bg-white/[0.03] border border-white/[0.07] px-4 py-3 space-y-1.5">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-foreground/35">What happens next?</p>
                                                <p className="text-[11px] text-foreground/55 leading-relaxed">
                                                    Once the posting phase ends, the <span className="text-foreground/80 font-semibold">voting phase begins</span>. You'll be able to see all other submissions and vote on your favourite. Other participants will also see your entry and can vote for it — every vote earns you <span className="text-lime-400 font-semibold">$0.05 USDC</span>.
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        /* ── Submit hero panel (CreateHero-style) ── */
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-[28px] bg-[#0c0c10] border border-white/[0.07]"
                                        >
                                            <div className="px-6 py-8 sm:px-8 space-y-6">
                                                {/* Heading */}
                                                <div>
                                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{event.brand?.name}</p>
                                                    <h2 className="font-display text-4xl md:text-5xl text-white leading-[0.9] uppercase tracking-tight">
                                                        Compete for the{" "}
                                                        <span className="bg-gradient-to-r from-lime-300 via-lime-400 to-green-400 bg-clip-text text-transparent">top spot</span>
                                                    </h2>
                                                </div>

                                                {/* AI prompt + generate — always shown */}
                                                <div className="space-y-3">
                                                    {/* Create-page style prompt row */}
                                                    <div className="flex items-center gap-2 px-4 py-3 rounded-[14px] border border-white/[0.1] bg-white/[0.03] focus-within:border-lime-400/40 focus-within:shadow-[0_0_0_1px_rgba(163,230,53,0.15)] transition-all">
                                                        <input
                                                            value={aiPrompt}
                                                            onChange={(e) => setAiPrompt(e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === "Enter" && aiPrompt.trim() && !aiGenerating) handleAiGenerate(); }}
                                                            placeholder={`Describe the image for "${event.title}"…`}
                                                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/30 focus:outline-none min-w-0"
                                                        />
                                                        {/* Upload when empty, enhance when typing */}
                                                        {aiPrompt.trim() ? (
                                                            <button
                                                                type="button"
                                                                onClick={handleRefinePrompt}
                                                                disabled={aiRefining}
                                                                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-30 shrink-0"
                                                                title="Enhance prompt"
                                                            >
                                                                {aiRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => { if (!isAuthenticated) { openLoginModal(); return; } fileRef.current?.click(); }}
                                                                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all shrink-0"
                                                                title="Upload your own image"
                                                            >
                                                                <Upload className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={handleAiGenerate}
                                                            disabled={!aiPrompt.trim() || aiGenerating}
                                                            className="px-5 py-2.5 rounded-xl bg-lime-400 text-black font-black uppercase tracking-widest text-[11px] shadow-[0_4px_18px_rgba(163,230,53,0.3)] hover:bg-lime-300 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5 whitespace-nowrap"
                                                        >
                                                            {aiGenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : aiImageUrl ? <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</> : "Generate"}
                                                        </button>
                                                    </div>

                                                    {/* Style hint chips */}
                                                    <div className="flex flex-wrap gap-2">
                                                        {["4K Bokeh", "Cyberpunk", "Cinematic", "Minimalist"].map((hint) => (
                                                            <button
                                                                key={hint}
                                                                type="button"
                                                                onClick={() => setAiPrompt((p) => p ? `${p}, ${hint}` : hint)}
                                                                className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white/70 hover:bg-white/[0.08] hover:border-white/[0.14] transition-all"
                                                            >
                                                                {hint}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Sample images reference */}
                                                    {event.sampleUrls && event.sampleUrls.length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                                                                <ImageIcon className="w-3 h-3" /> Sample references — match this style
                                                            </p>
                                                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                                                {event.sampleUrls.map((s, i) => (
                                                                    <div key={i} className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-white/[0.08]">
                                                                        <img
                                                                            src={s.urls?.medium || s.urls?.thumbnail}
                                                                            alt={`Sample ${i + 1}`}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Review pill — shown after generation or upload */}
                                                    {(aiImageUrl || preview) && (
                                                        <div className="flex items-center gap-2">
                                                            {submitting ? (
                                                                <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25">
                                                                    <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0" />
                                                                    <span className="text-xs font-black text-purple-400 truncate">Uploading &amp; submitting…</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => { if (!isAuthenticated) { openLoginModal(); return; } setSubmitModalOpen(true); }}
                                                                        className="flex-1 px-4 py-2 rounded-xl bg-purple-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-purple-400 transition-colors"
                                                                    >
                                                                        Review &amp; Submit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (aiImageUrl?.startsWith("blob:")) URL.revokeObjectURL(aiImageUrl);
                                                                            setAiImageUrl(null); setAiImageFile(null);
                                                                            if (preview) URL.revokeObjectURL(preview);
                                                                            setFile(null); setPreview(null);
                                                                        }}
                                                                        className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}


                                    {/* ── Submit modal ── */}
                                    <AnimatePresence>
                                        {submitModalOpen && (aiImageUrl || preview) && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                                                onClick={(e) => { if (e.target === e.currentTarget) setSubmitModalOpen(false); }}
                                            >
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="w-full max-w-3xl bg-[#0e0e12] border border-white/[0.08] rounded-[28px] overflow-hidden flex flex-col md:flex-row"
                                                >
                                                    {/* Left — image */}
                                                    <div className="md:w-[52%] shrink-0 relative bg-black flex items-center justify-center min-h-[320px]">
                                                        <img
                                                            src={aiImageUrl || preview!}
                                                            className="w-full h-full object-contain"
                                                            style={{ maxHeight: "520px" }}
                                                            alt="Submission preview"
                                                        />
                                                        <div className="absolute top-3 left-3 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: aiImageUrl ? "rgba(163,230,53,0.8)" : "rgba(255,255,255,0.15)" }}>
                                                            {aiImageUrl ? <Sparkles className="w-3 h-3 text-black" /> : <Upload className="w-3 h-3 text-white" />}
                                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: aiImageUrl ? "black" : "white" }}>{aiImageUrl ? "AI Generated" : "Your Upload"}</span>
                                                        </div>
                                                    </div>

                                                    {/* Right — caption + rewards + submit */}
                                                    <div className="flex-1 flex flex-col p-6 gap-4">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{event.brand?.name}</p>
                                                                <h3 className="font-display text-2xl text-white uppercase leading-tight">Submit Entry</h3>
                                                            </div>
                                                            <button
                                                                onClick={() => setSubmitModalOpen(false)}
                                                                className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors shrink-0"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        {/* Optional caption */}
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                                                                Optional Caption
                                                            </label>
                                                            <textarea
                                                                value={caption}
                                                                onChange={(e) => setCaption(e.target.value)}
                                                                placeholder="Describe your entry…"
                                                                rows={3}
                                                                maxLength={280}
                                                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 resize-none focus:outline-none focus:border-white/20 transition-colors"
                                                            />
                                                            <p className="text-[10px] text-white/25 text-right mt-1">{caption.length}/280</p>
                                                        </div>

                                                        {/* Reward info */}
                                                        <div className="rounded-[14px] bg-white/[0.03] border border-white/[0.07] p-3 space-y-2">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Your Earnings</p>
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[11px] text-white/55">Per vote received on your post</p>
                                                                <p className="text-xs font-black text-lime-400">$0.05 USDC</p>
                                                            </div>
                                                            {(event.leaderboardPool ?? 0) > 0 && (
                                                                <>
                                                                    <div className="border-t border-white/[0.06] pt-2 space-y-1.5">
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Leaderboard Pool · ${(event.leaderboardPool ?? 0).toLocaleString()} USDC</p>
                                                                        {([
                                                                            { place: "🥇 1st", pct: 0.50 },
                                                                            { place: "🥈 2nd", pct: 0.35 },
                                                                            { place: "🥉 3rd", pct: 0.15 },
                                                                        ] as const).map(({ place, pct }) => (
                                                                            <div key={place} className="flex items-center justify-between">
                                                                                <p className="text-[11px] text-white/55">{place} Place</p>
                                                                                <p className="text-xs font-black text-white/70">${((event.leaderboardPool ?? 0) * pct).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => { setSubmitModalOpen(false); handleSubmit(); }}
                                                            disabled={(!aiImageFile && !file) || submitting}
                                                            className="mt-auto w-full py-4 bg-purple-500 hover:bg-purple-400 text-white rounded-[14px] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                                        >
                                                            {submitting
                                                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                                                                : <><Sparkles className="w-4 h-4" /> Enter Competition</>
                                                            }
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* ── Rules (quick) ── */}
                                    <div className="rounded-[24px] border border-border/40 bg-white/[0.02] p-5 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5 text-foreground/40" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Rules (quick)</p>
                                        </div>
                                        <ul className="space-y-2">
                                            {[
                                                "1 submission per user",
                                                "Max 5MB",
                                                "No copyrighted content",
                                            ].map((rule) => (
                                                <li key={rule} className="text-sm text-foreground/60 flex items-center gap-2.5">
                                                    <span className="w-1 h-1 rounded-full bg-foreground/45 shrink-0" />
                                                    {rule}
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={() => setShowFullRules((v) => !v)}
                                            className="text-xs font-black uppercase tracking-widest text-orange-400/90 hover:text-orange-300 transition-colors"
                                        >
                                            {showFullRules ? "Hide full rules" : "View full rules"}
                                        </button>
                                        <AnimatePresence>
                                            {showFullRules && (
                                                <motion.ol
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -6 }}
                                                    transition={{ duration: 0.18 }}
                                                    className="space-y-2.5 pt-2 border-t border-border/30"
                                                >
                                                    {(event.submissionGuidelines
                                                        ? event.submissionGuidelines.split("\n").filter(Boolean)
                                                        : [
                                                            "Upload a high-resolution image (JPEG or PNG, max 5 MB).",
                                                            "Preferred aspect ratio: 4:5 or 1:1.",
                                                            "Add an optional caption to describe your work.",
                                                            "One submission per participant — make it count.",
                                                            "No offensive or copyrighted content.",
                                                        ]
                                                    ).map((rule, i) => (
                                                        <li key={i} className="text-xs text-foreground/55 leading-relaxed">
                                                            {i + 1}. {rule}
                                                        </li>
                                                    ))}
                                                </motion.ol>
                                            )}
                                        </AnimatePresence>
                                    </div>


                                    {preview && (
                                        <PinturaImageEditor
                                            isOpen={pinturaOpen}
                                            imageSrc={preview}
                                            onDone={(f, p) => { if (preview) URL.revokeObjectURL(preview); setFile(f); setPreview(p); setPinturaOpen(false); }}
                                            onClose={() => setPinturaOpen(false)}
                                        />
                                    )}
                                </div>

                                {/* ── Right: Event info + Rewards ── */}
                                <div className="lg:w-[300px] shrink-0">
                                    <div className="sticky top-6 space-y-4">


                                        {/* Rewards card */}
                                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                                            <div className="mb-4">
                                                <span className="text-sm font-black text-foreground">Reward Breakdown</span>
                                            </div>

                                            {/* Two incentive rows */}
                                            <div className="space-y-2 mb-4">
                                                {/* Creator incentive — per vote received */}
                                                <div className="flex items-center justify-between bg-lime-400/5 border border-lime-400/15 rounded-[12px] px-3 py-3">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-lime-400/70 mb-0.5">You post</p>
                                                        <p className="text-[11px] text-foreground/60 leading-tight">Per vote received on your post</p>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-2">
                                                        <p className="text-base font-black text-lime-400">$0.05</p>
                                                        <p className="text-[9px] text-foreground/40">USDC</p>
                                                    </div>
                                                </div>
                                                {/* Voter incentive — per vote cast */}
                                                <div className="flex items-center justify-between bg-sky-400/5 border border-sky-400/15 rounded-[12px] px-3 py-3">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-sky-400/70 mb-0.5">You vote</p>
                                                        <p className="text-[11px] text-foreground/60 leading-tight">Per vote you cast in this event</p>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-2">
                                                        <p className="text-base font-black text-sky-400">$0.03</p>
                                                        <p className="text-[9px] text-foreground/40">USDC</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Leaderboard prizes — 50 / 35 / 15 */}
                                            {(event.leaderboardPool ?? 0) > 0 && (() => {
                                                const pool = event.leaderboardPool ?? 0;
                                                const prize1 = pool * 0.50;
                                                const prize2 = pool * 0.35;
                                                const prize3 = pool * 0.15;
                                                return (
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-0.5">Leaderboard Rewards</p>
                                                        <p className="text-[10px] text-foreground/35 mb-2.5">Top 3 creators ranked by votes received</p>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between bg-yellow-400/5 border border-yellow-400/15 rounded-[12px] px-3 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm leading-none">🥇</span>
                                                                    <div>
                                                                        <p className="text-xs font-black text-foreground">1st Place</p>
                                                                        <p className="text-[9px] text-foreground/40">Most votes · 50% of pool</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black text-yellow-400">${prize1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                                    <p className="text-[9px] text-foreground/40">USDC</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-[12px] px-3 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm leading-none">🥈</span>
                                                                    <div>
                                                                        <p className="text-xs font-black text-foreground">2nd Place</p>
                                                                        <p className="text-[9px] text-foreground/40">2nd most votes · 35% of pool</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black text-foreground/70">${prize2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                                    <p className="text-[9px] text-foreground/40">USDC</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-[12px] px-3 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm leading-none">🥉</span>
                                                                    <div>
                                                                        <p className="text-xs font-black text-foreground">3rd Place</p>
                                                                        <p className="text-[9px] text-foreground/40">3rd most votes · 15% of pool</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black text-foreground/50">${prize3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                                    <p className="text-[9px] text-foreground/40">USDC</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ══════════════════════════════════════════════
                           STANDARD LAYOUT — voting / completed / upcoming
                        ══════════════════════════════════════════════ */
                        <>
                            {/* ── Full-width hero banner ── */}
                            <div className="relative overflow-hidden min-h-[200px] md:min-h-[400px] mb-6 -mx-3 w-[calc(100%+1.5rem)] sm:-mx-4 sm:w-[calc(100%+2rem)] md:-mx-6 md:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
                                {/* Background image */}
                                <img src={coverUrl} className="absolute inset-0 w-full h-full object-cover object-center" alt="Event" />

                                {/* Gradients */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/20" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                {/* Content */}
                                <div className="relative z-10 flex flex-col justify-between h-full min-h-[380px] md:min-h-[460px] p-7 md:p-10">
                                    {/* Top: brand pill + title */}
                                    <div>
                                        {/* Brand + category pill */}
                                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                                            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/15 rounded-full pl-1 pr-3 py-1">
                                                {event.brand?.logoCid ? (
                                                    <img
                                                        src={`${PINATA_GW}/${event.brand.logoCid}`}
                                                        className="w-6 h-6 rounded-full object-cover border border-white/20"
                                                        alt={event.brand?.name}
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                                        <span className="text-[9px] font-black text-white/70">{event.brand?.name?.[0]}</span>
                                                    </div>
                                                )}
                                                <span className="text-[11px] font-black text-white/90">{event.brand?.name}</span>
                                            </div>
                                            {event.category && (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-white/50">
                                                    {event.category}
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white uppercase leading-[0.88] tracking-tight max-w-[60%]">
                                            {event.title}
                                        </h1>
                                        {event.tagline && (
                                            <p className="font-display text-4xl md:text-5xl lg:text-6xl text-lime-400 uppercase leading-[0.88] tracking-tight mt-1">
                                                {event.tagline}
                                            </p>
                                        )}
                                        {event.description && (
                                            <div className="mt-4 max-w-2xl">
                                                <ExpandableDescription
                                                    text={event.description}
                                                    className="text-sm md:text-base text-white/70 font-medium leading-relaxed"
                                                />
                                            </div>
                                        )}
                                    </div>



                                    {/* Bottom: brand strip + stats */}
                                    <div className="space-y-4">


                                        {/* Stats row */}
                                        <div className="border-t border-white/10 pt-4 flex items-end gap-0 flex-wrap">
                                            {/* Countdown or Ended */}
                                            {isVotingEnded ? (
                                                <>
                                                    <div className="pr-8">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-1">Event Status</p>
                                                        <p className="text-2xl font-black text-white/50 leading-none">Ended</p>
                                                    </div>
                                                    <div className="self-stretch w-px bg-white/15 mx-0 mr-8" />
                                                </>
                                            ) : !isVotingEnded && displayMode === "vote" && event.endTime ? (
                                                <>
                                                    <div className="pr-8">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Voting Ends In</p>
                                                        <BigCountdown targetDate={event.endTime} />
                                                    </div>
                                                    <div className="self-stretch w-px bg-white/15 mx-0 mr-8" />
                                                </>
                                            ) : null}
                                            {!isVotingEnded && displayMode === "upcoming" && event.startTime && (
                                                <>
                                                    <div className="pr-8">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Starts In</p>
                                                        <BigCountdown targetDate={event.startTime} />
                                                    </div>
                                                    <div className="self-stretch w-px bg-white/15 mx-0 mr-8" />
                                                </>
                                            )}

                                            {/* Participants */}
                                            <div className="pr-8">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-1">Total Participants</p>
                                                {loading ? (
                                                    <div className="h-10 w-20 rounded-lg bg-white/10 animate-pulse" />
                                                ) : (
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="flex items-center justify-center w-5 h-5 opacity-40">
                                                            <Users className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div className="flex items-baseline gap-1">
                                                            <p className="text-4xl md:text-5xl font-black text-lime-400 leading-none tabular-nums">{participantCount.toLocaleString()}</p>
                                                            {event.capacity && (
                                                                <span className="text-2xl md:text-3xl font-black text-white/30 leading-none">/{event.capacity.toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                        <ParticipantAvatars avatars={(event as any).participantAvatars} totalCount={participantCount} onShowAll={() => setShowParticipantsModal(true)} />
                                                    </div>
                                                )}
                                            </div>

                                            {calculateTotalPool(event) > 0 && (
                                                <>
                                                    <div className="self-stretch w-px bg-white/15 mx-0 mr-8" />
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-1">Total Prize Pool</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-4xl md:text-5xl font-black text-yellow-400 leading-none tabular-nums">${calculateTotalPool(event).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                        </div>


                                    </div>
                                </div>
                            </div>

                            {/* ── Content + sidebar ── */}
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* ── Left column ── */}
                                <div className="flex-1 min-w-0">
                                    {/* Count + View toggle */}
                                    {displayMode !== "upcoming" && displayMode !== "completed" && (
                                        <div className="flex items-center justify-between mb-5">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-foreground/40">
                                                {enrichedSubmissions.length} {event.eventType === "vote_only" ? "Options" : "Submissions"}
                                            </span>
                                            <div className="flex border border-border/40 rounded-lg overflow-hidden">
                                                <button onClick={() => setGridView(true)} className={cn("p-1.5 transition-colors", gridView ? "bg-white/10 text-foreground" : "text-foreground/30 hover:text-foreground/60")}><LayoutGrid className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => setGridView(false)} className={cn("p-1.5 transition-colors", !gridView ? "bg-white/10 text-foreground" : "text-foreground/30 hover:text-foreground/60")}><List className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Content */}
                                    {displayMode === "upcoming" ? (
                                        <div className="py-16 flex flex-col items-center text-center gap-4">
                                            <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center">
                                                <Clock className="w-7 h-7 text-primary" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-foreground tracking-tighter mb-1">Coming Soon</h2>
                                                <p className="text-sm text-foreground/50 font-medium">Goes live on <strong>{new Date(event.startTime).toLocaleString()}</strong></p>
                                            </div>
                                        </div>
                                    ) : displayMode === "completed" ? (
                                        <CompletedView 
                                            event={event} 
                                            submissions={enrichedSubmissions} 
                                            currentUserId={user?.id} 
                                            gridView={gridView} 
                                            votedSubmissionId={votedSubmissionId} 
                                            onPreviewSubmission={setPreviewSubmissionId}
                                        />
                                    ) : (
                                        <AnimatePresence>
                                            <div className={gridView ? "grid grid-cols-2 md:grid-cols-3 gap-4" : "flex flex-col gap-4"}>
                                                {sortedSubmissions.map((sub, idx) => (
                                                    <motion.div
                                                        key={sub.id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.92 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                                                        className={!gridView ? "w-full max-w-[760px] mx-auto" : undefined}
                                                    >
                                                        <VoteSubmissionCard
                                                            submission={toVoteSubmission(sub, user?.id)}
                                                            isVoted={votedSubmissionId === sub.id}
                                                            isPending={pendingVoteId === sub.id}
                                                            onVote={() => handleVote(sub.id)}
                                                            onOpenImage={() => setPreviewSubmissionId(sub.id)}
                                                            disabled={isVotingEnded || !!votedSubmissionId || (event.eventType !== "vote_only" && sub.userId === user?.id)}
                                                            optionIndex={event.eventType === "vote_only" ? idx : undefined}
                                                            showVoteCount={false}
                                                            listView={!gridView}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>
                                            {enrichedSubmissions.length === 0 && (
                                                <div className="text-center py-20">
                                                    <p className="text-sm text-foreground/30 font-bold">{event.eventType === "vote_only" ? "No options yet" : "No entries yet"}</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    )}
                                </div>

                                {/* ── Right: Sticky sidebar ── */}
                                <div className="lg:w-[300px] shrink-0">
                                    <div className="sticky top-6">
                                        <EventSidebar
                                            event={event}
                                            participantCount={participantCount}
                                            mode={displayMode}
                                            votedSubmissionId={votedSubmissionId}
                                            votedSub={votedSub ?? undefined}
                                            hasSubmitted={hasSubmitted}
                                            mySubmission={mySubmission}
                                            file={file}
                                            preview={preview}
                                            caption={caption}
                                            submitting={submitting}
                                            fileRef={fileRef}
                                            onFileChange={handleFileChange}
                                            onSubmit={handleSubmit}
                                            onCaptionChange={setCaption}
                                            isBrand={isBrand}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )
                ) : null}
            </main>

            {/* Image lightbox */}
            <AnimatePresence>
                {lightboxOpen && preview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md"
                        onClick={() => setLightboxOpen(false)}
                    >
                        <motion.img
                            src={preview}
                            alt="Preview full size"
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </SidebarLayout>
    );
}

// ─── Completed View ──────────────────────────────────────────────────────────

function CompletedView({ event, submissions, currentUserId, gridView, votedSubmissionId, onPreviewSubmission }: {
    event: Event;
    submissions: Submission[];
    currentUserId?: string | null;
    gridView: boolean;
    votedSubmissionId?: string | null;
    onPreviewSubmission: (id: string) => void;
}) {
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

    const sorted = [...submissions].sort(
        (a, b) => (a.rank || 999) - (b.rank || 999) || (b._count?.votes || 0) - (a._count?.votes || 0)
    );
    const topThree = sorted.slice(0, 3);
    const others = sorted.slice(3);
    const totalVotes = submissions.reduce((sum, s) => sum + (s._count?.votes ?? 0), 0);
    const winner = sorted[0];
    const showCreator = event.eventType !== "vote_only";
    const myPost = currentUserId ? sorted.find(s => s.userId === currentUserId) : null;

    // Result insight line
    const insightText = (() => {
        if (!winner || totalVotes === 0) return null;
        const winnerVotes = winner._count?.votes ?? 0;
        const secondVotes = sorted[1]?._count?.votes ?? 0;
        const diff = winnerVotes - secondVotes;
        if (sorted.length >= 2 && diff <= 2) {
            return `Close match — top 2 within ${diff} vote${diff !== 1 ? "s" : ""}`;
        }
        const pct = Math.round((winnerVotes / totalVotes) * 100);
        if (pct >= 50) return `Winner received ${pct}% of total votes`;
        return `${winnerVotes} votes cast for top entry`;
    })();

    // Lightbox
    const lightboxItems = sorted
        .filter((s) => s.imageUrl || s.imageCid)
        .map((s) => ({
            src: s.imageUrl || `${PINATA_GW}/${s.imageCid}`,
            rank: s.rank,
            votes: s._count?.votes ?? 0,
        }));

    const getLightboxIdx = (sub: Submission) =>
        lightboxItems.findIndex((item) => item.src === (sub.imageUrl || `${PINATA_GW}/${sub.imageCid}`));

    const hasPrev = lightboxIdx !== null && lightboxIdx > 0;
    const hasNext = lightboxIdx !== null && lightboxIdx < lightboxItems.length - 1;
    const currentItem = lightboxIdx !== null ? lightboxItems[lightboxIdx] : null;

    useEffect(() => {
        if (lightboxIdx === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxIdx(null);
            if (e.key === "ArrowLeft" && hasPrev) setLightboxIdx((i) => (i ?? 0) - 1);
            if (e.key === "ArrowRight" && hasNext) setLightboxIdx((i) => (i ?? 0) + 1);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [lightboxIdx, hasPrev, hasNext]);

    return (
        <div className="space-y-8">
            {/* Lightbox */}
            <AnimatePresence>
                {lightboxIdx !== null && currentItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
                        onClick={() => setLightboxIdx(null)}
                    >
                        <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors z-10">
                            <X className="w-4 h-4 text-white" />
                        </button>
                        {hasPrev && (
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i ?? 0) - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors z-10">
                                <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                        )}
                        {hasNext && (
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i ?? 0) + 1); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors z-10">
                                <ChevronRight className="w-5 h-5 text-white" />
                            </button>
                        )}
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src={currentItem.src} alt="Submission" className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl" />
                            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl pointer-events-none" />
                            <div className="absolute bottom-4 left-4 flex items-center gap-3">
                                {currentItem.rank && <span className="text-[11px] font-medium text-neutral-300">#{currentItem.rank}</span>}
                                <span className="text-[11px] text-neutral-400">{currentItem.votes} votes</span>
                            </div>
                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 border border-white/10">
                                <span className="text-[10px] font-medium text-white/50">{lightboxIdx + 1} / {lightboxItems.length}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Top 3 — final results */}
            {/* ── My Post ── */}
            {myPost && event.eventType === "post_and_vote" && (
                <div className="rounded-[20px] border-2 border-primary/40 bg-primary/5 overflow-hidden">
                    <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">Your Entry</span>
                        {myPost.rank && (
                            <span className={cn(
                                "text-[10px] font-black px-2 py-0.5 rounded-full",
                                myPost.rank === 1 ? "bg-yellow-400 text-black" :
                                    myPost.rank === 2 ? "bg-slate-300 text-black" :
                                        myPost.rank === 3 ? "bg-amber-600 text-white" :
                                            "bg-white/10 text-white/70"
                            )}>#{myPost.rank}</span>
                        )}
                    </div>
                    <div className="flex gap-4 px-4 pb-4">
                        {(myPost.imageUrl || myPost.imageCid) && (
                            <div
                                className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 cursor-zoom-in"
                                onClick={() => onPreviewSubmission(myPost.id)}
                            >
                                <img src={myPost.imageUrl || `${PINATA_GW}/${myPost.imageCid}`} className="w-full h-full object-cover px-0" alt="My post" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            {(myPost as any).caption && (
                                <p className="text-sm font-semibold text-foreground/80 line-clamp-2 mb-2">{(myPost as any).caption}</p>
                            )}
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground/35">Votes Received</p>
                                    <p className="text-xl font-black text-foreground">{myPost._count?.votes ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-lime-400/60">Earned</p>
                                    <p className="text-xl font-black text-lime-400">${((myPost._count?.votes ?? 0) * 0.05).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {topThree.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-black text-foreground tracking-tight">Final Results</h2>
                            <p className="text-[10px] text-foreground/35 font-medium mt-0.5">
                                {totalVotes} votes · {submissions.length} entries
                            </p>
                        </div>
                    </div>

                    {gridView ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            {topThree.map((sub, i) => (
                                <div key={sub.id} className="relative">
                                    {/* Highlighted rank badge */}
                                    <div className={cn(
                                        "absolute -top-3 left-4 z-10 px-2.5 py-0.5 rounded-md text-xs font-black",
                                        i === 0 ? "bg-yellow-400 text-black" :
                                            i === 1 ? "bg-slate-300 text-black" :
                                                "bg-amber-600 text-white"
                                    )}>
                                        #{i + 1}
                                    </div>
                                    <PostSubmissionCard
                                        submission={toPostSubmission(sub, currentUserId)}
                                        showVoteCount={true}
                                        isVotedByUser={votedSubmissionId === sub.id}
                                        onImageClick={() => onPreviewSubmission(sub.id)}
                                        showCreator={showCreator}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[16px] border border-border/30 overflow-hidden">
                            {topThree.map((sub, i) => (
                                <PostSubmissionCard
                                    key={sub.id}
                                    submission={{ ...toPostSubmission(sub, currentUserId), rank: i + 1 }}
                                    showVoteCount={true}
                                    isVotedByUser={votedSubmissionId === sub.id}
                                    onImageClick={getLightboxIdx(sub) >= 0 ? () => setLightboxIdx(getLightboxIdx(sub)) : undefined}
                                    showCreator={showCreator}
                                    listView={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* All other entries */}
            {others.length > 0 && (
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35 mb-4">
                        All Entries ({others.length})
                    </h3>
                    {gridView ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {others.map((sub) => (
                                <div key={sub.id} className="relative">
                                    {sub.rank && (
                                        <div className="absolute -top-2 left-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-900 border border-neutral-700 text-neutral-500">
                                            #{sub.rank}
                                        </div>
                                    )}
                                    <PostSubmissionCard
                                        submission={toPostSubmission(sub, currentUserId)}
                                        showVoteCount={true}
                                        isVotedByUser={votedSubmissionId === sub.id}
                                        onImageClick={getLightboxIdx(sub) >= 0 ? () => setLightboxIdx(getLightboxIdx(sub)) : undefined}
                                        showCreator={showCreator}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[16px] border border-border/30 overflow-hidden">
                            {others.map((sub) => (
                                <PostSubmissionCard
                                    key={sub.id}
                                    submission={toPostSubmission(sub, currentUserId)}
                                    showVoteCount={true}
                                    isVotedByUser={votedSubmissionId === sub.id}
                                    onImageClick={getLightboxIdx(sub) >= 0 ? () => setLightboxIdx(getLightboxIdx(sub)) : undefined}
                                    showCreator={showCreator}
                                    listView={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
