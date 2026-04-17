"use client";

import { Zap, Trophy, Flame, Target, Star, Shield } from "lucide-react";
import type { User } from "@/types/user";
import { xpToLevel, levelToRank, xpForNextLevel } from "@/types/user";

interface UserStatsProps {
  user: User;
}

export function UserStats({ user }: UserStatsProps) {
  const xp = user.xp ?? 0;
  const level = xpToLevel(xp);
  const rank = levelToRank(level);
  const { progress } = xpForNextLevel(xp);
  const streak = user.currentStreak ?? 0;

  const statItems = [
    { icon: Zap, label: "Total XP", value: xp.toLocaleString(), color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
    { icon: Trophy, label: "Rank", value: rank, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { icon: Star, label: "Level", value: `${level}`, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    { icon: Flame, label: "Streak", value: streak > 0 ? `${streak}d` : "—", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
    { icon: Shield, label: "Web3 Level", value: user.web3Level ?? "Beginner", color: "text-green-600 dark:text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
    { icon: Target, label: "Categories", value: user.creatorCategories?.length ? `${user.creatorCategories.length} focus areas` : "—", color: "text-foreground/60", bg: "bg-secondary", border: "border-border" },
  ];

  return (
    <div className="space-y-6">
      {/* XP Progress Bar */}
      <div className="bg-card border-[3px] border-foreground/15 dark:border-foreground rounded-2xl p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.08)] dark:shadow-[4px_4px_0px_#FDF6E3]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground/60">XP Progress — Level {level}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-primary">{progress}%</span>
        </div>
        <div className="h-3 bg-secondary border-2 border-foreground/15 dark:border-foreground rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mt-2">
          {(level * 500 - xp).toLocaleString()} XP until Level {level + 1}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex flex-col items-start gap-3 p-4 ${item.bg} border-[3px] border-foreground/15 dark:border-foreground rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.08)] dark:shadow-[4px_4px_0px_#FDF6E3] hover:-translate-y-0.5 hover:translate-x-0.5 transition-transform`}
            >
              <div className={`w-8 h-8 rounded-lg ${item.bg} border-2 border-foreground/15 dark:border-foreground flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div>
                <p className={`text-xl font-display uppercase tracking-tight ${item.color}`}>{item.value}</p>
                <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
