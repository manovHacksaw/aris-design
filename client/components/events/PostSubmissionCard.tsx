"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostSubmission } from "@/types/events";

interface PostSubmissionCardProps {
    submission: PostSubmission;
    showVoteCount?: boolean;
    isVotedByUser?: boolean;
    onImageClick?: () => void;
    listView?: boolean;
    showCreator?: boolean;
    isWinner?: boolean;
}

export default function PostSubmissionCard({
    submission,
    showVoteCount = false,
    isVotedByUser = false,
    onImageClick,
    listView = false,
    showCreator = true,
    isWinner = false,
}: PostSubmissionCardProps) {
    /* ── LIST VIEW — leaderboard row ────────────────────────────────────── */
    if (listView) {
        return (
            <motion.div
                whileHover={{ backgroundColor: "rgba(38,38,38,0.4)" }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors border-b border-neutral-800/50 last:border-0"
            >
                {/* Rank */}
                {submission.rank != null && (
                    <div className="w-8 shrink-0 text-center">
                        <span className={cn(
                            "text-sm font-semibold",
                            submission.rank === 1 ? "text-neutral-200" : "text-neutral-500"
                        )}>
                            #{submission.rank}
                        </span>
                    </div>
                )}

                {/* Thumbnail */}
                {submission.media ? (
                    <div
                        className={cn(
                            "w-[72px] h-[72px] rounded-lg overflow-hidden shrink-0 bg-secondary",
                            onImageClick && "cursor-zoom-in"
                        )}
                        onClick={onImageClick}
                    >
                        <img
                            src={submission.media}
                            alt="Post"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-[72px] h-[72px] rounded-lg shrink-0 bg-secondary" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {showCreator && (
                        <div className="flex items-center gap-1.5 mb-1">
                            <img
                                className="w-4 h-4 rounded-full border border-border/60"
                                src={submission.creator.avatar || undefined}
                                alt={submission.creator.name}
                            />
                            <span className="text-[11px] text-neutral-500 font-medium">
                                @{submission.creator.handle}
                            </span>
                        </div>
                    )}
                    {submission.textContent && (
                        <p className="text-sm font-medium text-foreground/80 line-clamp-1">
                            {submission.textContent}
                        </p>
                    )}
                    {(isVotedByUser || submission.isOwn) && (
                        <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                            {isVotedByUser && !submission.isOwn && "· You voted"}
                            {submission.isOwn && "· Your submission"}
                        </p>
                    )}
                </div>

                {/* Votes — primary signal */}
                {showVoteCount && (
                    <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold text-foreground leading-none">{submission.voteCount}</p>
                        <p className="text-[10px] text-neutral-500 font-medium mt-0.5">votes</p>
                    </div>
                )}
            </motion.div>
        );
    }

    /* ── GRID VIEW — card layout ─────────────────────────────────────────── */
    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={cn(
                "rounded-[20px] overflow-hidden border transition-all bg-card",
                isWinner ? "border-white/25" : submission.isOwn ? "border-white/20" : "border-border/40"
            )}
        >
            {/* Media */}
            <div
                className={cn(
                    "relative aspect-[4/3] bg-secondary overflow-hidden group",
                    onImageClick && "cursor-zoom-in"
                )}
                onClick={onImageClick}
            >
                {submission.media && (
                    <img
                        src={submission.media}
                        alt="Post"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                )}

                {/* AI tag */}
                {submission.isAiAssisted && (
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/70 backdrop-blur-md text-[9px] font-bold text-foreground/60">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                    </div>
                )}

                {/* Bottom gradient for vote count readability */}
                {showVoteCount && (
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                )}

                {/* Vote count — dominant primary element */}
                {showVoteCount && (
                    <div className="absolute bottom-3 right-3 flex flex-col items-end">
                        <span className="text-xl font-black text-white leading-none drop-shadow-md">
                            {submission.voteCount}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium leading-none mt-0.5">
                            votes
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3.5">
                {/* Creator */}
                {showCreator && (
                    <div className="flex items-center gap-2 mb-1.5">
                        <img
                            className="w-5 h-5 rounded-full border border-border/60"
                            src={submission.creator.avatar || undefined}
                            alt={submission.creator.name}
                        />
                        <span className="text-[11px] font-bold text-foreground/50 tracking-tight">
                            @{submission.creator.handle}
                        </span>
                    </div>
                )}

                {submission.textContent && (
                    <p className="text-xs font-semibold text-foreground/70 line-clamp-2 leading-relaxed">
                        {submission.textContent}
                    </p>
                )}

                {/* Subtle user context */}
                {(isVotedByUser || submission.isOwn) && (
                    <p className="text-[10px] text-foreground/35 font-medium mt-2">
                        {isVotedByUser && !submission.isOwn && "· You voted"}
                        {submission.isOwn && (
                            <>
                                · You
                                {submission.rank && ` · Rank #${submission.rank} · ${submission.voteCount} votes`}
                            </>
                        )}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
