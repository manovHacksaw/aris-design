"use client";

import { motion } from "framer-motion";
import { Zap, ArrowRight, Trophy, Users } from "lucide-react";
import { OnboardingIntent } from "@/types/onboarding";
import ModeBadge from "@/components/events/ModeBadge";
import StatusBadge from "@/components/events/StatusBadge";
import Link from "next/link";

interface StepFirstActionProps {
    intent: OnboardingIntent | null;
}

interface SuggestedEvent {
    id: string;
    title: string;
    brand: string;
    mode: "vote" | "post";
    reward: string;
    participants: number;
    image: string;
    timeLeft: string;
}

const voteEvents: SuggestedEvent[] = [
    { id: "nike-air-vote", title: "Air Max: Best Design", brand: "Nike", mode: "vote", reward: "$5,000", participants: 4230, image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=600&auto=format&fit=crop", timeLeft: "4d 12h" },
    { id: "moto-vote", title: "Custom Exhaust Build", brand: "Moto World", mode: "vote", reward: "$1,200", participants: 856, image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=600&auto=format&fit=crop", timeLeft: "8h left" },
];

const postEvents: SuggestedEvent[] = [
    { id: "spotify-art-post", title: "Playlist Cover Art", brand: "Spotify", mode: "post", reward: "$3,000", participants: 2180, image: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop", timeLeft: "6d 08h" },
    { id: "coke-post", title: "Summer Refresh Moment", brand: "Coca Cola", mode: "post", reward: "$2,500", participants: 1300, image: "https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=600&auto=format&fit=crop", timeLeft: "4d 08h" },
];

const trendingEvents: SuggestedEvent[] = [
    ...voteEvents.slice(0, 1),
    ...postEvents.slice(0, 1),
];

export default function StepFirstAction({ intent }: StepFirstActionProps) {
    const events = intent === "voter" ? voteEvents
        : intent === "creator" ? postEvents
        : trendingEvents;

    const heading = intent === "voter" ? "Start Voting"
        : intent === "creator" ? "Start Creating"
        : "Trending Right Now";

    return (
        <div className="space-y-8">
            {/* XP Bonus Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/5 border border-primary/20 rounded-[18px] p-5 flex items-center gap-4"
            >
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-black text-foreground tracking-tight">+10 XP Welcome Bonus</p>
                    <p className="text-[11px] text-primary font-bold">You just earned your first XP. Keep going.</p>
                </div>
            </motion.div>

            {/* Header */}
            <div className="text-center space-y-2">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-foreground tracking-tighter"
                >
                    {heading}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs text-foreground/40 font-bold"
                >
                    Jump into an event. Your first action earns bonus XP.
                </motion.p>
            </div>

            {/* Suggested Events */}
            <div className="space-y-3">
                {events.map((event, i) => (
                    <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.08 }}
                    >
                        <Link href={`/events/${event.id}`} className="block">
                            <div className="flex items-center gap-4 p-4 bg-card border border-border/40 rounded-[18px] hover:border-primary/30 transition-all group cursor-pointer">
                                {/* Image */}
                                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-secondary">
                                    <img
                                        src={event.image}
                                        alt={event.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ModeBadge mode={event.mode} />
                                        <StatusBadge status="live" />
                                    </div>
                                    <p className="text-sm font-black text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                                        {event.title}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1.5 text-foreground/40">
                                        <div className="flex items-center gap-1">
                                            <Trophy className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">{event.reward}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">{event.participants.toLocaleString()}</span>
                                        </div>
                                        <span className="text-[10px] font-bold">{event.timeLeft}</span>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <ArrowRight className="w-4 h-4 text-foreground/15 group-hover:text-primary transition-colors shrink-0" />
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Early Explorer Badge */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border/40 rounded-[18px] p-4 flex items-center gap-3"
            >
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center border border-amber-400/10 shrink-0">
                    <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-black text-foreground tracking-tight">Early Explorer Badge Earned</p>
                    <p className="text-[10px] text-foreground/30 font-bold">You&apos;re one of the first to join Aris.</p>
                </div>
            </motion.div>
        </div>
    );
}
