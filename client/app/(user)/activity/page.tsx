"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import { motion } from "framer-motion";
import {
  ImageIcon, MousePointerClick, Trophy, Zap, DollarSign,
  ThumbsUp, Crown, Calendar, ArrowUpRight, TrendingUp,
  Flame, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { getUserStats, getUserSubmissions } from "@/services/user.service";
import { getEventsVotedByUser } from "@/services/event.service";
import type { UserStats } from "@/types/user";

// ─── Tiers ───────────────────────────────────────────────────────
const TIERS = [
  { min: 1, max: 2, name: "Rookie", color: "text-zinc-400", bg: "bg-zinc-500/10", bar: "bg-zinc-400" },
  { min: 3, max: 5, name: "Hustler", color: "text-blue-400", bg: "bg-blue-500/10", bar: "bg-blue-400" },
  { min: 6, max: 9, name: "Creator", color: "text-purple-400", bg: "bg-purple-500/10", bar: "bg-purple-400" },
  { min: 10, max: 14, name: "Veteran", color: "text-orange-400", bg: "bg-orange-500/10", bar: "bg-orange-400" },
  { min: 15, max: 19, name: "Elite", color: "text-yellow-400", bg: "bg-yellow-500/10", bar: "bg-yellow-400" },
  { min: 20, max: 999, name: "Legend", color: "text-lime-400", bg: "bg-lime-400/10", bar: "bg-lime-400" },
] as const;

function getTier(level: number) {
  return TIERS.find(t => level >= t.min && level <= t.max) ?? TIERS[0];
}

type FeedItem = {
  id: string;
  type: "post" | "vote";
  title: string;
  brand: string;
  date: string;
  status: string;
  rank?: number | null;
  votesReceived?: number;
  votesCast?: number;
  earnings?: number;
  imageUrl?: string;
};

type TabFilter = "all" | "post" | "vote";

export default function ActivityPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [votes, setVotes] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("all");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getUserStats().catch(() => null),
      getUserSubmissions(user.id).catch(() => []),
      getEventsVotedByUser(user.id).catch(() => []),
    ]).then(([s, subs, voted]) => {
      setStats(s);
      setPosts((subs as any[]).map((sub: any) => ({
        id: sub.id,
        type: "post" as const,
        title: sub.event?.title || "Untitled Event",
        brand: sub.event?.brand?.name || "Unknown",
        date: sub.createdAt
          ? new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "—",
        status: sub.event?.status || "unknown",
        rank: sub.finalRank ?? null,
        votesReceived: sub._count?.votes ?? 0,
        earnings: 0,
        imageUrl: sub.imageCid ? `https://gateway.pinata.cloud/ipfs/${sub.imageCid}` : undefined,
      })));
      setVotes((voted as any[]).map((e: any) => ({
        id: e.id,
        type: "vote" as const,
        title: e.title || "Untitled Event",
        brand: e.brand?.name || "Unknown",
        date: e.endTime
          ? new Date(e.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "—",
        status: e.status || "completed",
        votesCast: e._count?.votes ?? 0,
      })));
    }).finally(() => setLoading(false));
  }, [user]);

  const xp = user?.xp ?? 0;
  const level = Math.floor(xp / 1000) + 1;
  const xpProgress = (xp % 1000) / 10;
  const xpToNext = level * 1000 - xp;
  const tier = getTier(level);

  const allFeed = [...posts, ...votes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const feed = tab === "post" ? posts : tab === "vote" ? votes : allFeed;

  const creationScore = Math.min(100, (stats?.posts ?? 0) * 10);
  const socialScore = Math.min(100, (stats?.votesCast ?? 0) * 2);
  const communityScore = Math.min(100, (stats?.events ?? 0) * 15);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <SidebarLayout>
        <main className="w-full pt-6 lg:pt-10 pb-24 md:pb-12 space-y-8">

          {/* ── Header ── */}
          <div className="space-y-1">
            <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight">
              Activity
            </h1>
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">
              Check your XP and rewards
            </p>
          </div>

          {/* ── Stats Row ── */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[80px] rounded-[20px] bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Posts", value: String(stats?.posts ?? 0), icon: ImageIcon, color: "text-lime-400" },
                { label: "Votes Cast", value: String(stats?.votesCast ?? 0), icon: MousePointerClick, color: "text-blue-400" },
                { label: "Votes Received", value: String(stats?.votesReceived ?? 0), icon: ThumbsUp, color: "text-purple-400" },
                { label: "Events Joined", value: String(stats?.events ?? 0), icon: Trophy, color: "text-orange-400" },
                { label: "Earnings", value: stats?.earnings ? `$${stats.earnings.toFixed(2)}` : "$0.00", icon: DollarSign, color: "text-yellow-400" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-4 py-3.5 flex items-center gap-3 transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-foreground/40 leading-none mb-1">{s.label}</p>
                    <p className="font-display text-2xl text-foreground tracking-tight leading-none">{s.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1.5 border-t border-white/[0.05] pt-6">
            {(["all", "post", "vote"] as TabFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border",
                  tab === t
                    ? "bg-white text-black border-white"
                    : "bg-white/[0.04] text-foreground/40 border-white/[0.06] hover:bg-white/[0.08] hover:text-foreground/80"
                )}
              >
                {t === "all" ? "All Activity" : t === "post" ? `Posts (${posts.length})` : `Votes (${votes.length})`}
              </button>
            ))}
          </div>

          {/* ── Two-column layout ── */}
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Feed ── */}
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                {feed.length} {tab === "all" ? "events" : tab === "post" ? "posts" : "votes"}
              </p>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[80px] rounded-[20px] bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : feed.length === 0 ? (
                <div className="py-20 text-center bg-white/[0.02] rounded-[24px] border border-dashed border-white/[0.07]">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                    {tab === "vote"
                      ? <MousePointerClick className="w-5 h-5 text-foreground/20" />
                      : <ImageIcon className="w-5 h-5 text-foreground/20" />
                    }
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">No activity yet</p>
                </div>
              ) : (
                feed.map((item, i) => {
                  const isPost = item.type === "post";
                  return (
                    <motion.div
                      key={item.id + i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 p-4 rounded-[20px] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/[0.05] border border-white/[0.06]">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn("w-full h-full flex items-center justify-center", isPost ? "bg-lime-500/10" : "bg-blue-500/10")}>
                            {isPost
                              ? <ImageIcon className="w-5 h-5 text-lime-400/50" />
                              : <MousePointerClick className="w-5 h-5 text-blue-400/50" />
                            }
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn("text-[9px] font-black uppercase tracking-widest", isPost ? "text-lime-400/70" : "text-blue-400/70")}>
                            {isPost ? "Post" : "Vote"}
                          </span>
                          <span className="text-foreground/30 text-[9px]">·</span>
                          <span className="text-[9px] font-black text-foreground/40 uppercase tracking-wide truncate">{item.brand}</span>
                        </div>
                        <h4 className="text-sm font-black text-foreground truncate tracking-tight">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Calendar className="w-3 h-3 text-foreground/30" />
                          <span className="text-[10px] text-foreground/40 font-black">{item.date}</span>
                          {isPost && item.votesReceived !== undefined && (
                            <>
                              <span className="text-foreground/20">·</span>
                              <ThumbsUp className="w-3 h-3 text-foreground/30" />
                              <span className="text-[10px] text-foreground/40 font-black">{item.votesReceived.toLocaleString()} votes</span>
                            </>
                          )}
                          {!isPost && item.votesCast !== undefined && item.votesCast > 0 && (
                            <>
                              <span className="text-foreground/20">·</span>
                              <span className="text-[10px] text-foreground/40 font-black">{item.votesCast} cast</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: rank / status + earnings */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {item.rank != null ? (
                          item.rank === 1 ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[9px] font-black border border-yellow-500/20">
                              <Crown className="w-2.5 h-2.5" /> #1
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/50 text-[9px] font-black border border-foreground/[0.08]">
                              #{item.rank}
                            </span>
                          )
                        ) : (
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                            ["posting", "voting", "scheduled"].includes(item.status)
                              ? "bg-lime-400/10 text-lime-400 border-lime-400/20"
                              : "bg-foreground/[0.04] text-foreground/40 border-foreground/[0.06]"
                          )}>
                            {item.status}
                          </span>
                        )}
                        {!!item.earnings && item.earnings > 0 && (
                          <span className="text-[10px] font-black text-lime-400">${item.earnings.toFixed(2)}</span>
                        )}
                      </div>

                      <ArrowUpRight className="w-4 h-4 text-foreground/10 group-hover:text-foreground/30 transition-colors shrink-0" />
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* ── Right sidebar: XP + Growth ── */}
            <div className="lg:w-[300px] xl:w-[320px] flex-shrink-0 space-y-6">

              {/* XP / Level card */}
              <div className={cn(
                "relative overflow-hidden rounded-[24px] border p-5",
                tier.bar.replace("bg-", "border-") + "/30",
                "bg-gradient-to-br from-white/[0.04] to-transparent"
              )}>
                <div className={cn("absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[60px] opacity-40", tier.bg)} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground/40 mb-1">Current Rank</p>
                      <div className="flex items-baseline gap-2">
                        <span className={cn("font-display text-5xl leading-none tracking-tight", tier.color)}>
                          {level}
                        </span>
                        <span className={cn("text-xs font-black uppercase tracking-widest", tier.color)}>
                          {tier.name}
                        </span>
                      </div>
                    </div>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", tier.bg, tier.bar.replace("bg-", "border-") + "/30")}>
                      <Zap className={cn("w-6 h-6", tier.color)} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Total XP</span>
                    <span className="font-display text-lg text-foreground tracking-tight">{xp.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", tier.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${xpProgress}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-foreground/35">
                      <span>{(xp % 1000).toLocaleString()} / 1000 XP</span>
                      <span>{xpToNext.toLocaleString()} to Lv.{level + 1}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Index */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/50">Growth Index</h3>
                  <TrendingUp className="w-3.5 h-3.5 text-foreground/40" />
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Creation", value: creationScore, bar: "bg-lime-400", desc: `${stats?.posts ?? 0} posts` },
                    { label: "Voting", value: socialScore, bar: "bg-blue-400", desc: `${stats?.votesCast ?? 0} votes cast` },
                    { label: "Community", value: communityScore, bar: "bg-purple-400", desc: `${stats?.events ?? 0} events` },
                  ].map(g => (
                    <div key={g.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-foreground/50 uppercase tracking-widest">{g.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-foreground/30">{g.desc}</span>
                          <span className="text-[10px] font-black text-foreground/60">{g.value}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", g.bar)}
                          initial={{ width: 0 }}
                          animate={{ width: `${g.value}%` }}
                          transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {(user?.currentStreak ?? 0) > 0 && (
                  <div className="pt-4 border-t border-white/[0.04] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">{user?.currentStreak} Day Streak</p>
                      <p className="text-[9px] font-black text-foreground/40 uppercase tracking-wide mt-0.5">Keep it going</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </main>
      </SidebarLayout>
    </div>
  );
}
