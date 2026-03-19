"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import {
  Copy, Calendar, Edit3, Trophy, Zap, Flame, ImageIcon,
  ThumbsUp, Crown, Lock, TrendingUp, Building2, Star,
  Shield, MousePointerClick, X, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { followUser, unfollowUser, getUserSubmissions } from "@/services/user.service";
import type { User, UserStats } from "@/types/user";

// ─── Tiers ───────────────────────────────────────────────────────
const TIERS = [
  { min: 1, max: 2, name: "Rookie", color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/30" },
  { min: 3, max: 5, name: "Hustler", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { min: 6, max: 9, name: "Creator", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  { min: 10, max: 14, name: "Veteran", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  { min: 15, max: 19, name: "Elite", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  { min: 20, max: 999, name: "Legend", color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/40" },
] as const;

function getTier(level: number) {
  return TIERS.find(t => level >= t.min && level <= t.max) ?? TIERS[0];
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// ─── Milestones (same set as Dashboard) ──────────────────────────
const MILESTONES = [
  // Vote
  { id: "v1", label: "First Vote", desc: "Cast your very first vote", icon: MousePointerClick, target: 1, type: "vote", xp: 50, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { id: "v2", label: "Vote x10", desc: "Cast 10 votes total", icon: Flame, target: 10, type: "vote", xp: 150, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { id: "v3", label: "Vote x50", desc: "50 votes — you're a real judge", icon: Shield, target: 50, type: "vote", xp: 300, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
  { id: "v4", label: "Vote x100", desc: "Legendary curator status", icon: Star, target: 100, type: "vote", xp: 600, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  // Post
  { id: "p1", label: "First Drop", desc: "Submit your first creation", icon: ImageIcon, target: 1, type: "post", xp: 100, color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/20" },
  { id: "p2", label: "5 Drops", desc: "5 submissions and counting", icon: Zap, target: 5, type: "post", xp: 300, color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/20" },
  { id: "p3", label: "10 Drops", desc: "Double digits. Serious creator.", icon: Flame, target: 10, type: "post", xp: 600, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  { id: "p4", label: "Top Ranker", desc: "Finish #1 in any event", icon: Crown, target: 1, type: "rank", xp: 800, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  // All
  { id: "a1", label: "Event Hopper", desc: "Join 5 different events", icon: Trophy, target: 5, type: "all", xp: 200, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  { id: "a2", label: "Event Veteran", desc: "Join 20 events", icon: TrendingUp, target: 20, type: "all", xp: 500, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  { id: "a3", label: "Community Builder", desc: "Earn 10 followers", icon: Users, target: 10, type: "subs", xp: 250, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
];

type ContentFilter = "all" | "live" | "completed";

// ─── Props ───────────────────────────────────────────────────────
interface ProfileViewProps {
  isOwnProfile?: boolean;
  user: User | null;
  stats: UserStats | null;
  followers: User[];
  following: User[];
  isFollowing?: boolean;
  isFollowLoading?: boolean;
  onToggleFollow?: () => void;
}

export default function ProfileView({
  isOwnProfile = false,
  user,
  stats,
  followers,
  following,
  isFollowing = false,
  isFollowLoading = false,
  onToggleFollow,
}: ProfileViewProps) {
  const { user: currentUser } = useUser();

  const [copied, setCopied] = useState(false);
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState<{
    show: boolean;
    type: "followers" | "following";
  }>({ show: false, type: "followers" });
  const [modalFollowLoading, setModalFollowLoading] = useState<string | null>(null);
  const [modalFollowing, setModalFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    setSubsLoading(true);
    getUserSubmissions(user.id)
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setSubsLoading(false));
  }, [user?.id]);

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModalFollow = useCallback(async (personId: string) => {
    if (!currentUser || modalFollowLoading) return;
    setModalFollowLoading(personId);
    const alreadyFollowing = modalFollowing.has(personId);
    setModalFollowing(prev => {
      const next = new Set(prev);
      if (alreadyFollowing) next.delete(personId); else next.add(personId);
      return next;
    });
    try {
      if (alreadyFollowing) await unfollowUser(personId);
      else await followUser(personId);
    } catch {
      setModalFollowing(prev => {
        const next = new Set(prev);
        if (alreadyFollowing) next.add(personId); else next.delete(personId);
        return next;
      });
    } finally {
      setModalFollowLoading(null);
    }
  }, [currentUser, modalFollowing, modalFollowLoading]);

  // ── Computed values ──────────────────────────────────────────
  const xp = user?.xp ?? 0;
  const level = Math.floor(xp / 1000) + 1;
  const tier = getTier(level);
  const displayName = user?.displayName || user?.username || "Anonymous";
  const username = user?.username || "user";
  const walletAddr = user?.walletAddress || "";
  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const ranked = submissions.filter(s => s.finalRank != null);
  const winRate = ranked.length > 0
    ? Math.round((ranked.filter(s => s.finalRank <= 3).length / ranked.length) * 100)
    : 0;

  const mostVoted = submissions.length > 0
    ? submissions.reduce((best, s) => (s._count?.votes || 0) > (best._count?.votes || 0) ? s : best, submissions[0])
    : null;

  const bestRank = ranked.length > 0
    ? Math.min(...ranked.map(s => s.finalRank))
    : null;

  const streak = user?.currentStreak ?? 0;

  // Milestone helpers
  function getMilestoneCurrent(type: string) {
    if (type === "vote") return stats?.votesCast ?? 0;
    if (type === "post") return stats?.posts ?? 0;
    if (type === "rank") return bestRank === 1 ? 1 : 0;
    if (type === "subs") return stats?.subscribers ?? 0;
    return stats?.events ?? 0;
  }
  const visibleMilestones = showAllAchievements ? MILESTONES : MILESTONES.slice(0, 8);
  const unlockedCount = MILESTONES.filter(m => getMilestoneCurrent(m.type) >= m.target).length;

  const engagementScore = stats
    ? Math.min(100, Math.floor((stats.votesReceived / Math.max(stats.posts, 1)) * 10))
    : 0;
  const engagementLabel = engagementScore >= 80 ? "Legendary" : engagementScore >= 50 ? "High" : engagementScore >= 20 ? "Rising" : "Building";
  const engagementColor = engagementScore >= 80 ? "text-lime-400" : engagementScore >= 50 ? "text-yellow-400" : engagementScore >= 20 ? "text-blue-400" : "text-white/30";

  const filteredSubmissions = submissions.filter(s => {
    if (contentFilter === "live") return ["posting", "voting", "scheduled"].includes(s.event?.status);
    if (contentFilter === "completed") return s.event?.status === "completed";
    return true;
  });

  const socialList = showSocialModal.type === "followers" ? followers : following;

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <SidebarLayout>
        <main className="w-full pt-6 lg:pt-10 pb-24 md:pb-12 space-y-6">

          {/* ── Two-column layout ── */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── Left / Main ── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* ── Identity Card ── */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 md:p-8">
                <div className="flex flex-wrap items-start gap-5">

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-white/[0.1] bg-white/[0.05]">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-display text-4xl text-white/30 uppercase">{displayName[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight mb-1">
                      {displayName}
                    </h1>
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em] mb-3">
                      @{username}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {walletAddr && (
                        <button
                          onClick={() => handleCopy(walletAddr)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.2] rounded-full transition-colors group"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-[10px] font-black text-white/40 font-mono group-hover:text-white/70 transition-colors">
                            {copied ? "Copied!" : truncateAddress(walletAddr)}
                          </span>
                          <Copy className="w-2.5 h-2.5 text-white/20 group-hover:text-white/50 transition-colors" />
                        </button>
                      )}
                      {joinDate && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-full">
                          <Calendar className="w-3 h-3 text-white/30" />
                          <span className="text-[10px] font-black text-white/30 uppercase tracking-wide">Joined {joinDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 ml-auto">
                    {isOwnProfile ? (
                      <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] hover:border-white/[0.2] rounded-xl text-[11px] font-black text-white/60 hover:text-white uppercase tracking-widest transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                    ) : (
                      <button
                        onClick={onToggleFollow}
                        disabled={isFollowLoading}
                        className={cn(
                          "px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                          isFollowing
                            ? "bg-white/[0.06] border border-white/[0.1] text-white/50 hover:border-red-500/30 hover:text-red-400"
                            : "bg-white hover:bg-white/90 text-black"
                        )}
                      >
                        {isFollowLoading ? "..." : isFollowing ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Stats Row ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {subsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[90px] rounded-[20px] bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                  ))
                ) : (
                  <>
                    <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-5 py-4 transition-all">
                      <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-1", tier.color)}>XP Level</p>
                      <p className="font-display text-4xl text-white uppercase tracking-tight leading-none">Lvl {level}</p>
                      <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">{tier.name} Tier</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-5 py-4 transition-all">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-lime-400">Earnings</p>
                      <p className="font-display text-4xl text-white uppercase tracking-tight leading-none">
                        {stats?.earnings ? stats.earnings.toLocaleString() : "0"}
                      </p>
                      <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">USDC Total</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-5 py-4 transition-all">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-blue-400">Events</p>
                      <p className="font-display text-4xl text-white uppercase tracking-tight leading-none">
                        {stats?.events ?? 0}
                      </p>
                      <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">Joined</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-5 py-4 transition-all">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-yellow-400">Win Rate</p>
                      <p className={cn("font-display text-4xl uppercase tracking-tight leading-none", winRate >= 50 ? "text-lime-400" : "text-white")}>
                        {winRate}%
                      </p>
                      <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">Success Score</p>
                    </div>
                  </>
                )}
              </div>

              {/* ── About ── */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 md:p-8 space-y-5">
                <h2 className="font-display text-2xl text-white uppercase tracking-tight">
                  About {displayName.split(" ")[0]}
                </h2>
                {user?.bio ? (
                  <p className="text-sm font-medium text-white/50 leading-relaxed">{user.bio}</p>
                ) : (
                  <p className="text-sm font-black text-white/20 uppercase tracking-wide">No bio yet.</p>
                )}

                <div className="flex items-center gap-8 pt-3 border-t border-white/[0.04]">
                  <button
                    onClick={() => setShowSocialModal({ show: true, type: "followers" })}
                    className="text-left group"
                  >
                    <p className="font-display text-3xl text-white tracking-tight leading-none group-hover:text-primary transition-colors">
                      {formatK(stats?.subscribers ?? followers.length)}
                    </p>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Followers</p>
                  </button>
                  <button
                    onClick={() => setShowSocialModal({ show: true, type: "following" })}
                    className="text-left group"
                  >
                    <p className="font-display text-3xl text-white tracking-tight leading-none group-hover:text-primary transition-colors">
                      {formatK(following.length)}
                    </p>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Following</p>
                  </button>
                  <div>
                    <p className="font-display text-3xl text-white tracking-tight leading-none">
                      {following.length}
                    </p>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Brands Followed</p>
                  </div>
                </div>
              </div>

              {/* ── Content Portfolio ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl text-white uppercase tracking-tight">Content Portfolio</h2>
                  <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl">
                    {(["all", "live", "completed"] as ContentFilter[]).map(f => (
                      <button
                        key={f}
                        onClick={() => setContentFilter(f)}
                        className={cn(
                          "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          contentFilter === f ? "bg-white text-black" : "text-white/30 hover:text-white/60"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {subsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-[100px] rounded-[20px] bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                    ))}
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="py-16 text-center bg-white/[0.02] rounded-[24px] border border-dashed border-white/[0.07]">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="w-5 h-5 text-white/20" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">No posts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Most voted — highlighted banner */}
                    {mostVoted && contentFilter === "all" && (
                      <div className="bg-white/[0.03] border border-primary/20 rounded-[20px] p-4 flex items-center gap-4 group hover:bg-white/[0.05] hover:border-primary/30 transition-all">
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white/[0.05] border border-white/[0.06]">
                          {mostVoted.imageCid ? (
                            <img
                              src={`https://gateway.pinata.cloud/ipfs/${mostVoted.imageCid}`}
                              alt={mostVoted.event?.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <ImageIcon className="w-6 h-6 text-primary/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black text-primary uppercase tracking-widest mb-1.5">
                            <Star className="w-2.5 h-2.5" /> Most Voted Post
                          </span>
                          <h4 className="font-black text-white text-sm truncate">{mostVoted.event?.title || "Untitled Event"}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-wide truncate">
                              {mostVoted.event?.brand?.name || "Unknown Brand"}
                            </span>
                            <span className="text-white/15">·</span>
                            <ThumbsUp className="w-3 h-3 text-white/20 shrink-0" />
                            <span className="text-[10px] font-black text-white/40 shrink-0">
                              {(mostVoted._count?.votes || 0).toLocaleString()} Votes
                            </span>
                          </div>
                        </div>
                        {mostVoted.finalRank != null && (
                          <div className="shrink-0">
                            {mostVoted.finalRank === 1 ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-black border border-yellow-500/20">
                                <Crown className="w-3 h-3" /> #1
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 text-[10px] font-bold border border-white/[0.08]">
                                #{mostVoted.finalRank}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredSubmissions
                        .filter(s => contentFilter !== "all" || s.id !== mostVoted?.id)
                        .map((s, i) => (
                          <motion.div
                            key={s.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="bg-white/[0.02] border border-white/[0.05] rounded-[20px] overflow-hidden group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                          >
                            <div className="w-full aspect-video bg-white/[0.03] overflow-hidden">
                              {s.imageCid ? (
                                <img
                                  src={`https://gateway.pinata.cloud/ipfs/${s.imageCid}`}
                                  alt={s.event?.title}
                                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-8 h-8 text-white/10" />
                                </div>
                              )}
                            </div>
                            <div className="p-3 space-y-1">
                              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest truncate">
                                {s.event?.brand?.name || "Unknown"}
                              </p>
                              <h4 className="text-sm font-black text-white truncate">{s.event?.title || "Untitled"}</h4>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <ThumbsUp className="w-3 h-3 text-white/20" />
                                  <span className="text-[10px] font-black text-white/30">
                                    {(s._count?.votes || 0).toLocaleString()}
                                  </span>
                                </div>
                                {s.finalRank != null && (
                                  s.finalRank === 1 ? (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[9px] font-black border border-yellow-500/20">
                                      <Crown className="w-2.5 h-2.5" /> #1
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30 text-[9px] font-bold border border-white/[0.08]">
                                      #{s.finalRank}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* ── Right Column ── */}
            <div className="lg:w-[300px] xl:w-[320px] flex-shrink-0 space-y-6">

              {/* ── Reputation ── */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 space-y-4">
                <h3 className="font-display text-xl text-white uppercase tracking-tight">Reputation</h3>
                <div className="space-y-2">

                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-all">
                    <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white">Best Ranking</p>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-wide mt-0.5">
                        {bestRank ? `Global Rank #${bestRank}` : "No rankings yet"}
                      </p>
                    </div>
                    {bestRank && (
                      <span className="text-[10px] font-black text-yellow-400 shrink-0">
                        Top {bestRank === 1 ? "1%" : bestRank <= 3 ? "5%" : "10%"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-all">
                    <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white">Current Streak</p>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-wide mt-0.5">Daily submissions</p>
                    </div>
                    <span className="text-[10px] font-black text-orange-400 shrink-0">
                      {streak > 0 ? `${streak} Days` : "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-all">
                    <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white">Engagement</p>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-wide mt-0.5">Votes & posts</p>
                    </div>
                    <span className={cn("text-[10px] font-black shrink-0", engagementColor)}>
                      {engagementLabel}
                    </span>
                  </div>

                </div>
              </div>

              {/* ── Achievements ── */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl text-white uppercase tracking-tight">Achievements</h3>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">
                      {unlockedCount}/{MILESTONES.length} Unlocked
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAllAchievements(v => !v)}
                    className="text-[9px] font-black text-primary/70 hover:text-primary uppercase tracking-widest transition-colors"
                  >
                    {showAllAchievements ? "Show Less" : "See All"}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {visibleMilestones.map(m => {
                    const current = getMilestoneCurrent(m.type);
                    const done = current >= m.target;
                    const pct = Math.min(100, (current / m.target) * 100);
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.id}
                        title={`${m.label} — ${m.desc}\n${done ? "✓ Unlocked" : `${current}/${m.target}`} (+${m.xp} XP)`}
                        className={cn(
                          "aspect-square rounded-2xl flex items-center justify-center border transition-all relative overflow-hidden cursor-default",
                          done
                            ? cn(m.bg, m.border)
                            : pct > 0
                              ? "bg-white/[0.04] border-white/[0.08]"
                              : "bg-white/[0.02] border-white/[0.04]"
                        )}
                      >
                        {done ? (
                          <Icon className={cn("w-5 h-5", m.color)} />
                        ) : pct > 0 ? (
                          <Icon className={cn("w-5 h-5 opacity-30", m.color)} />
                        ) : (
                          <Lock className="w-4 h-4 text-white/15" />
                        )}
                        {!done && pct > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", m.color.replace("text-", "bg-"))}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Brands Followed ── */}
              {following.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 space-y-4">
                  <h3 className="font-display text-xl text-white uppercase tracking-tight">Brands Followed</h3>
                  <div className="space-y-3">
                    {following.slice(0, 5).map((brand: User) => (
                      <div key={brand.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/[0.05] border border-white/[0.06] shrink-0">
                          {brand.avatarUrl ? (
                            <img src={brand.avatarUrl} alt={brand.displayName || ""} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-white/20" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white truncate">{brand.displayName || brand.username}</p>
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-wide">Brand</p>
                        </div>
                        <span className="text-[9px] font-black text-white/30 border border-white/[0.08] px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                          Following
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>

        <div className="md:hidden">
          <BottomNav />
        </div>
      </SidebarLayout>

      {/* ── Social Modal ── */}
      {showSocialModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowSocialModal(s => ({ ...s, show: false }))}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-[#0c0c10] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                {showSocialModal.type} ({socialList.length})
              </span>
              <button
                onClick={() => setShowSocialModal(s => ({ ...s, show: false }))}
                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {socialList.length === 0 ? (
                <p className="text-center text-[11px] font-black text-white/20 uppercase tracking-widest py-10">
                  No {showSocialModal.type} yet
                </p>
              ) : (
                socialList.map(person => {
                  const isSelf = currentUser?.id === person.id;
                  const isPersonFollowed = modalFollowing.has(person.id);
                  return (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-3 hover:bg-white/[0.04] rounded-[14px] transition-colors"
                    >
                      <Link
                        href={`/profile/${person.username || person.id}`}
                        onClick={() => setShowSocialModal(s => ({ ...s, show: false }))}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        {person.avatarUrl ? (
                          <img src={person.avatarUrl} className="w-9 h-9 rounded-xl object-cover border border-white/[0.08] shrink-0" alt={person.displayName || ""} />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-primary text-sm font-black uppercase">
                              {(person.displayName || person.username || "?").charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{person.displayName || person.username || "Unknown"}</p>
                          <p className="text-[10px] text-white/30 font-bold">{person.username ? `@${person.username}` : ""}</p>
                        </div>
                      </Link>
                      {!isSelf && currentUser && (
                        <button
                          onClick={() => handleModalFollow(person.id)}
                          disabled={modalFollowLoading === person.id}
                          className={cn(
                            "ml-3 shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40",
                            isPersonFollowed
                              ? "bg-white/[0.05] border border-white/[0.08] text-white/40 hover:border-red-500/30 hover:text-red-400"
                              : "bg-white text-black hover:bg-white/90"
                          )}
                        >
                          {modalFollowLoading === person.id ? "..." : isPersonFollowed ? "Unfollow" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
