"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, DollarSign } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

interface FeedItemProps {
    username: string;
    image: string; // Placeholder color or URL
    caption: string;
    reward: number;
    votes: number;
}

export default function FeedItem({ username, image, caption, reward, votes: initialVotes }: FeedItemProps) {
    const [votes, setVotes] = useState(initialVotes);
    const [hasVoted, setHasVoted] = useState(false);

    const handleVote = () => {
        if (!hasVoted) {
            setVotes(prev => prev + 1);
            setHasVoted(true);
            // Trigger confetti or sound here
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto mb-6 relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-spotify group cursor-pointer border border-border"
            onDoubleClick={handleVote}
        >
            {/* Background Image */}
            <div className="absolute inset-0">
                <img src={image} alt="Post" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
            </div>

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-white/20 p-0.5 backdrop-blur-md bg-white/10">
                        <img src={`https://ui-avatars.com/api/?name=${username}&background=random`} alt={username} className="w-full h-full rounded-full object-cover" />
                    </div>
                    <div>
                        <div className="font-bold text-white text-sm tracking-tight">@{username}</div>
                        <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest">2 hours ago</div>
                    </div>
                </div>
                <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-4 py-2 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-white text-sm font-black font-mono tracking-tighter">${reward.toFixed(2)}</span>
                </div>
            </div>

            {/* Voting Animation Overlay */}
            {hasVoted && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                    <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-lg" />
                </motion.div>
            )}

            {/* Bottom Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 z-10 space-y-4">
                <p className="text-white font-medium text-[15px] leading-relaxed line-clamp-2">
                    {caption}
                </p>

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleVote}
                            className="flex flex-col items-center gap-1 group/btn"
                        >
                            <Heart className={clsx("w-7 h-7 transition-all duration-300", hasVoted ? "fill-red-500 text-red-500 scale-110" : "text-white group-hover/btn:text-red-400")} />
                            <span className="text-xs text-white/80 font-medium">{votes.toLocaleString()}</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 group/btn">
                            <MessageCircle className="w-7 h-7 text-white group-hover/btn:text-primary transition-colors" />
                            <span className="text-xs text-white/80 font-medium">45</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 group/btn">
                            <Share2 className="w-7 h-7 text-white group-hover/btn:text-primary transition-colors" />
                            <span className="text-xs text-white/80 font-medium">Share</span>
                        </button>
                    </div>

                    <button className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-black shadow-lg hover:scale-105 transition-all">
                        View
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
