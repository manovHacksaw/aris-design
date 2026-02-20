"use client";

import { CheckCircle, Edit2, UserPlus, MessageSquare, Flame, Trophy, Share2, Instagram, Twitter, Globe, Linkedin, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

interface ProfileCardProps {
    user: {
        name: string;
        handle: string;
        avatar: string;
        headerImage: string;
        bio: string;
        stats: {
            posts: string;
            votes: string;
            xp: string;
            earned: string;
        };
        social: {
            followers: string;
            following: string;
        };
        rank?: string;
        streak?: number;
        level?: number;
        links?: {
            twitter?: string;
            instagram?: string;
            website?: string;
            linkedin?: string;
            facebook?: string;
        }
    };
    isOwnProfile?: boolean;
    onFollowersClick?: () => void;
    onFollowingClick?: () => void;
}

export default function ProfileCard({
    user,
    isOwnProfile = false,
    onFollowersClick,
    onFollowingClick
}: ProfileCardProps) {
    const rank = user.rank || "Bronze IV";
    const streak = user.streak || 12;
    const level = user.level || 42;
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-primary rounded-lg p-1 border-[3px] border-card shadow-lg">
                                <CheckCircle className="w-3 h-3 text-background" />
                            </div>
                        </div>

                        {/* Identity */}
                        <div className="flex-1 min-w-0 pt-1">
                            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-none mb-1">{user.name}</h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                                <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest">{user.handle}</p>

                                {/* Social Links */}
                                <div className="flex items-center gap-3 border-l border-border/40 pl-4">
                                    {/* Mock links if none provided for demo */}
                                    <Link href="#" className="text-foreground/30 hover:text-foreground transition-colors"><Twitter className="w-3.5 h-3.5" /></Link>
                                    <Link href="#" className="text-foreground/30 hover:text-foreground transition-colors"><Instagram className="w-3.5 h-3.5" /></Link>
                                    <Link href="#" className="text-foreground/30 hover:text-foreground transition-colors"><Globe className="w-3.5 h-3.5" /></Link>
                                </div>
                            </div>

                            {/* Social counts inline */}
                            <div className="flex items-center gap-4">
                                <button onClick={onFollowersClick} className="group">
                                    <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{user.social.followers}</span>
                                    <span className="text-[10px] text-foreground/30 font-bold ml-1">followers</span>
                                </button>
                                <button onClick={onFollowingClick} className="group">
                                    <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{user.social.following}</span>
                                    <span className="text-[10px] text-foreground/30 font-bold ml-1">following</span>
                                </button>
                            </div>
                        </div>

                        {/* Action button */}
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
                                    <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
                                        <UserPlus className="w-3 h-3" />
                                        Follow
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
                            { label: "Posts", value: user.stats.posts },
                            { label: "Votes", value: user.stats.votes },
                            { label: "XP", value: user.stats.xp, accent: true },
                            { label: "Earned", value: user.stats.earned, hidden: !isOwnProfile },
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

                    {/* Rank + Streak bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2 border border-border/30">
                            <Trophy className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{rank}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-purple-500/5 rounded-xl px-3 py-2 border border-purple-500/10">
                            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest">LVL {level}</div>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-500/5 rounded-xl px-3 py-2 border border-orange-500/10">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{streak}d streak</span>
                        </div>
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
                                <button className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                                    <UserPlus className="w-3 h-3" />
                                    Follow
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
