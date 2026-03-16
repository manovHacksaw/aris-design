"use client";

import { motion } from "framer-motion";
import { Check, Vote, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoteSubmission } from "@/types/events";
import { formatCount } from "@/lib/eventUtils";
import Image from "next/image";
import { useState } from "react";

interface VoteSubmissionCardProps {
    submission: VoteSubmission;
    isVoted: boolean;
    disabled: boolean;
    onVote: () => void;
    optionIndex?: number;
}

export default function VoteSubmissionCard({
    submission,
    isVoted,
    disabled,
    onVote,
    optionIndex,
}: VoteSubmissionCardProps) {
    const [imgError, setImgError] = useState(false);

    const handleClick = () => {
        if (!disabled) onVote();
    };

    const isCloudinary = submission.media?.includes('cloudinary.com');

    return (
        <motion.div
            whileHover={!disabled ? { y: -3, scale: 1.01 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            onClick={handleClick}
            className={cn(
                "relative rounded-[24px] overflow-hidden cursor-pointer transition-all duration-200",
                "border-2",
                isVoted
                    ? "border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
                    : "border-transparent hover:border-white/20",
                disabled && !isVoted && "opacity-40 cursor-default",
                !disabled && "hover:shadow-2xl"
            )}
        >
            {/* Portrait image container */}
            <div className="relative aspect-[3/4] bg-secondary overflow-hidden">
                {submission.mediaType === "text" ? (
                    <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-card to-secondary">
                        <p className="text-base font-bold text-foreground text-center leading-relaxed">
                            {submission.textContent}
                        </p>
                    </div>
                ) : (
                    <div className="w-full h-full relative flex flex-col">
                        <div className={cn("w-full relative overflow-hidden", submission.textContent ? "h-[70%]" : "h-full")}>
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
                        </div>
                        {submission.textContent && (
                            <div className="h-[30%] w-full bg-card p-4 pt-3 flex flex-col justify-start z-10 relative border-t border-border/30">
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
                ) : submission.rank && submission.rank <= 3 ? (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                        <span className="text-[10px] font-black text-foreground tracking-wide">
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
                    <div className="flex items-center gap-1.5 drop-shadow-md">
                        <Vote className={cn("w-3.5 h-3.5", (!submission.textContent || submission.mediaType === "text") ? "text-white/60" : "text-foreground/60")} />
                        <span className={cn("text-xs font-black", (!submission.textContent || submission.mediaType === "text") ? "text-white/80" : "text-foreground/80")}>
                            {formatCount(submission.voteCount)}
                        </span>
                    </div>

                    {/* Vote CTA */}
                    {isVoted ? (
                        <div className="flex items-center gap-2 bg-primary px-4 py-2 rounded-full shadow-lg">
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">Voted</span>
                        </div>
                    ) : (
                        <div className={cn(
                            "px-4 py-2 rounded-full transition-all",
                            disabled
                                ? "bg-white/10 border border-white/10"
                                : "bg-white/15 backdrop-blur-md border border-white/20 hover:bg-primary hover:border-primary group-hover:scale-105"
                        )}>
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">
                                {disabled ? "Closed" : "Vote"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Voted overlay */}
                {isVoted && (
                    <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                )}
            </div>
        </motion.div>
    );
}
