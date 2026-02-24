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
    <div className="flex flex-col gap-6 sticky top-6">
      {/* 1. Streak & Rank Card */}
      <div className="bg-card backdrop-blur-xl rounded-[32px] p-6 border border-card-border shadow-spotify overflow-hidden relative group h-[200px] flex flex-col justify-center">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-1">Current Streak</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-foreground tabular-nums drop-shadow-sm">
                  {streak || "—"}
                </h3>
                <span className="text-sm font-black text-orange-500 uppercase tracking-widest">
                  {streak > 0 ? "Days" : ""}
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 rotate-3 group-hover:rotate-0 transition-transform duration-300">
              <Flame className="w-7 h-7 text-white fill-current animate-bounce" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-foreground/60 uppercase">{rank}</span>
              <span className="text-[11px] font-black text-orange-500">
                {progress}% to {nextRank}
              </span>
            </div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. XP Analysis Card */}
      <div className="bg-card backdrop-blur-xl rounded-[32px] p-6 border border-card-border shadow-spotify">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-foreground tracking-tight">XP Analysis</h3>
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mt-1">
              Level {level} · {xp.toLocaleString()} XP total
            </p>
          </div>
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center border border-border">
            <TrendingUp className="w-5 h-5 text-primary" />
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
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[13px] font-black text-foreground uppercase tracking-widest">Recent Activity</h3>
          <Link href="/activity" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 transition-colors">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((item, idx) => (
              <Link href="/activity" key={idx} className="block bg-card/50 hover:bg-card hover:-translate-y-1 transition-all border border-border rounded-[24px] p-5 group cursor-pointer shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    item.type === "Votes Cast" ? "text-accent" : "text-primary"
                  )}>
                    {item.type}
                  </span>
                  <span className="text-[10px] font-black text-foreground/40 bg-secondary px-2 py-0.5 rounded-full">
                    {item.status}
                  </span>
                </div>
                <h4 className="text-sm font-black text-foreground mb-3 tracking-tight">{item.title}</h4>
                <div className="flex items-center gap-1 text-primary font-black text-xs">
                  <Zap className="w-3 h-3 fill-current" />
                  {item.points}
                </div>
              </Link>
            ))
          ) : (
            /* Placeholder cards when no real data yet */
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
              <Link href="/explore" key={idx} className="block bg-card/50 hover:bg-card hover:-translate-y-1 transition-all border border-border rounded-[24px] p-5 group cursor-pointer shadow-sm hover:shadow-md opacity-60">
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    item.type === "Vote Event" ? "text-accent" : "text-primary"
                  )}>
                    {item.type}
                  </span>
                  <span className="text-[10px] font-black text-foreground/40 bg-secondary px-2 py-0.5 rounded-full">
                    {item.status}
                  </span>
                </div>
                <h4 className="text-sm font-black text-foreground mb-3 tracking-tight">{item.title}</h4>
                <div className="flex items-center gap-1 text-primary font-black text-xs">
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
