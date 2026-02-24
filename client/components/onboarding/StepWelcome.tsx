"use client";

import { motion } from "framer-motion";
import { ThumbsUp, PenTool, Trophy, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingIntent } from "@/types/onboarding";

interface StepWelcomeProps {
    intent: OnboardingIntent | null;
    onIntentChange: (intent: OnboardingIntent) => void;
}

const intents: { id: OnboardingIntent; label: string; description: string; icon: typeof ThumbsUp }[] = [
    { id: "voter", label: "Vote & Earn", description: "Cast votes on submissions and earn rewards for every decision.", icon: ThumbsUp },
    { id: "creator", label: "Create & Compete", description: "Submit original content to brand challenges and climb the leaderboard.", icon: PenTool },
    { id: "explorer", label: "Explore Rewards", description: "Discover events, collect XP, and unlock milestone rewards.", icon: Trophy },
    { id: "all", label: "All of the Above", description: "Vote, create, earn, and explore everything Aris has to offer.", icon: Flame },
];

export default function StepWelcome({ intent, onIntentChange }: StepWelcomeProps) {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-4xl font-black text-foreground tracking-tighter"
                >
                    Welcome to Aris
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-sm text-foreground/40 font-bold"
                >
                    Turn attention into rewards.
                </motion.p>
            </div>

            {/* Intent Cards */}
            <div className="space-y-3">
                {intents.map((item, i) => {
                    const isSelected = intent === item.id;
                    const Icon = item.icon;

                    return (
                        <motion.button
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            onClick={() => onIntentChange(item.id)}
                            className={cn(
                                "w-full flex items-center gap-4 p-5 rounded-[18px] border text-left transition-all",
                                isSelected
                                    ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                                    : "bg-card border-border/40 hover:border-border"
                            )}
                        >
                            <div className={cn(
                                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                                isSelected ? "bg-primary/15 text-primary" : "bg-secondary text-foreground/40"
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-black tracking-tight transition-colors",
                                    isSelected ? "text-foreground" : "text-foreground/70"
                                )}>
                                    {item.label}
                                </p>
                                <p className="text-[11px] text-foreground/40 font-medium mt-0.5">{item.description}</p>
                            </div>
                            <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                isSelected ? "border-primary" : "border-foreground/20"
                            )}>
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-2.5 h-2.5 rounded-full bg-primary"
                                    />
                                )}
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
