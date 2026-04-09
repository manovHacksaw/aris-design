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

    return (
        <motion.div
            whileHover={!disabled ? { y: -3 } : undefined}
            whileTap={!disabled ? { scale: 0.99 } : undefined}
            className={cn(
                "relative rounded-[24px] overflow-hidden transition-all duration-200",
                "border-2",
                isVoted
                    ? "border-lime-400 shadow-[0_0_0_4px_rgba(163,230,53,0.18)]"
                    : isPending
                        ? "border-lime-400/60"
                        : "border-transparent hover:border-white/15",
                disabled && !isVoted && !isPending && "",
                !disabled && "hover:shadow-2xl"
            )}
        >
            {/* Image fills the card */}
            <div
                role={onOpenImage ? "button" : undefined}
                tabIndex={onOpenImage ? -1 : undefined}
                onClick={onOpenImage}
                className={cn(
                    "relative bg-black overflow-hidden",
                    "aspect-3/4",
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
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <ImageIcon className="w-8 h-8 text-foreground/20" />
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

                {/* Voted tint overlay */}
                {isVoted && <div className="absolute inset-0 bg-lime-400/10 pointer-events-none" />}

                {/* "Your Vote" badge — top left */}
                {isVoted && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-lime-400 px-2.5 py-1.5 rounded-full shadow-lg pointer-events-none">
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                        <span className="text-[11px] font-black text-black leading-none">Your Vote</span>
                    </div>
                )}

                {/* Creator info top-right — hidden for vote_only */}
                {optionIndex === undefined && !isVoted && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
                        <img
                            className="w-6 h-6 rounded-full border-2 border-white/20 object-cover"
                            src={submission.creator.avatar}
                            alt={submission.creator.name}
                        />
                        <span className="text-[11px] font-bold text-white/90 drop-shadow">
                            @{submission.creator.handle}
                        </span>
                    </div>
                )}

                {/* Bottom gradient — only show when voted or pending (to frame the voted card's label) */}
                {(isVoted || isPending || !disabled) && (
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />
                )}

                {/* Bottom bar: caption left, buttons right */}
                <div className="absolute bottom-0 inset-x-0 px-3.5 pb-3.5 flex items-end justify-between gap-2 z-10">
                    {/* Caption */}
                    <div className="flex-1 min-w-0">
                        {submission.textContent && (
                            <p className="text-[13px] font-bold text-white leading-snug line-clamp-2 drop-shadow">
                                {submission.textContent}
                            </p>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Share */}
                        <button
                            type="button"
                            onClick={handleShare}
                            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>

                        {/* Vote */}
                        {submission.isOwn ? (
                            <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center" title="Your submission">
                                <ThumbsUp className="w-4 h-4 text-white/20" />
                            </div>
                        ) : isVoted ? (
                            <div className="w-10 h-10 rounded-full bg-lime-400 shadow-[0_0_14px_rgba(163,230,53,0.5)] flex items-center justify-center">
                                <ThumbsUp className="w-4 h-4 text-black fill-black" />
                            </div>
                        ) : isPending ? (
                            <div className="w-10 h-10 rounded-full bg-lime-400/80 flex items-center justify-center">
                                <Circle className="w-2.5 h-2.5 fill-black text-black" />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onVote(); }}
                                disabled={disabled}
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                    disabled
                                        ? "bg-black/30 border border-white/10 cursor-not-allowed"
                                        : "bg-black/50 backdrop-blur-md border border-white/20 hover:bg-lime-400 hover:border-lime-400 hover:text-black active:scale-95"
                                )}
                            >
                                <ThumbsUp className={cn("w-4 h-4", disabled ? "text-white/20" : "text-white")} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
