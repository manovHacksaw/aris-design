"use client";

import { CheckCircle, Edit2, UserPlus, UserCheck, UserMinus, MessageSquare, Flame, Trophy, Share2, Twitter, Instagram, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import type { User, UserStats } from "@/types/user";
import { xpToLevel, levelToRank, formatCount, formatEarnings } from "@/types/user";

interface ProfileCardProps {
    user: User | null;
    stats: UserStats | null;
    followers: User[];
    following: User[];
    isOwnProfile?: boolean;
    isFollowing?: boolean;
    isFollowLoading?: boolean;
    onToggleFollow?: () => void;
    onFollowersClick?: () => void;
    onFollowingClick?: () => void;
}

export default function ProfileCard({
    user,
    stats,
    followers,
    following,
    isOwnProfile = false,
    isFollowing = false,
    isFollowLoading = false,
    onToggleFollow,
    onFollowersClick,
    onFollowingClick
}: ProfileCardProps) {
    const xp = user?.xp ?? 0;
    const streak = user?.currentStreak ?? 0;
    const level = xpToLevel(xp);
    const rank = levelToRank(level);
    const [copied, setCopied] = useState(false);

    const displayName = user?.displayName || "Anonymous";
    const usernameHandle = user?.username ? `@${user.username}` : "";
    const avatarUrl = user?.avatarUrl || null;

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const postsCount = formatCount(stats?.posts ?? 0);
    const votesCount = formatCount(stats?.votes ?? 0);
    const xpCount = formatCount(xp);
    const earnedCount = formatEarnings(stats?.earnings ?? 0);
    const followersCount = formatCount(followers.length);
    const followingCount = formatCount(following.length);

    const hasSocialLinks = user?.socialLinks && Object.values(user.socialLinks).some(Boolean);

    return (
        <div className="relative z-10 w-full">
            <div className={cn(
                "bg-card/80 backdrop-blur-xl border-border overflow-hidden",
                "md:rounded-[28px] md:border md:shadow-spotify",
                "border-y md:border-x"
            )}>
                <div className="p-6 md:p-8">
                    {/* Top Row: Avatar + Identity + Actions */}
                    <div className="flex items-start gap-5 mb-6">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-[4px] border-card bg-background overflow-hidden shadow-lg">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-primary text-3xl font-black uppercase">
                                            {displayName.charAt(0)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-primary rounded-lg p-1 border-[3px] border-card shadow-lg">
                                <CheckCircle className="w-3 h-3 text-background" />
                            </div>
                        </div>

                        {/* Identity */}
                        <div className="flex-1 min-w-0 pt-1">
                            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-none mb-1">{displayName}</h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                                {usernameHandle && (
                                    <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest">{usernameHandle}</p>
                                )}

                                {/* Social Links */}
                                {hasSocialLinks && (
                                    <div className="flex items-center gap-3 border-l border-border/40 pl-4">
                                        {user?.socialLinks?.twitter && (
                                            <a href={user.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-foreground/30 hover:text-foreground transition-colors">
                                                <Twitter className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        {user?.socialLinks?.instagram && (
                                            <a href={user.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-foreground/30 hover:text-foreground transition-colors">
                                                <Instagram className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        {user?.socialLinks?.website && (
                                            <a href={user.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-foreground/30 hover:text-foreground transition-colors">
                                                <Globe className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Followers / Following counts */}
                            <div className="flex items-center gap-4">
                                <button onClick={onFollowersClick} className="group">
                                    <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{followersCount}</span>
                                    <span className="text-[10px] text-foreground/30 font-bold ml-1">followers</span>
                                </button>
                                <button onClick={onFollowingClick} className="group">
                                    <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{followingCount}</span>
                                    <span className="text-[10px] text-foreground/30 font-bold ml-1">following</span>
                                </button>
                            </div>
                        </div>

                        {/* Desktop action buttons */}
                        <div className="shrink-0 hidden md:flex items-center gap-2">
                            <button
                                onClick={handleShare}
                                className="p-2.5 bg-secondary text-foreground/60 rounded-xl border border-border hover:bg-foreground/10 transition-all active:scale-95"
                                title="Share Profile"
                            >
                                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                            </button>

                            {isOwnProfile ? (
                                <Link href="/settings" className="flex items-center gap-2 bg-secondary text-foreground px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] border border-border hover:bg-foreground hover:text-background transition-all">
                                    <Edit2 className="w-3 h-3" />
                                    Edit Profile
                                </Link>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={onToggleFollow}
                                        disabled={isFollowLoading}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-60",
                                            isFollowing
                                                ? "bg-secondary border border-border text-foreground/70 hover:border-red-500/40 hover:text-red-400"
                                                : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                                        )}
                                    >
                                        {isFollowLoading ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : isFollowing ? (
                                            <UserMinus className="w-3 h-3" />
                                        ) : (
                                            <UserPlus className="w-3 h-3" />
                                        )}
                                        {isFollowing ? "Unfollow" : "Follow"}
                                    </button>
                                    <button className="p-2.5 bg-secondary text-foreground/60 rounded-xl border border-border hover:bg-foreground/10 transition-all">
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className={cn(
                        "grid gap-3 mb-5",
                        isOwnProfile ? "grid-cols-4" : "grid-cols-3"
                    )}>
                        {[
                            { label: "Posts", value: postsCount },
                            { label: "Votes", value: votesCount },
                            { label: "XP", value: xpCount, accent: true },
                            { label: "Earned", value: earnedCount, hidden: !isOwnProfile },
                        ].filter(s => !s.hidden).map((stat) => (
                            <div
                                key={stat.label}
                                className={cn(
                                    "bg-secondary/50 rounded-2xl p-3 text-center border border-border/30",
                                    stat.accent && "bg-primary/5 border-primary/10"
                                )}
                            >
                                <span className={cn(
                                    "block text-lg md:text-xl font-black tracking-tighter",
                                    stat.accent ? "text-primary" : "text-foreground"
                                )}>
                                    {stat.value}
                                </span>
                                <span className="text-[9px] text-foreground/40 uppercase tracking-widest font-black">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Rank + Level + Streak badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2 border border-border/30">
                            <Trophy className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{rank}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-purple-500/5 rounded-xl px-3 py-2 border border-purple-500/10">
                            <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">LVL {level}</span>
                        </div>
                        {streak > 0 && (
                            <div className="flex items-center gap-2 bg-orange-500/5 rounded-xl px-3 py-2 border border-orange-500/10">
                                <Flame className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{streak}d streak</span>
                            </div>
                        )}
                        <div className="flex-1" />
                    </div>

                    {/* Mobile action buttons */}
                    <div className="flex gap-3 mt-5 md:hidden">
                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center p-3 bg-secondary text-foreground/60 rounded-xl border border-border hover:bg-foreground/10 transition-all active:scale-95"
                        >
                            {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                        </button>

                        {isOwnProfile ? (
                            <Link href="/settings" className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background py-3 rounded-xl font-black uppercase tracking-widest text-[10px]">
                                <Edit2 className="w-3 h-3" />
                                Edit Profile
                            </Link>
                        ) : (
                            <>
                                <button
                                    onClick={onToggleFollow}
                                    disabled={isFollowLoading}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-60",
                                        isFollowing
                                            ? "bg-secondary border border-border text-foreground/70 hover:border-red-500/40 hover:text-red-400"
                                            : "bg-primary text-white shadow-lg shadow-primary/20"
                                    )}
                                >
                                    {isFollowLoading ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : isFollowing ? (
                                        <UserMinus className="w-3 h-3" />
                                    ) : (
                                        <UserPlus className="w-3 h-3" />
                                    )}
                                    {isFollowing ? "Unfollow" : "Follow"}
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 bg-secondary text-foreground py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border border-border">
                                    <MessageSquare className="w-3 h-3" />
                                    Message
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
