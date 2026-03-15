"use client";

import { Clock, Zap, Award, ThumbsUp, UserPlus } from "lucide-react";

interface ActivityFeedProps {
  userId: string;
}

// Placeholder activity feed — replace with real API data when available
const PLACEHOLDER_ITEMS = [
  { id: 1, icon: Zap, label: "Earned 50 XP", sub: "Completed daily challenge", time: "2h ago", color: "text-yellow-400" },
  { id: 2, icon: ThumbsUp, label: "Voted on a submission", sub: "Nike Street Style campaign", time: "5h ago", color: "text-primary" },
  { id: 3, icon: Award, label: "Unlocked Bronze III", sub: "Rank milestone reached", time: "1d ago", color: "text-orange-400" },
  { id: 4, icon: UserPlus, label: "New follower", sub: "Someone started following you", time: "2d ago", color: "text-green-400" },
];

export function ActivityFeed({ userId }: ActivityFeedProps) {
  return (
    <div className="space-y-3">
      {PLACEHOLDER_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="flex items-start gap-4 p-4 bg-card border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3] hover:-translate-y-0.5 hover:translate-x-0.5 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary border-2 border-foreground flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground uppercase tracking-widest truncate">{item.label}</p>
              <p className="text-xs text-foreground/50 font-bold mt-0.5 truncate">{item.sub}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-foreground/30 uppercase tracking-widest shrink-0">
              <Clock className="w-3 h-3" />
              {item.time}
            </div>
          </div>
        );
      })}
      <p className="text-center text-[10px] text-foreground/30 font-bold uppercase tracking-widest pt-2">
        Full activity history coming soon
      </p>
    </div>
  );
}
