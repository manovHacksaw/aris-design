"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface ProfileTabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

export default function ProfileTabs({ tabs, activeTab, onTabChange }: ProfileTabsProps) {
    return (
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-[16px] border border-border/30 w-fit">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            "relative flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[11px] font-black uppercase tracking-widest transition-all",
                            isActive
                                ? "text-background"
                                : "text-foreground/40 hover:text-foreground"
                        )}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeProfileTab"
                                className="absolute inset-0 bg-foreground rounded-[12px]"
                                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                            />
                        )}
                        <Icon className="w-3.5 h-3.5 relative z-10" />
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
