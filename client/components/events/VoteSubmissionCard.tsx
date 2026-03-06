"use client";

import { motion } from "framer-motion";
import { Check, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoteSubmission } from "@/types/events";
import { formatCount } from "@/lib/eventUtils";

interface VoteSubmissionCardProps {
    submission: VoteSubmission;
    isVoted: boolean;
    disabled: boolean;
    onVote: () => void;
}

export default function VoteSubmissionCard({
    submission,
    isVoted,
    disabled,
    onVote,
}: VoteSubmissionCardProps) {
    const handleClick = () => {
        if (!disabled) onVote();
    };

    return (
        <motion.div
            whileHover={!disabled ? { y: -2 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            onClick={handleClick}
            className={cn(
                "relative rounded-[20px] overflow-hidden cursor-pointer transition-all border-2",
                isVoted
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-border",
                disabled && !isVoted && "opacity-50",
                !disabled && "hover:shadow-lg"
            )}
        >
            {/* Media */}
            <div className="relative aspect-square bg-secondary overflow-hidden">
                {submission.mediaType === "text" ? (
                    <div className="w-full h-full flex items-center justify-center p-6 bg-card">
                        <p className="text-sm font-bold text-foreground text-center leading-relaxed">
                            {submission.textContent}
                        </p>
                    </div>
                ) : (
                    <img
                        src={submission.media}
                        alt="Submission"
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Selection overlay */}
                {isVoted && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                            <Check className="w-6 h-6 text-white" />
                        </div>
                    </div>
                )}

                {/* Rank indicator */}
                {submission.rank && submission.rank <= 3 && (
                    <div className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-background/80 backdrop-blur-md flex items-center justify-center border border-border/50">
                        <span className="text-[10px] font-black text-foreground">#{submission.rank}</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-4 bg-card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img
                            className="w-5 h-5 rounded-full border border-border"
                            src={submission.creator.avatar}
                            alt={submission.creator.name}
                        />
                        <span className="text-[11px] font-bold text-foreground/60 tracking-tight">
                            @{submission.creator.handle}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-foreground/40">
                        <ThumbsUp className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{formatCount(submission.voteCount)}</span>
                    </div>
                </div>

                {isVoted && (
                    <div className="mt-3 text-[10px] font-black text-primary uppercase tracking-widest text-center">
                        Your Vote
                    </div>
                )}
            </div>
        </motion.div>
    );
}
