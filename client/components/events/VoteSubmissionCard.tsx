"use client";

import { motion } from "framer-motion";
import { ThumbsUp, ImageIcon, Circle, Share2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoteSubmission } from "@/types/events";
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

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname}`;
        if (navigator.share) {
            navigator.share({ url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url);
        }
    };

    /* ── LIST VIEW ─────────────────────────────────────────────────── */
    if (listView) {
        const hasImage = submission.mediaType !== "text" && !imgError && submission.media;
        return (
            <motion.div
                whileTap={!disabled ? { scale: 0.99 } : undefined}
                className={cn(
                    "flex items-center gap-6 px-5 py-4 rounded-[24px] transition-all duration-200 border-2",
                    isVoted
                        ? "border-lime-400 bg-lime-400/5 shadow-[0_0_0_4px_rgba(163,230,53,0.15)]"
                        : isPending
                            ? "border-lime-400/50 bg-white/[0.04]"
                            : "border-transparent bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10",
                )}
            >
                {/* Thumbnail */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-white/[0.05] border border-white/5">
                    {hasImage ? (
                        isCloudinary ? (
                            <Image src={submission.media!} alt="" fill sizes="80px" className="object-cover" onError={() => setImgError(true)} />
                        ) : (
                            <img src={submission.media} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
                        )
                    ) : submission.mediaType === "text" ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-secondary p-2">
                            <span className="text-[10px] font-bold text-foreground/40 text-center leading-tight line-clamp-3">{submission.textContent}</span>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-foreground/20" />
                        </div>
                    )}
                    {isVoted && <div className="absolute inset-0 bg-lime-400/15 pointer-events-none" />}
                </div>
                
                {/* Caption */}
                <div className="flex-1 min-w-0">
                    {optionIndex !== undefined ? (
                        <p className="text-xl font-black text-foreground uppercase tracking-tight">
                            Option {optionIndex + 1}
                        </p>
                    ) : (
                        <p className="text-lg font-black text-foreground uppercase tracking-tight">
                            @{submission.creator.handle}
                        </p>
                    )}
                    {submission.mediaType === "text" && submission.textContent && (
                        <p className="text-sm text-foreground/50 leading-relaxed mt-1 line-clamp-2">{submission.textContent}</p>
                    )}
                    {showVoteCount && (
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                            <p className="text-[11px] font-black text-lime-400/70 uppercase tracking-widest">{submission.voteCount?.toLocaleString() ?? 0} votes</p>
                        </div>
                    )}
                </div>

                {/* Vote button */}
                <div className="shrink-0 ml-4">
                    {submission.isOwn ? (
                        <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center" title="Your submission">
                            <ThumbsUp className="w-5 h-5 text-white/20" />
                        </div>
                    ) : isVoted ? (
                        <div className="w-12 h-12 rounded-full bg-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.5)] flex items-center justify-center border-4 border-black/20">
                            <ThumbsUp className="w-5 h-5 text-black fill-black" />
                        </div>
                    ) : isPending ? (
                        <div className="w-12 h-12 rounded-full bg-lime-400/70 flex items-center justify-center animate-pulse">
                            <Circle className="w-3 h-3 fill-black text-black" />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onVote(); }}
                            disabled={disabled}
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                                disabled
                                    ? "bg-black/30 border border-white/10 cursor-not-allowed opacity-50"
                                    : "bg-white/5 border border-white/15 hover:bg-lime-400 hover:border-lime-400 hover:text-black hover:scale-105 active:scale-95"
                            )}
                        >
                            <ThumbsUp className={cn("w-5 h-5", disabled ? "text-white/20" : "text-white")} />
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            whileHover={!disabled ? { y: -3 } : undefined}
            whileTap={!disabled ? { scale: 0.99 } : undefined}
            className={cn(
                "rounded-[24px] overflow-hidden transition-all duration-200 border-2",
                isVoted
                    ? "border-lime-400 shadow-[0_0_0_4px_rgba(163,230,53,0.18)]"
                    : isPending
                        ? "border-lime-400/60"
                        : "border-transparent hover:border-white/15",
                !disabled && "hover:shadow-2xl"
            )}
        >
            {/* Image */}
            <div
                role={onOpenImage ? "button" : undefined}
                tabIndex={onOpenImage ? -1 : undefined}
                onClick={onOpenImage}
                className={cn(
                    "relative bg-black overflow-hidden aspect-[3/4]",
                    onOpenImage ? "cursor-zoom-in" : undefined
                )}
            >
                {submission.mediaType === "text" ? (
                    <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-card to-secondary">
                        <p className="text-base font-bold text-foreground text-center leading-relaxed">
                            {submission.textContent}
                        </p>
                    </div>
                ) : imgError || !submission.media ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-secondary/50 gap-3 text-center">
                        <ImageIcon className="w-8 h-8 text-foreground/20" />
                        {submission.textContent && (
                            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed line-clamp-3">
                                {submission.textContent}
                            </p>
                        )}
                    </div>
                ) : isCloudinary ? (
                    <Image
                        src={submission.media}
                        alt="Submission"
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <img
                        src={submission.media}
                        alt="Submission"
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                )}

                {/* Voted tint */}
                {isVoted && <div className="absolute inset-0 bg-lime-400/10 pointer-events-none" />}

                {/* "Your Vote" badge */}
                {isVoted && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-lime-400 px-2.5 py-1.5 rounded-full shadow-lg pointer-events-none">
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                        <span className="text-[11px] font-black text-black leading-none">Your Vote</span>
                    </div>
                )}
            </div>

            {/* Caption + buttons below image */}
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white/[0.03]">
                <div className="flex items-center gap-2 min-w-0">
                    {optionIndex !== undefined ? (
                        <span className="text-[12px] font-bold text-foreground/60 truncate">
                            Option {optionIndex + 1}
                        </span>
                    ) : (
                        <>
                            <img
                                className="w-5 h-5 rounded-full border border-white/20 object-cover shrink-0"
                                src={submission.creator.avatar}
                                alt={submission.creator.name}
                            />
                            <span className="text-[12px] font-bold text-foreground/60 truncate">
                                @{submission.creator.handle}
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Share */}
                    <button
                        type="button"
                        onClick={handleShare}
                        className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Vote */}
                    {submission.isOwn ? (
                        <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center" title="Your submission">
                            <ThumbsUp className="w-3.5 h-3.5 text-white/20" />
                        </div>
                    ) : isVoted ? (
                        <div className="w-8 h-8 rounded-full bg-lime-400 shadow-[0_0_14px_rgba(163,230,53,0.5)] flex items-center justify-center">
                            <ThumbsUp className="w-3.5 h-3.5 text-black fill-black" />
                        </div>
                    ) : isPending ? (
                        <div className="w-8 h-8 rounded-full bg-lime-400/80 flex items-center justify-center">
                            <Circle className="w-2.5 h-2.5 fill-black text-black" />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onVote(); }}
                            disabled={disabled}
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                disabled
                                    ? "bg-black/30 border border-white/10 cursor-not-allowed"
                                    : "bg-white/[0.06] border border-white/10 hover:bg-lime-400 hover:border-lime-400 hover:text-black active:scale-95"
                            )}
                        >
                            <ThumbsUp className={cn("w-3.5 h-3.5", disabled ? "text-white/20" : "text-white")} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
