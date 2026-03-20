"use client";

import { motion } from "framer-motion";
import { Check, Vote, ImageIcon, Circle } from "lucide-react";
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
    const hasCaption = submission.mediaType !== "text" && !!submission.textContent;

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
                    ? "border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
                    : isPending
                        ? "border-lime-400/70 shadow-[0_0_0_4px_rgba(163,230,53,0.12)]"
                        : "border-transparent hover:border-white/20",
                disabled && !isVoted && !isPending && "opacity-40",
                !disabled && "hover:shadow-2xl"
            )}
        >
            {/* Portrait image container */}
            <div
                className={cn(
                    "relative bg-secondary overflow-hidden",
                    listView ? "aspect-[16/9]" : "aspect-[3/4]"
                )}
            >
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

                {/* Rank badge (no Option pills) */}
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
                {hasCaption && (
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
                    <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                )}
                {isPending && (
                    <div className="absolute inset-0 bg-lime-400/8 pointer-events-none" />
                )}
            </div>
        </motion.div>
    );
}
