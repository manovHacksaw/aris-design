"use client";

import { motion } from "framer-motion";
import { Check, Vote, ImageIcon, Circle, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoteSubmission } from "@/types/events";
import { formatCount } from "@/lib/eventUtils";
import Image from "next/image";
import { useState } from "react";

interface VoteSubmissionCardProps {
    submission: VoteSubmission;
    isVoted: boolean;
    isPending?: boolean;
    disabled: boolean;
    onVote: () => void;
    onOpenImage?: () => void;
    optionIndex?: number;
    showVoteCount?: boolean;
    listView?: boolean;
    hideCreator?: boolean;
}

export default function VoteSubmissionCard({
    submission,
    isVoted,
    isPending = false,
    disabled,
    onVote,
    onOpenImage,
    optionIndex,
    showVoteCount = false,
    listView = false,
    hideCreator = false,
}: VoteSubmissionCardProps) {
    const [imgError, setImgError] = useState(false);

    const isCloudinary = submission.media?.includes('cloudinary.com');

    // ── List view ─────────────────────────────────────────────────────────────
    if (listView) {
        return (
            <motion.div
                whileHover={!disabled ? { x: 2 } : undefined}
                whileTap={!disabled ? { scale: 0.99 } : undefined}
                onClick={hideCreator && !disabled && !isVoted && !isPending ? onVote : undefined}
                className={cn(
                    "group flex items-center gap-4 rounded-2xl p-3 transition-all duration-200 border",
                    hideCreator && !disabled && !isVoted && !isPending && "cursor-pointer",
                    isVoted
                        ? "border-lime-400/60 bg-lime-400/8 shadow-[0_0_0_2px_rgba(163,230,53,0.2)]"
                        : isPending
                            ? "border-lime-400/40 bg-lime-400/5"
                            : "border-border hover:border-white/20 bg-card",
                    disabled && !isVoted && !isPending && "opacity-25 grayscale",
                )}
            >
                {/* Thumbnail */}
                <button
                    type="button"
                    onClick={onOpenImage}
                    className={cn(
                        "relative shrink-0 w-[88px] h-[88px] rounded-xl overflow-hidden bg-secondary",
                        onOpenImage ? "cursor-zoom-in" : "cursor-default",
                    )}
                >
                    {submission.mediaType === "text" ? (
                        <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-card to-secondary">
                            <p className="text-[10px] font-bold text-foreground text-center leading-snug line-clamp-4">
                                {submission.textContent}
                            </p>
                        </div>
                    ) : imgError || !submission.media ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-foreground/20" />
                        </div>
                    ) : isCloudinary ? (
                        <Image
                            src={submission.media}
                            alt="Submission"
                            fill
                            sizes="88px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <img
                            src={submission.media}
                            alt="Submission"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={() => setImgError(true)}
                        />
                    )}
                    {onOpenImage && submission.mediaType !== "text" && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                    {/* Rank badge */}
                    {submission.rank && submission.rank <= 3 && (
                        <div className="absolute top-1 left-1 bg-background/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10">
                            <span className="text-[9px] font-black text-foreground">#{submission.rank}</span>
                        </div>
                    )}
                </button>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    {submission.textContent && submission.mediaType !== "text" ? (
                        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-1">
                            {submission.textContent}
                        </p>
                    ) : submission.mediaType === "text" ? null : (
                        <p className="text-sm font-semibold text-foreground/40 leading-snug mb-1">No caption</p>
                    )}
                    {!hideCreator && (
                        <div className="flex items-center gap-1.5 mt-1">
                            <img
                                className="w-4 h-4 rounded-full border border-white/10"
                                src={submission.creator.avatar}
                                alt={submission.creator.name}
                            />
                            <span className="text-[11px] font-bold text-foreground/50">@{submission.creator.handle}</span>
                        </div>
                    )}
                    {showVoteCount && (
                        <div className="flex items-center gap-1 mt-1.5">
                            <Vote className="w-3 h-3 text-foreground/30" />
                            <span className="text-[11px] font-black text-foreground/40">{formatCount(submission.voteCount)}</span>
                        </div>
                    )}
                </div>

                {/* Vote action */}
                <div className="shrink-0">
                    {isVoted ? (
                        <div className="flex items-center gap-1.5 bg-lime-400 px-3 py-2 rounded-xl shadow">
                            <Check className="w-3.5 h-3.5 text-black" />
                            <span className="text-[11px] font-black text-black uppercase tracking-wide">Voted</span>
                        </div>
                    ) : isPending ? (
                        <div className="flex items-center gap-1.5 bg-lime-400 px-3 py-2 rounded-xl shadow">
                            <Circle className="w-2.5 h-2.5 fill-black text-black" />
                            <span className="text-[11px] font-black text-black uppercase tracking-wide">Selected</span>
                        </div>
                    ) : !hideCreator ? (
                        <button
                            type="button"
                            onClick={onVote}
                            disabled={disabled}
                            className={cn(
                                "px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all",
                                disabled
                                    ? "bg-foreground/5 border border-border text-foreground/20"
                                    : "bg-foreground/8 border border-border text-foreground/60 hover:bg-primary hover:border-primary hover:text-white"
                            )}
                        >
                            {submission.isOwn ? "Mine" : "Vote"}
                        </button>
                    ) : null}
                </div>
            </motion.div>
        );
    }

    // ── Grid view (default) ───────────────────────────────────────────────────
    return (
        <motion.div
            whileHover={!disabled ? { y: -3, scale: 1.01 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            onClick={hideCreator && !disabled && !isVoted && !isPending ? onVote : undefined}
            className={cn(
                "group relative rounded-[24px] overflow-hidden transition-all duration-200",
                hideCreator && !disabled && !isVoted && !isPending && "cursor-pointer",
                "border-2",
                isVoted
                    ? "border-lime-400 shadow-[0_0_0_4px_rgba(163,230,53,0.25)]"
                    : isPending
                        ? "border-lime-400/70 shadow-[0_0_0_4px_rgba(163,230,53,0.12)]"
                        : "border-transparent hover:border-white/20",
                disabled && !isVoted && !isPending && "opacity-25 grayscale",
                !disabled && "hover:shadow-2xl"
            )}
        >
            {/* Portrait image container */}
            <div className="relative bg-secondary overflow-hidden aspect-[3/4]">
                {submission.mediaType === "text" ? (
                    <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-card to-secondary">
                        <p className="text-base font-bold text-foreground text-center leading-relaxed">
                            {submission.textContent}
                        </p>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onOpenImage}
                        className={cn(
                            "w-full h-full relative overflow-hidden text-left block",
                            onOpenImage ? "cursor-zoom-in" : "cursor-default"
                        )}
                    >
                        {imgError || !submission.media ? (
                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                                <ImageIcon className="w-8 h-8 text-foreground/20" />
                            </div>
                        ) : isCloudinary ? (
                            <Image
                                src={submission.media}
                                alt="Submission"
                                fill
                                sizes="(max-width: 768px) 50vw, 33vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <img
                                src={submission.media}
                                alt="Submission"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={() => setImgError(true)}
                            />
                        )}
                    </button>
                )}

                {/* Top gradient for creator info */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

                {/* Rank badge */}
                {submission.rank && submission.rank <= 3 ? (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                        <span className="text-[10px] font-black text-foreground tracking-wide">
                            #{submission.rank}
                        </span>
                    </div>
                ) : null}

                {/* Creator info top-right (hidden for vote_only events) */}
                {!hideCreator && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <img
                            className="w-6 h-6 rounded-full border-2 border-white/20"
                            src={submission.creator.avatar}
                            alt={submission.creator.name}
                        />
                        <span className="text-[11px] font-bold text-white/90 drop-shadow-sm">
                            @{submission.creator.handle}
                        </span>
                    </div>
                )}

                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                {/* Caption — hidden by default, slides up on hover */}
                {submission.textContent && submission.mediaType !== "text" && (
                    <div className={cn(
                        "absolute inset-x-0 bottom-14 px-3 pb-1 pointer-events-none",
                        "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
                        "transition-all duration-200"
                    )}>
                        <p className="text-[12px] font-semibold text-white/90 drop-shadow line-clamp-2">
                            {submission.textContent}
                        </p>
                    </div>
                )}

                {/* Bottom: vote count + vote button */}
                <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
                    {showVoteCount && (
                        <div className="flex items-center gap-1.5 drop-shadow-md">
                            <Vote className="w-3.5 h-3.5 text-white/60" />
                            <span className="text-xs font-black text-white/80">
                                {formatCount(submission.voteCount)}
                            </span>
                        </div>
                    )}

                    {/* Vote CTA — hidden for vote_only cards (whole card is clickable) */}
                    {!hideCreator && (isVoted ? (
                        <div className="flex items-center gap-2 bg-lime-400 px-4 py-2 rounded-full shadow-lg">
                            <Check className="w-3.5 h-3.5 text-black" />
                            <span className="text-[11px] font-black text-black uppercase tracking-wider">Voted</span>
                        </div>
                    ) : isPending ? (
                        <div className="flex items-center gap-2 bg-lime-400 px-4 py-2 rounded-full shadow-lg">
                            <Circle className="w-2.5 h-2.5 fill-black text-black" />
                            <span className="text-[11px] font-black text-black uppercase tracking-wider">Selected</span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onVote}
                            disabled={disabled}
                            className={cn(
                                "px-4 py-2 rounded-full transition-all",
                                disabled
                                    ? "bg-white/10 border border-white/10"
                                    : "bg-white/15 backdrop-blur-md border border-white/20 hover:bg-primary hover:border-primary"
                            )}>
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">
                                {submission.isOwn ? "My Content" : "Vote"}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Voted / Pending overlay */}
                {isVoted && (
                    <div className="absolute inset-0 bg-lime-400/10 pointer-events-none" />
                )}
                {isPending && (
                    <div className="absolute inset-0 bg-lime-400/8 pointer-events-none" />
                )}

                {/* Voted badge for vote_only cards (no CTA button) */}
                {isVoted && hideCreator && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-lime-400 px-4 py-2 rounded-full shadow-lg">
                        <Check className="w-3.5 h-3.5 text-black" />
                        <span className="text-[11px] font-black text-black uppercase tracking-wider">Voted</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
