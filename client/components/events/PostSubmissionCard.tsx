"use client";

import { motion } from "framer-motion";
import { Sparkles, Share2 } from "lucide-react";
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

const RANK_STYLES: Record<number, { border: string; badge: string; text: string; glow: string }> = {
    1: { border: "border-yellow-400/60", badge: "bg-yellow-400 text-black", text: "text-yellow-400", glow: "shadow-[0_0_0_3px_rgba(250,204,21,0.15)]" },
    2: { border: "border-slate-300/50", badge: "bg-slate-300 text-black", text: "text-slate-300", glow: "shadow-[0_0_0_3px_rgba(203,213,225,0.12)]" },
    3: { border: "border-amber-600/50", badge: "bg-amber-600 text-white", text: "text-amber-600", glow: "shadow-[0_0_0_3px_rgba(217,119,6,0.12)]" },
};

function RankBadge({ rank }: { rank: number }) {
    const s = RANK_STYLES[rank];
    if (!s) return <span className="text-sm font-semibold text-neutral-500">#{rank}</span>;
    return (
        <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black", s.badge)}>
            #{rank}
        </span>
    );
}

function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}`;
    if (navigator.share) {
        navigator.share({ url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url);
    }
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
    const rankStyle = submission.rank ? RANK_STYLES[submission.rank] : null;

    /* ── LIST VIEW ─────────────────────────────────────────────────── */
    if (listView) {
        return (
            <motion.div
                whileHover={{ backgroundColor: "rgba(38,38,38,0.4)" }}
                className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors border-b border-neutral-800/50 last:border-0",
                    isVotedByUser && "bg-lime-400/5 border-l-2 border-l-lime-400"
                )}
            >
                {/* Rank */}
                {submission.rank != null && (
                    <div className="w-8 shrink-0 flex items-center justify-center">
                        <RankBadge rank={submission.rank} />
                    </div>
                )}

                {/* Thumbnail */}
                {submission.media ? (
                    <div
                        className={cn("w-[72px] h-[72px] rounded-lg overflow-hidden shrink-0 bg-secondary", onImageClick && "cursor-zoom-in")}
                        onClick={onImageClick}
                    >
                        <img src={submission.media} alt="Post" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-[72px] h-[72px] rounded-lg shrink-0 bg-secondary" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {showCreator && (
                        <div className="flex items-center gap-1.5 mb-1">
                            <img className="w-4 h-4 rounded-full border border-border/60" src={submission.creator.avatar || undefined} alt={submission.creator.name} />
                            <span className="text-[11px] text-neutral-500 font-medium">@{submission.creator.handle}</span>
                        </div>
                    )}
                    {submission.textContent && (
                        <p className="text-sm font-medium text-foreground/80 line-clamp-1">{submission.textContent}</p>
                    )}
                    {(isVotedByUser || submission.isOwn) && (
                        <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                            {isVotedByUser && !submission.isOwn && "· You voted"}
                            {submission.isOwn && "· Your submission"}
                        </p>
                    )}
                </div>

                {/* Votes */}
                {showVoteCount && (
                    <div className="shrink-0 text-right">
                        <p className={cn("text-lg font-semibold leading-none", rankStyle ? rankStyle.text : "text-foreground")}>
                            {submission.voteCount}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-medium mt-0.5">votes</p>
                    </div>
                )}

                {/* Share */}
                <button
                    type="button"
                    onClick={handleShare}
                    className="w-8 h-8 rounded-full bg-surface-hover border border-surface-border flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-all shrink-0 ml-1"
                >
                    <Share2 className="w-3.5 h-3.5" />
                </button>
            </motion.div>
        );
    }

    /* ── GRID VIEW ─────────────────────────────────────────────────── */
    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={cn(
                "rounded-[20px] overflow-hidden border-2 transition-all bg-card",
                isVotedByUser
                    ? "border-lime-400 shadow-[0_0_0_3px_rgba(163,230,53,0.18)]"
                    : rankStyle ? cn(rankStyle.border, rankStyle.glow) : submission.isOwn ? "border-primary/50 ring-1 ring-primary/20" : "border-border/40"
            )}
        >
            {/* Media */}
            <div
                className={cn("relative aspect-[3/4] bg-black overflow-hidden group", onImageClick && "cursor-zoom-in")}
                onClick={onImageClick}
            >
                {submission.media && (
                    <img
                        src={submission.media}
                        alt="Post"
                        className="w-full h-full object-contain"
                    />
                )}

                {submission.isAiAssisted && (
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/70 backdrop-blur-md text-[9px] font-bold text-white/60">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                    </div>
                )}

                {showVoteCount && (
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 dark:from-black/80 to-transparent pointer-events-none" />
                )}

                {/* Vote count */}
                {showVoteCount && (
                    <div className="absolute bottom-3 right-3 flex flex-col items-end">
                        <span className={cn("text-xl font-black leading-none drop-shadow-md", rankStyle ? rankStyle.text : "text-white")}>
                            {submission.voteCount}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium leading-none mt-0.5">votes</span>
                    </div>
                )}

                {/* Voted indicator */}
                {isVotedByUser && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-lime-400/20 border border-lime-400/40 backdrop-blur-sm">
                        <span className="text-[9px] font-black text-lime-400">Voted</span>
                    </div>
                )}
            </div>

            {/* Bottom bar */}
            <div className="px-3.5 py-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    {showCreator && (
                        <div className="flex items-center gap-1.5 mb-1">
                            <img className="w-4 h-4 rounded-full border border-border/60" src={submission.creator.avatar || undefined} alt={submission.creator.name} />
                            <span className="text-[11px] font-bold text-foreground/50 tracking-tight">@{submission.creator.handle}</span>
                        </div>
                    )}
                    {submission.textContent && (
                        <p className="text-xs font-semibold text-foreground/70 line-clamp-1 leading-relaxed">{submission.textContent}</p>
                    )}
                    {submission.isOwn && !showCreator && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary">
                            Your Post{submission.rank ? ` · #${submission.rank}` : ""}
                        </span>
                    )}
                </div>

                {/* Share button */}
                <button
                    type="button"
                    onClick={handleShare}
                    className="w-8 h-8 rounded-full bg-surface-hover border border-surface-border flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-all shrink-0"
                >
                    <Share2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </motion.div>
    );
}
