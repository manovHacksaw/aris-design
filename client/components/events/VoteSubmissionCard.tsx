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
}: VoteSubmissionCardProps) {
    const [imgError, setImgError] = useState(false);

    const isCloudinary = submission.media?.includes('cloudinary.com');

    return (
        <motion.div
            whileHover={!disabled ? { y: -3, scale: 1.01 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            className={cn(
                "relative rounded-[24px] overflow-hidden transition-all duration-200",
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
                    <div className="w-full h-full relative flex flex-col">
                        <button
                            type="button"
                            onClick={onOpenImage}
                            className={cn(
                                "w-full flex-1 relative overflow-hidden text-left min-h-0",
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
                        {submission.textContent && (
                            <div className="w-full bg-card px-3 py-2 z-10 relative border-t border-border/30">
                                <p className="text-[13px] font-semibold text-foreground/80 line-clamp-2">
                                    {submission.textContent}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Top gradient for creator info */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

                {/* Rank / Option badge */}
                {optionIndex !== undefined ? (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                        <span className="text-[10px] font-black text-foreground/70 tracking-wide">
                            Option {optionIndex + 1}
                        </span>
                    </div>
                ) : submission.rank ? (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                        <span className={cn(
                            "text-[10px] font-black tracking-wide",
                            submission.rank === 1 ? "text-yellow-400" :
                            submission.rank === 2 ? "text-slate-300" :
                            submission.rank === 3 ? "text-amber-500" :
                            "text-foreground/70"
                        )}>
                            #{submission.rank}
                        </span>
                    </div>
                ) : null}

                {/* Creator info top-right */}
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

                {/* Bottom gradient (only needed if text isn't occupying the bottom space) */}
                {(!submission.textContent || submission.mediaType === "text") && (
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                )}

                {/* Bottom: vote count + vote button */}
                <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
                    {showVoteCount && (
                        <div className="flex items-center gap-1.5 drop-shadow-md">
                            <Vote className={cn("w-3.5 h-3.5", (!submission.textContent || submission.mediaType === "text") ? "text-white/60" : "text-foreground/60")} />
                            <span className={cn("text-xs font-black", (!submission.textContent || submission.mediaType === "text") ? "text-white/80" : "text-foreground/80")}>
                                {formatCount(submission.voteCount)}
                            </span>
                        </div>
                    )}

                    {/* Vote CTA */}
                    {isVoted ? (
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
                                : "bg-white/15 backdrop-blur-md border border-white/20 hover:bg-primary hover:border-primary group-hover:scale-105"
                        )}>
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">
                                {submission.isOwn ? "My Content" : "Vote"}
                            </span>
                        </button>
                    )}
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
