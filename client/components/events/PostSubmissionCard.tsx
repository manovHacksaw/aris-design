"use client";

import { motion } from "framer-motion";
import { ThumbsUp, Eye, Share2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostSubmission, SubmissionStatus } from "@/types/events";
import { formatCount } from "@/lib/eventUtils";

interface PostSubmissionCardProps {
    submission: PostSubmission;
}

const statusConfig: Record<SubmissionStatus, { label: string; className: string }> = {
    eligible: { label: "Eligible", className: "bg-emerald-400/10 text-emerald-400" },
    winning: { label: "Winning", className: "bg-primary/15 text-primary" },
    ranked: { label: "Ranked", className: "bg-amber-400/10 text-amber-400" },
    ended: { label: "Ended", className: "bg-foreground/5 text-foreground/40" },
};

export default function PostSubmissionCard({ submission }: PostSubmissionCardProps) {
    const status = statusConfig[submission.status];

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={cn(
                "rounded-[20px] overflow-hidden border transition-all hover:shadow-lg bg-card",
                submission.isOwn ? "border-primary/30" : "border-border/40"
            )}
        >
            {/* Media */}
            <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                <img
                    src={submission.media}
                    alt="Post"
                    className="w-full h-full object-cover"
                />

                {/* Status badge */}
                <div className={cn("absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em]", status.className)}>
                    {status.label}
                </div>

                {/* AI tag */}
                {submission.isAiAssisted && (
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/70 backdrop-blur-md text-[9px] font-bold text-foreground/60">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Assisted
                    </div>
                )}

                {/* Own submission indicator */}
                {submission.isOwn && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-primary/90 text-[9px] font-black text-white uppercase tracking-[0.15em]">
                        Your Post
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Creator */}
                <div className="flex items-center gap-2 mb-3">
                    <img
                        className="w-5 h-5 rounded-full border border-border"
                        src={submission.creator.avatar}
                        alt={submission.creator.name}
                    />
                    <span className="text-[11px] font-bold text-foreground/60 tracking-tight">
                        @{submission.creator.handle}
                    </span>
                </div>

                {submission.textContent && (
                    <p className="text-xs font-medium text-foreground/70 line-clamp-2 mb-3 leading-relaxed">
                        {submission.textContent}
                    </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-foreground/40">
                    <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{formatCount(submission.voteCount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{formatCount(submission.engagementStats.views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Share2 className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{formatCount(submission.engagementStats.shares)}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
