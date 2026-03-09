"use client";

import { motion } from "framer-motion";
import { TrendingUp, Flame, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { xpToLevel, xpForNextLevel, levelToRank } from "@/types/user";

export default function RightDashboard() {
  const { user, stats } = useUser();

  const xp = user?.xp ?? 0;
  const streak = user?.currentStreak ?? 0;
  const level = xpToLevel(xp);
  const rank = levelToRank(level);
  const { progress, next } = xpForNextLevel(xp);
  const nextRank = levelToRank(level + 1);

  // Weekly XP bars — derive from real XP if available, otherwise show pattern
  const weeklyBars = stats
    ? [50, 60, 45, 70, 55, 80, progress].map((v) => Math.max(5, v))
    : [40, 65, 45, 80, 55, 90, 75];

  const recentActivity = [
    stats && stats.posts > 0 && {
      type: "Submissions",
      title: `${stats.posts} total posts`,
      status: "Completed",
      points: `+${stats.posts * 50} XP`,
    },
    stats && stats.votes > 0 && {
      type: "Votes Cast",
      title: `${stats.votes} votes total`,
      status: "In Progress",
      points: `+${stats.votes * 25} XP`,
    },
  ].filter(Boolean) as { type: string; title: string; status: string; points: string }[];

  return (
    <div className="flex flex-col gap-5 sticky top-6">
      {/* 1. Streak & Rank Card */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-card overflow-hidden relative group flex flex-col justify-center">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-orange-300/20 rounded-full blur-3xl group-hover:bg-orange-300/30 transition-all duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-foreground/40 mb-1 font-medium">Current Streak</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-display text-foreground tabular-nums">
                  {streak || "—"}
                </h3>
                <span className="text-sm font-semibold text-orange-500">
                  {streak > 0 ? "Days" : ""}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center shadow-soft">
              <Flame className="w-6 h-6 text-white fill-current" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground/50">{rank}</span>
              <span className="text-xs text-orange-500 font-medium">{progress}% to {nextRank}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-orange-400 to-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. XP Analysis Card */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-card">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h3 className="text-base font-display text-foreground">XP Analysis</h3>
            <p className="text-xs text-foreground/40 mt-0.5">
              Level {level} · {xp.toLocaleString()} XP
            </p>
          </div>
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="h-32 flex items-end justify-between gap-1.5 mb-6">
          {weeklyBars.map((height, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 1, delay: i * 0.1 }}
              className={cn(
                "w-full rounded-t-xl transition-all duration-300 relative group/bar",
                i === weeklyBars.length - 1
                  ? "bg-primary shadow-[0_0_20px_rgba(47,106,255,0.4)]"
                  : "bg-primary/10 hover:bg-primary/30"
              )}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                {Math.round(height * 10)} XP
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-foreground/30 font-black uppercase tracking-widest px-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>

      {/* 3. Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display text-foreground">Recent Activity</h3>
          <Link href="/activity" className="text-xs text-primary hover:underline flex items-center gap-0.5 transition-colors font-medium">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((item, idx) => (
              <Link href="/activity" key={idx} className="block bg-card hover:-translate-y-0.5 transition-all border border-border rounded-2xl p-4 group cursor-pointer shadow-soft hover:shadow-card">
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[10px] font-semibold",
                    item.type === "Votes Cast" ? "text-accent" : "text-primary"
                  )}>
                    {item.type}
                  </span>
                  <span className="text-[10px] text-foreground/40 bg-secondary px-2 py-0.5 rounded-full font-medium">
                    {item.status}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-foreground mb-2.5">{item.title}</h4>
                <div className="flex items-center gap-1 text-primary text-xs font-semibold">
                  <Zap className="w-3 h-3 fill-current" />
                  {item.points}
                </div>
              </Link>
            ))
          ) : (
            [{
              type: "Post Event",
              title: "Complete your first submission",
              status: "Pending",
              points: "+250 XP"
            }, {
              type: "Vote Event",
              title: "Cast your first vote",
              status: "Pending",
              points: "+50 XP"
            }].map((item, idx) => (
              <Link href="/explore" key={idx} className="block bg-card hover:-translate-y-0.5 transition-all border border-border rounded-2xl p-4 group cursor-pointer shadow-soft hover:shadow-card opacity-60">
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[10px] font-semibold",
                    item.type === "Vote Event" ? "text-accent" : "text-primary"
                  )}>
                    {item.type}
                  </span>
                  <span className="text-[10px] text-foreground/40 bg-secondary px-2 py-0.5 rounded-full font-medium">
                    {item.status}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-foreground mb-2.5">{item.title}</h4>
                <div className="flex items-center gap-1 text-primary text-xs font-semibold">
                  <Zap className="w-3 h-3 fill-current" />
                  {item.points}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
