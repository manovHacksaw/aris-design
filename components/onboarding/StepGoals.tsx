"use client";

import { motion } from "framer-motion";
import { Check, Target, DollarSign, Palette, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepGoalsProps {
    selectedGoals: string[];
    onGoalsChange: (goals: string[]) => void;
}

const GOALS = [
    {
        id: "earn",
        label: "Earn Rewards",
        description: "Participate in challenges and get paid for your creativity.",
        icon: DollarSign
    },
    {
        id: "create",
        label: "Build Portfolio",
        description: "Showcase your work to top brands and grow your audience.",
        icon: Palette
    },
    {
        id: "discover",
        label: "Discover Art",
        description: "Find inspiration and see what's trending in the community.",
        icon: Search
    },
    {
        id: "compete",
        label: "Compete",
        description: "Climb the leaderboards and prove your skills.",
        icon: Target
    },
];

export default function StepGoals({ selectedGoals, onGoalsChange }: StepGoalsProps) {
    const toggleGoal = (id: string) => {
        onGoalsChange(
            selectedGoals.includes(id)
                ? selectedGoals.filter(g => g !== id)
                : [...selectedGoals, id]
        );
    };

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-foreground tracking-tighter"
                >
                    What brings you here?
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs text-foreground/40 font-bold"
                >
                    Select all that apply.
                </motion.p>
            </div>

            <div className="grid gap-4">
                {GOALS.map((goal, i) => {
                    const isSelected = selectedGoals.includes(goal.id);
                    const Icon = goal.icon;
                    return (
                        <motion.button
                            key={goal.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            onClick={() => toggleGoal(goal.id)}
                            className={cn(
                                "flex items-start gap-4 p-4 rounded-[20px] border text-left transition-all group relative overflow-hidden",
                                isSelected
                                    ? "bg-primary/5 border-primary/30"
                                    : "bg-card border-border/40 hover:border-foreground/20"
                            )}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="goal-highlight"
                                    className="absolute inset-0 bg-primary/5 -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                isSelected ? "bg-primary text-background" : "bg-secondary text-foreground/40 group-hover:text-foreground"
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1">
                                <h3 className={cn(
                                    "text-sm font-black tracking-tight",
                                    isSelected ? "text-foreground" : "text-foreground/80"
                                )}>
                                    {goal.label}
                                </h3>
                                <p className="text-[11px] text-foreground/40 font-medium mt-1 leading-relaxed">
                                    {goal.description}
                                </p>
                            </div>

                            <div className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all mt-1",
                                isSelected ? "border-primary bg-primary" : "border-border"
                            )}>
                                {isSelected && <Check className="w-3.5 h-3.5 text-background" />}
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
