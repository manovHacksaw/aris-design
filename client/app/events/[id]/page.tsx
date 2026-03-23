"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Trophy, Users, ChevronLeft, Share2, ImageIcon, CheckCircle2, Loader2,
    AlertCircle, Crown, Medal, Info, Upload, PlusCircle, Vote, ChevronRight,
    Twitter, Instagram, Globe, ExternalLink, LayoutGrid, List, ThumbsUp, Coins,
    ShieldCheck, Tag, Sparkles, Wand2, RefreshCw, X, ZoomIn
} from "lucide-react";
import { calculateTotalPool } from "@/lib/eventUtils";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { useSocket } from "@/context/SocketContext";
import { toast } from "sonner";
import Countdown from "@/components/events/Countdown";
import { use } from "react";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function imgUrl(imageUrl?: string | null, cid?: string | null): string | undefined {
    if (imageUrl) return imageUrl;
    if (cid) return `${PINATA_GW}/${cid}`;
    return undefined;
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
        textContent: sub.content,
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

function SocialLinks({ links }: { links?: Record<string, string> }) {
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
    activeViewers,
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
    activeViewers: number;
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
            {/* ── Event info card ── */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                {/* Brand */}
                <div className="flex items-center gap-3 mb-4">
                    {event.brand?.logoCid ? (
                        <img
                            src={`${PINATA_GW}/${event.brand.logoCid}`}
                            className="w-10 h-10 rounded-xl object-cover border border-border/40"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 flex items-center justify-center">
                            <span className="text-xs font-black text-[#A78BFA]">{event.brand?.name?.[0] ?? "B"}</span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-foreground">{event.brand?.name}</p>
                        <p className="text-[10px] text-foreground/40 font-medium">Event Host</p>
                    </div>
                    {event.category && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/20 shrink-0">
                            <Tag className="w-2.5 h-2.5 text-[#A78BFA]/70" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]/80">
                                {event.category}
                            </span>
                        </div>
                    )}
                </div>

                {/* Time remaining */}
                {event.status !== "completed" && targetDate && (
                    <div className={cn(
                        "flex items-center justify-between py-3 px-3 rounded-[12px] border mt-1",
                        event.status === "posting"
                            ? "bg-orange-500/8 border-orange-500/20"
                            : "bg-lime-400/5 border-lime-400/20"
                    )}>
                        <div className="flex items-center gap-1.5">
                            <Clock className={cn("w-3 h-3", event.status === "posting" ? "text-orange-400" : "text-lime-400")} />
                            <span className={cn("text-[10px] font-black uppercase tracking-widest",
                                event.status === "posting" ? "text-orange-400/80" : "text-lime-400/80"
                            )}>
                                {event.status === "posting" ? "Posting Ends In" : "Voting Ends In"}
                            </span>
                        </div>
                        <Countdown targetDate={targetDate} label="" />
                    </div>
                )}

                {/* Participants / Posting rules */}
                {mode === "post" ? (
                    <div className="py-3 border-t border-border/30 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">How It Works</span>
                        <div className="flex items-start gap-2.5 mt-2">
                            <div className="w-5 h-5 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Upload className="w-2.5 h-2.5 text-orange-400" />
                            </div>
                            <p className="text-[11px] text-foreground/60 leading-snug">
                                <span className="font-black text-foreground/80">One post per user.</span> Submit your best creative entry before time runs out.
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Vote className="w-2.5 h-2.5 text-lime-400" />
                            </div>
                            <p className="text-[11px] text-foreground/60 leading-snug">
                                <span className="font-black text-foreground/80">Voters are participants.</span> Participant count tracks votes cast — not posts — during the voting phase.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-3 border-t border-border/30">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Participating</span>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-foreground/40" />
                                <span className="text-sm font-black text-foreground">
                                    {formatCount(participantCount)}
                                </span>
                                {event.capacity && (
                                    <span className="text-[10px] text-foreground/35 font-medium">
                                        / {formatCount(event.capacity)}
                                    </span>
                                )}
                            </div>
                        </div>
                        {event.capacity && (
                            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((participantCount / event.capacity) * 100, 100)}%` }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="h-full rounded-full bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Active viewers */}
                {activeViewers > 0 && (
                    <div className="flex items-center justify-between py-3 border-t border-border/30">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Watching Now</span>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                            </span>
                            <span className="text-sm font-black text-green-400">{activeViewers}</span>
                        </div>
                    </div>
                )}

                {/* Social links */}
                <SocialLinks links={socialLinks} />
            </div>

            {/* ── Rewards + Guidelines card ── */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                {/* Vote & Earn highlight — voting phase only */}
                {mode === "vote" && (
                    <div className="mb-4 bg-lime-400/8 border border-lime-400/20 rounded-[14px] p-3.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-lime-400/15 flex items-center justify-center shrink-0">
                            <Coins className="w-4 h-4 text-lime-400" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-lime-400">Vote &amp; Earn $0.03</p>
                            <p className="text-[10px] text-foreground/50 leading-tight mt-0.5">
                                Fixed reward per vote, distributed on completion
                            </p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#A78BFA]" />
                        <span className="text-sm font-black text-foreground">Rewards Pool</span>
                    </div>
                    <span className="text-[9px] bg-[#A78BFA]/10 text-[#A78BFA] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#A78BFA]/20">
                        Guaranteed
                    </span>
                </div>

                {/* Grand prize */}
                {topReward > 0 && (
                    <div className="bg-[#A78BFA]/5 border border-[#A78BFA]/15 rounded-[14px] p-4 mb-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Grand-Prize Winner</p>
                        <p className="text-2xl font-black text-foreground">${topReward.toLocaleString()}</p>
                        <p className="text-[10px] text-foreground/40 font-medium">USDC</p>
                    </div>
                )}

                {/* Leaderboard pool */}
                {leaderboardPool > 0 && (
                    <div className="mb-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Leaderboard Pool</p>
                        <p className="text-xl font-black text-foreground">${leaderboardPool.toLocaleString()}</p>
                        <p className="text-[10px] text-foreground/40 font-medium">USDC</p>
                    </div>
                )}

                {/* Base reward */}
                {event.baseReward != null && event.baseReward > 0 && (
                    <div className="mb-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Per {mode === "vote" ? "Vote" : "Submission"}</p>
                        <p className="text-lg font-black text-foreground">${event.baseReward.toLocaleString()}</p>
                    </div>
                )}

                {/* Eligibility — posting phase only */}
                {mode === "post" && (
                    <div className="pb-4 mb-4 border-b border-border/40">
                        <div className="flex items-center gap-1.5 mb-2.5">
                            <ShieldCheck className="w-3 h-3 text-foreground/40" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Eligibility</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400/80 border border-orange-500/15">
                                Open to All Users
                            </span>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/50 border border-border/40">
                                1 Submission / User
                            </span>
                        </div>
                    </div>
                )}

                {/* Submission guidelines */}
                <div className={cn(mode !== "post" && "pt-4 border-t border-border/40")}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-3">
                        {mode === "vote" ? "Voting Guidelines" : "Posting Rules"}
                    </p>
                    <ol className="space-y-2.5">
                        {(mode === "vote"
                            ? [
                                "Tap any image to open full-screen preview.",
                                "Click the Vote button on your favourite entry.",
                                "Confirm your vote in the bottom bar (one vote only).",
                            ]
                            : (event.submissionGuidelines
                                ? event.submissionGuidelines.split("\n").filter(Boolean)
                                : [
                                    "Upload a high-res image (JPEG or PNG, max 5 MB).",
                                    "Aspect ratio: 4:5 or 1:1 preferred.",
                                    "Add an optional caption to describe your work.",
                                    "One submission per participant — make it count.",
                                    "No offensive, copyrighted   content.",
                                ])
                        ).map((rule, i) => (
                            <li key={i} className="flex gap-2.5 text-xs text-foreground/60">
                                <span className={cn(
                                    "w-4 h-4 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5",
                                    mode === "vote"
                                        ? "bg-lime-400/10 text-lime-400"
                                        : "bg-orange-500/10 text-orange-400"
                                )}>
                                    {i + 1}
                                </span>
                                {rule}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>

            {/* ── Vote status / Submit form ── */}
            {mode === "vote" && !isBrand && (
                <div className={cn(
                    "rounded-[20px] p-4 border space-y-3",
                    votedSubmissionId
                        ? "bg-lime-400/8 border-lime-400/25"
                        : "bg-lime-400/5 border-lime-400/20"
                )}>
                    {/* Top row: icon + text + thumbnail */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-lime-400/15 flex items-center justify-center shrink-0">
                            {votedSubmissionId
                                ? <CheckCircle2 className="w-4 h-4 text-lime-400" />
                                : <Vote className="w-4 h-4 text-lime-400" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-foreground">
                                {votedSubmissionId ? "Vote cast!" : "Cast your vote"}
                            </p>
                            <p className="text-xs text-foreground/40 mt-0.5">
                                {votedSubmissionId
                                    ? `You voted for @${votedSub?.user?.username || "this entry"}`
                                    : "Pick your favourite entry from the grid"}
                            </p>
                        </div>
                        {votedSub && (votedSub.imageUrl || votedSub.imageCid) && (
                            <img
                                src={votedSub.imageUrl || `${PINATA_GW}/${votedSub.imageCid}`}
                                className="w-10 h-10 rounded-xl object-cover border-2 border-lime-400/40 shrink-0"
                            />
                        )}
                    </div>
                    {/* Results countdown — only after vote confirmed */}
                    {votedSubmissionId && event.endTime && (
                        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-black/20 border border-lime-400/10">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-lime-400/60" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-lime-400/60">Results in</span>
                            </div>
                            <Countdown targetDate={event.endTime} label="" />
                        </div>
                    )}
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
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                                    >
                                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                                    </button>
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
    const [activeViewers, setActiveViewers] = useState<number>(0);
    const [participantCount, setParticipantCount] = useState<number>(0);
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

    const [gridView, setGridView] = useState(true);

    useEffect(() => {
        if (!socket || !id) return;
        socket.emit("join-event", id);
        const handleVoteUpdate = ({ submissionId, delta }: { submissionId: string; delta: number }) => {
            setSubmissions((subs) => subs.map((s) => s.id === submissionId ? { ...s, _count: { votes: (s._count?.votes ?? 0) + delta } } : s));
            setOptimisticVoteDelta((prev) => (prev === submissionId ? null : prev));
        };
        const handlePresenceUpdate = ({ activeCount }: { activeCount: number }) => setActiveViewers(activeCount);
        const handleParticipantUpdate = ({ delta }: { delta: number }) => {
            if (optimisticParticipantPending.current) {
                optimisticParticipantPending.current = false;
                // Already counted optimistically — skip the echo
            } else {
                setParticipantCount((c) => c + delta);
            }
        };
        socket.on("vote-update", handleVoteUpdate);
        socket.on("presence-update", handlePresenceUpdate);
        socket.on("participant-update", handleParticipantUpdate);
        return () => {
            socket.emit("leave-event", id);
            socket.off("vote-update", handleVoteUpdate);
            socket.off("presence-update", handlePresenceUpdate);
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
                setParticipantCount(publicEvent._count?.votes ?? 0);
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
        if (!event || votedSubmissionId) return;
        const sub = submissions.find((s) => s.id === submissionId);
        if (!sub) return;
        if (sub.userId === user?.id && event.eventType !== "vote_only") { toast.error("You can't vote for your own submission."); return; }
        // Toggle off if clicking the already-pending card
        setPendingVoteId((prev) => (prev === submissionId ? null : submissionId));
    }, [event, submissions, user?.id, votedSubmissionId]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const validation = validateImageFile(f);
        if (!validation.valid) { toast.error(validation.error); return; }
        if (preview) URL.revokeObjectURL(preview);
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const handleSubmit = async () => {
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
        if (!user?.id) { toast.error("Please sign in to generate images."); return; }
        setAiGenerating(true);
        // Revoke previous object URL to avoid memory leaks
        if (aiImageUrl && aiImageUrl.startsWith("blob:")) URL.revokeObjectURL(aiImageUrl);
        try {
            const res = await generateImage(aiPrompt.trim(), user.id, "user");
            if (res.success && res.image) {
                const objectUrl = base64ToObjectUrl(res.image.data, res.image.mimeType);
                const imgFile = base64ToFile(res.image.data, res.image.mimeType, `ai-generated-${Date.now()}.png`);
                setAiImageUrl(objectUrl);
                setAiImageFile(imgFile);
                setPreview(objectUrl);
                setFile(null);
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

    const displayMode: "post" | "vote" | "completed" | "upcoming" =
        event?.status === "completed" ? "completed"
            : event?.status === "posting" ? "post"
                : event?.status === "voting" || event?.eventType === "vote_only" ? "vote"
                    : "upcoming";

    const sortedSubmissions = [...enrichedSubmissions].sort((a, b) => (b._count?.votes || 0) - (a._count?.votes || 0));

    const pendingSub = pendingVoteId ? enrichedSubmissions.find((s) => s.id === pendingVoteId) : null;

    return (
        <SidebarLayout>
            {/* ── Floating Confirm Vote Bar ── */}
            <AnimatePresence>
                {pendingVoteId && !votedSubmissionId && (
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
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
                            <button type="button" onClick={() => goTo(previewIdx - 1)}
                                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        {/* Next */}
                        {hasNext && (
                            <button type="button" onClick={() => goTo(previewIdx + 1)}
                                className="absolute right-16 md:right-20 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}

                        {/* Counter */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                            <span className="text-[11px] font-black text-white/50">{previewIdx + 1} / {sortedSubmissions.length}</span>
                        </div>

                        <div className="w-full max-w-[960px] flex flex-col md:flex-row gap-6 items-center md:items-stretch max-h-[90vh]">
                            {/* Image */}
                            <div className="flex-1 flex items-center justify-center min-h-0">
                                <img
                                    src={previewSub.imageUrl || `${PINATA_GW}/${previewSub.imageCid}`}
                                    alt="Submission preview"
                                    className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain rounded-[18px] border border-white/15"
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
                    <Link href="/home" className="text-xs text-foreground/40 hover:text-foreground transition-colors">Home</Link>
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
                        <Link href="/home" className="text-xs font-black text-primary hover:underline">Back to home</Link>
                    </div>
                ) : event ? (
                    displayMode === "post" && !isBrand ? (
                        /* ══════════════════════════════════════════════
                           POSTING PHASE — upload-focused layout (users only)
                        ══════════════════════════════════════════════ */
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* ── Left: Upload hero ── */}
                            <div className="flex-1 min-w-0 space-y-5">

                                {/* Banner — same as standard layout */}
                                <div className="relative rounded-[24px] overflow-hidden h-[220px] md:h-[260px]">
                                    <img src={coverUrl} className="w-full h-full object-cover" alt="Event" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
                                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <div className="bg-orange-500/80 backdrop-blur-md border border-orange-400/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-white" />
                                                <span className="text-[10px] font-black text-white">Posting Open</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-0.5">{event.brand?.name}</p>
                                            <h1 className="font-display text-3xl md:text-[2.6rem] text-white leading-tight mb-1">{event.title}</h1>
                                            {event.description && (
                                                <p className="text-xs text-white/60 font-medium leading-relaxed line-clamp-2 max-w-[420px]">{event.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Already submitted ── */}
                                {hasSubmitted && mySubmission ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-[24px] border border-orange-500/25 bg-orange-500/5 overflow-hidden"
                                    >
                                        <div className="px-5 py-4 border-b border-orange-500/15 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-4 h-4 text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground">Entry Submitted!</p>
                                                <p className="text-[10px] text-foreground/40 font-medium">Voting begins when posting phase ends.</p>
                                            </div>
                                        </div>
                                        {(mySubmission.imageUrl || mySubmission.imageCid) && (
                                            <div className="p-4">
                                                <img
                                                    src={mySubmission.imageUrl || `${PINATA_GW}/${mySubmission.imageCid}`}
                                                    className="w-full max-h-[340px] object-cover rounded-[16px] border border-orange-500/15"
                                                    alt="Your submission"
                                                />
                                                {(mySubmission as any).caption && (
                                                    <p className="mt-3 text-sm text-foreground/60 font-medium leading-relaxed">{(mySubmission as any).caption}</p>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    /* ── Upload zone ── */
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-[24px] border border-border/40 bg-white/[0.02] overflow-hidden"
                                    >
                                        {/* Header */}
                                        <div className="px-5 pt-5 pb-4 border-b border-border/30 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                                <Upload className="w-4 h-4 text-orange-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-sm font-black text-foreground">Submit Your Entry</h2>
                                                <p className="text-[10px] text-foreground/40 font-medium">Upload or generate an image to compete for the reward pool</p>
                                            </div>
                                            {/* Mode toggle */}
                                            <div className="flex items-center bg-foreground/5 border border-border/40 rounded-xl p-0.5 shrink-0">
                                                <button
                                                    onClick={() => { setUploadMode("upload"); setAiImageUrl(null); if (!file) setPreview(null); }}
                                                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                                        uploadMode === "upload" ? "bg-orange-500 text-white shadow-sm" : "text-foreground/40 hover:text-foreground/70"
                                                    )}
                                                >
                                                    <Upload className="w-3 h-3" /> Upload
                                                </button>
                                                <button
                                                    onClick={() => { setUploadMode("ai"); setFile(null); if (!aiImageUrl) setPreview(null); }}
                                                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                                        uploadMode === "ai" ? "bg-purple-500 text-white shadow-sm" : "text-foreground/40 hover:text-foreground/70"
                                                    )}
                                                >
                                                    <Sparkles className="w-3 h-3" /> AI
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-5 space-y-4">
                                            {uploadMode === "upload" ? (
                                                /* ── Upload tab ── */
                                                <>
                                                    <div
                                                        onClick={() => fileRef.current?.click()}
                                                        className={cn(
                                                            "relative border-2 border-dashed rounded-[20px] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group",
                                                            preview
                                                                ? "border-orange-500/40 h-[320px] md:h-[400px]"
                                                                : "border-border/40 hover:border-orange-500/50 h-[220px] md:h-[280px] hover:bg-orange-500/[0.02]"
                                                        )}
                                                    >
                                                        {preview ? (
                                                            <>
                                                                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                                                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                                                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                                                                        <Upload className="w-3.5 h-3.5 text-white" />
                                                                        <span className="text-xs font-black text-white">Change Image</span>
                                                                    </div>
                                                                </div>
                                                                {/* Remove button */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); }}
                                                                    className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-red-500/80 transition-colors z-10"
                                                                >
                                                                    <X className="w-3.5 h-3.5 text-white" />
                                                                </button>
                                                                {/* View full size button */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                                                                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                                                                >
                                                                    <ZoomIn className="w-3.5 h-3.5 text-white" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-3 p-6 text-center">
                                                                <div className="w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-1 group-hover:bg-orange-500/15 transition-colors">
                                                                    <ImageIcon className="w-7 h-7 text-orange-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-foreground/70">Drop your image here</p>
                                                                    <p className="text-xs text-foreground/40 font-medium mt-1">or click to browse</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {["JPEG", "PNG", "WEBP"].map(fmt => (
                                                                        <span key={fmt} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-foreground/5 border border-border/40 text-foreground/30">{fmt}</span>
                                                                    ))}
                                                                    <span className="text-[9px] font-bold text-foreground/25">· max 5 MB</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileChange} />
                                                </>
                                            ) : (
                                                /* ── AI Generate tab ── */
                                                <div className="space-y-4">
                                                    {/* Prompt input */}
                                                    <div className="space-y-2">
                                                        <div className="relative">
                                                            <textarea
                                                                value={aiPrompt}
                                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                                placeholder={`Describe the image you want to generate for "${event.title}"…`}
                                                                rows={3}
                                                                className="w-full bg-foreground/[0.03] border border-border/40 rounded-xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-foreground/30 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={handleRefinePrompt}
                                                                disabled={!aiPrompt.trim() || aiRefining}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-wider hover:bg-purple-500/20 transition-all disabled:opacity-30"
                                                            >
                                                                {aiRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                                                Enhance Prompt
                                                            </button>
                                                            <p className="text-[10px] text-foreground/30 font-medium">AI will improve your description</p>
                                                        </div>
                                                    </div>

                                                    {/* Preview or generate CTA */}
                                                    {aiImageUrl ? (
                                                        <div className="relative rounded-[20px] overflow-hidden border border-purple-500/30 h-[280px] md:h-[360px] group/ai">
                                                            <img src={aiImageUrl} className="w-full h-full object-cover" alt="AI Generated" />
                                                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover/ai:opacity-100 transition-opacity gap-2">
                                                                <button
                                                                    onClick={() => handleAiGenerate()}
                                                                    disabled={!aiPrompt.trim() || aiGenerating}
                                                                    className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 disabled:opacity-40"
                                                                >
                                                                    <RefreshCw className="w-3.5 h-3.5 text-white" />
                                                                    <span className="text-xs font-black text-white">Regenerate</span>
                                                                </button>
                                                            </div>
                                                            {/* Remove button */}
                                                            <button
                                                                onClick={() => { if (aiImageUrl?.startsWith("blob:")) URL.revokeObjectURL(aiImageUrl); setAiImageUrl(null); setAiImageFile(null); setPreview(null); }}
                                                                className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-red-500/80 transition-colors z-10"
                                                            >
                                                                <X className="w-3.5 h-3.5 text-white" />
                                                            </button>
                                                            <div className="absolute top-3 right-3 bg-purple-500/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                                                <Sparkles className="w-3 h-3 text-white" />
                                                                <span className="text-[9px] font-black text-white uppercase tracking-widest">AI Generated</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={handleAiGenerate}
                                                            disabled={!aiPrompt.trim() || aiGenerating}
                                                            className="w-full h-[220px] md:h-[280px] border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 rounded-[20px] flex flex-col items-center justify-center gap-4 transition-all hover:bg-purple-500/[0.03] disabled:opacity-40 disabled:cursor-not-allowed group"
                                                        >
                                                            {aiGenerating ? (
                                                                <>
                                                                    <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                                                        <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-sm font-black text-foreground/70">Generating your image…</p>
                                                                        <p className="text-xs text-foreground/30 font-medium mt-1">This may take a few seconds</p>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/15 transition-colors">
                                                                        <Sparkles className="w-7 h-7 text-purple-400" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-sm font-black text-foreground/70">Generate with AI</p>
                                                                        <p className="text-xs text-foreground/30 font-medium mt-1">Enter a prompt above and click here</p>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Caption */}
                                            <textarea
                                                value={caption}
                                                onChange={(e) => setCaption(e.target.value)}
                                                placeholder="Add a caption to describe your entry… (optional)"
                                                rows={3}
                                                maxLength={280}
                                                className="w-full bg-secondary/40 border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 resize-none focus:outline-none focus:border-orange-500/50 transition-colors"
                                            />

                                            {/* Submit CTA */}
                                            <button
                                                onClick={handleSubmit}
                                                disabled={(!file && !aiImageFile) || submitting}
                                                className={cn(
                                                    "w-full py-4 text-white rounded-[14px] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                                                    aiImageUrl ? "bg-purple-500 hover:bg-purple-500/90" : "bg-orange-500 hover:bg-orange-500/90"
                                                )}
                                            >
                                                {submitting
                                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                                                    : aiImageUrl
                                                        ? <><Sparkles className="w-4 h-4" /> Submit AI Entry</>
                                                        : <><Upload className="w-4 h-4" /> Submit Entry</>
                                                }
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── Rules & Eligibility ── */}
                                <div className="rounded-[24px] border border-border/40 bg-white/[0.02] p-5 space-y-5">
                                    {/* Eligibility */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ShieldCheck className="w-3.5 h-3.5 text-foreground/40" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Eligibility</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                Open to All Users
                                            </span>
                                            <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-foreground/5 text-foreground/50 border border-border/40">
                                                1 Submission / User
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rules */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Info className="w-3.5 h-3.5 text-foreground/40" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Submission Rules</p>
                                        </div>
                                        <ol className="space-y-3">
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
                                                <li key={i} className="flex gap-3 text-sm text-foreground/60 leading-relaxed">
                                                    <span className="w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                                        {i + 1}
                                                    </span>
                                                    {rule}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Event description */}
                                    {event.description && (
                                        <div className="pt-4 border-t border-border/30">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">About This Event</p>
                                            <p className="text-sm text-foreground/60 leading-relaxed">{event.description}</p>
                                        </div>
                                    )}
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
                                    {/* Event info card */}
                                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                                        {/* Brand */}
                                        <div className="flex items-center gap-3 mb-4">
                                            {event.brand?.logoCid ? (
                                                <img src={`${PINATA_GW}/${event.brand.logoCid}`} className="w-10 h-10 rounded-xl object-cover border border-border/40" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 flex items-center justify-center">
                                                    <span className="text-xs font-black text-[#A78BFA]">{event.brand?.name?.[0] ?? "B"}</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-foreground truncate">{event.brand?.name}</p>
                                                <p className="text-[10px] text-foreground/40 font-medium">Event Host</p>
                                            </div>
                                        </div>

                                        {/* Countdown */}
                                        {event.postingEnd && (
                                            <div className="flex items-center justify-between py-3 px-3 rounded-[12px] bg-orange-500/8 border border-orange-500/20 mb-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-orange-400" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400/80">Posting Ends In</span>
                                                </div>
                                                <Countdown targetDate={event.postingEnd} label="" />
                                            </div>
                                        )}

                                        {/* Posting rules (no participant count during posting) */}
                                        <div className="py-3 border-t border-border/30 space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">How It Works</span>
                                            <div className="flex items-start gap-2.5 mt-2">
                                                <div className="w-5 h-5 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Upload className="w-2.5 h-2.5 text-orange-400" />
                                                </div>
                                                <p className="text-[11px] text-foreground/60 leading-snug">
                                                    <span className="font-black text-foreground/80">One post per user.</span> Submit your best creative entry before time runs out.
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-5 h-5 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Vote className="w-2.5 h-2.5 text-lime-400" />
                                                </div>
                                                <p className="text-[11px] text-foreground/60 leading-snug">
                                                    <span className="font-black text-foreground/80">Voters are participants.</span> Participant count tracks votes cast — not posts — during the voting phase.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Viewers */}
                                        {activeViewers > 0 && (
                                            <div className="flex items-center justify-between py-3 border-t border-border/30">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Watching Now</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                                                    </span>
                                                    <span className="text-sm font-black text-green-400">{activeViewers}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Social links */}
                                        <SocialLinks links={(event.brand as any)?.socialLinks} />
                                    </div>

                                    {/* Rewards card */}
                                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-4 h-4 text-[#A78BFA]" />
                                                <span className="text-sm font-black text-foreground">Rewards Pool</span>
                                            </div>
                                            <span className="text-[9px] bg-[#A78BFA]/10 text-[#A78BFA] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#A78BFA]/20">
                                                Guaranteed
                                            </span>
                                        </div>
                                        {(event.topReward ?? event.leaderboardPool ?? 0) > 0 && (
                                            <div className="bg-[#A78BFA]/5 border border-[#A78BFA]/15 rounded-[14px] p-4 mb-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Grand-Prize Winner</p>
                                                <p className="text-2xl font-black text-foreground">${(event.topReward ?? event.leaderboardPool ?? 0).toLocaleString()}</p>
                                                <p className="text-[10px] text-foreground/40 font-medium">USDC</p>
                                            </div>
                                        )}
                                        {(event.leaderboardPool ?? 0) > 0 && (
                                            <div className="mb-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Leaderboard Pool</p>
                                                <p className="text-xl font-black text-foreground">${(event.leaderboardPool ?? 0).toLocaleString()}</p>
                                                <p className="text-[10px] text-foreground/40">USDC</p>
                                            </div>
                                        )}
                                        {(event.baseReward ?? 0) > 0 && (
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Per Submission</p>
                                                <p className="text-lg font-black text-foreground">${(event.baseReward ?? 0).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ══════════════════════════════════════════════
                           STANDARD LAYOUT — voting / completed / upcoming
                        ══════════════════════════════════════════════ */
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* ── Left column ── */}
                            <div className="flex-1 min-w-0">
                                {/* Banner card */}
                                <div className="relative rounded-[24px] overflow-hidden h-[220px] md:h-[260px] mb-5">
                                    <img src={coverUrl} className="w-full h-full object-cover" alt="Event" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
                                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {event.status !== "completed" && (
                                                <div className="bg-black/30 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-white/60" />
                                                    <span className="text-[10px] font-black text-white">Voting phase</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h1 className="font-display text-3xl md:text-[2.6rem] text-white leading-tight mb-1">{event.title}</h1>
                                            {event.description && (
                                                <p className="text-xs text-white/60 font-medium leading-relaxed line-clamp-2 max-w-[420px] mb-4">{event.description}</p>
                                            )}
                                            {displayMode === "vote" && !votedSubmissionId && !isBrand && (
                                                <div className="px-5 py-2.5 bg-lime-400 text-black rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                                    <ThumbsUp className="w-3.5 h-3.5" /> Vote Below
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Count + View toggle */}
                                {displayMode !== "upcoming" && (
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
                                    <CompletedView event={event} submissions={enrichedSubmissions} currentUserId={user?.id} gridView={gridView} />
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
                                                        disabled={!!votedSubmissionId || (event.eventType !== "vote_only" && sub.userId === user?.id)}
                                                        optionIndex={event.eventType === "vote_only" ? idx : undefined}
                                                        showVoteCount={false}
                                                        listView={!gridView}
                                                        hideCreator={event.eventType === "vote_only"}
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
                                        activeViewers={activeViewers}
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

function CompletedView({ event, submissions, currentUserId, gridView }: {
    event: Event;
    submissions: Submission[];
    currentUserId?: string | null;
    gridView: boolean;
}) {
    const winners = submissions.filter((s) => s.rank && s.rank <= 3).sort((a, b) => (a.rank || 0) - (b.rank || 0));
    const others = submissions.filter((s) => !s.rank || s.rank > 3).sort((a, b) => (b._count?.votes || 0) - (a._count?.votes || 0));
    const medalColors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
    const medalIcons = [Crown, Medal, Medal];

    return (
        <div className="space-y-10">
            {winners.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-5">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <h2 className="text-sm font-black text-foreground tracking-tighter uppercase">Hall of Fame</h2>
                        <span className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest">Final results</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {winners.map((sub, i) => {
                            const Icon = medalIcons[i] || Medal;
                            return (
                                <div key={sub.id} className="relative">
                                    <div className={cn(
                                        "absolute -top-3 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                        i === 0 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                                            i === 1 ? "bg-slate-500/20 text-slate-300 border border-slate-500/30" :
                                                "bg-amber-700/20 text-amber-500 border border-amber-700/30"
                                    )}>
                                        <Icon className={cn("w-3 h-3", medalColors[i])} />
                                        {i === 0 ? "Winner" : `#${i + 1}`}
                                    </div>
                                    <PostSubmissionCard submission={toPostSubmission(sub, currentUserId)} showVoteCount={true} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {others.length > 0 && (
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-4">
                        All Participants ({others.length})
                    </h3>
                    <div className={gridView ? "grid grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
                        {others.map((sub) => <PostSubmissionCard key={sub.id} submission={toPostSubmission(sub, currentUserId)} showVoteCount={true} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
