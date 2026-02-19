"use client";

import { motion } from "framer-motion";
import { MessageSquare, Heart, Share2, DollarSign, ThumbsUp } from "lucide-react";

interface SubmissionCardProps {
    user: {
        name: string;
        avatar: string;
        handle: string;
    };
    image: string;
    votes: number;
    earnings: number;
    description?: string;
    timeAgo?: string;
}

export default function SubmissionCard({ user, image, votes, earnings, description, timeAgo = "2h ago" }: SubmissionCardProps) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-card rounded-[24px] overflow-hidden group cursor-pointer h-full flex flex-col hover:bg-card/90 transition-all relative border border-border shadow-spotify hover:shadow-xl"
        >


            {/* Media */}
            <div className="relative aspect-square bg-secondary overflow-hidden">
                <img
                    src={image}
                    alt="Submission"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Vote Count Overlay */}
                <div className="absolute bottom-4 right-4 bg-background/80 px-3 py-2 rounded-[14px] text-[10px] font-black text-foreground flex items-center gap-1.5 backdrop-blur-md border border-white/10">
                    <ThumbsUp className="w-3 h-3 text-primary fill-primary/20" />
                    {votes > 1000 ? `${(votes / 1000).toFixed(1)}K` : votes}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <img className="w-7 h-7 rounded-full border border-border p-0.5 bg-secondary" src={user.avatar} alt={user.name} />
                        <span className="text-[12px] text-foreground font-black tracking-tight">@{user.handle}</span>
                        <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest ml-auto">{timeAgo}</span>
                    </div>
                    {description && (
                        <h4 className="text-[14px] font-bold text-foreground line-clamp-2 leading-relaxed tracking-tight mb-4">{description}</h4>
                    )}
                </div>

                <div className="mt-2">
                    <div className="bg-primary/10 text-primary text-[10px] font-black px-3 py-2 rounded-[12px] inline-block mb-4 uppercase tracking-widest">
                        Earn $0.05 per vote
                    </div>
                    <button className="w-full bg-secondary hover:bg-foreground hover:text-background text-foreground text-xs py-3.5 rounded-[16px] transition-all flex items-center justify-center gap-2 group/btn active:scale-[0.98]">
                        <ThumbsUp className="w-4 h-4 text-foreground/40 group-hover/btn:text-background transition-colors" />
                        <span className="font-black uppercase tracking-widest text-[11px]">Vote Now</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
