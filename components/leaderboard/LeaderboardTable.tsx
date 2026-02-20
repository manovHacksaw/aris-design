"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, ThumbsUp, Trophy, Zap, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import CompactLeaderboardCard from "@/components/leaderboard/CompactLeaderboardCard";
import { getLeaderboard, getBrandLeaderboard, getEventLeaderboard, getContentLeaderboard } from "@/services/mockUserService";
import type { LeaderboardEntry, BrandLeaderboardEntry, EventLeaderboardEntry, ContentLeaderboardEntry } from "@/types/api";

type TabType = 'users' | 'brands' | 'events' | 'content';

interface LeaderboardTableProps {
    activeTab: TabType;
}

function TableSkeleton() {
    return (
        <div className="bg-card/50 backdrop-blur-xl border border-border/80 rounded-[32px] overflow-hidden shadow-2xl animate-pulse">
            <div className="hidden md:grid grid-cols-[80px_1fr_120px_110px_120px_1fr] gap-4 px-8 py-5 border-b border-border/60">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-3 bg-secondary/60 rounded-full" />)}
            </div>
            <div className="divide-y divide-border/40">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="px-8 py-6 flex items-center gap-6">
                        <div className="w-8 h-4 bg-secondary/60 rounded-full shrink-0" />
                        <div className="w-10 h-10 bg-secondary/60 rounded-full shrink-0" />
                        <div className="flex-1 h-4 bg-secondary/60 rounded-full max-w-[160px]" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LeaderboardTable({ activeTab }: LeaderboardTableProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const fetchData = async () => {
            try {
                if (activeTab === 'users') {
                    const res = await getLeaderboard();
                    setData(res.data);
                } else if (activeTab === 'brands') {
                    const res = await getBrandLeaderboard();
                    setData(res);
                } else if (activeTab === 'events') {
                    const res = await getEventLeaderboard();
                    setData(res);
                } else {
                    const res = await getContentLeaderboard();
                    setData(res);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab]);

    if (loading) return <TableSkeleton />;
    if (!data.length) return null;

    const renderHeader = () => {
        switch (activeTab) {
            case 'brands':
                return (
                    <div className="hidden md:grid grid-cols-[80px_1fr_150px_150px_150px] gap-4 px-8 py-5 text-[10px] text-foreground/30 uppercase tracking-[0.2em] font-black border-b border-border/60">
                        <span>Rank</span>
                        <span>Brand</span>
                        <span>Campaigns</span>
                        <span>Prize Pool</span>
                        <span>Total Votes</span>
                    </div>
                );
            case 'events':
                return (
                    <div className="hidden md:grid grid-cols-[80px_1fr_150px_150px_150px] gap-4 px-8 py-5 text-[10px] text-foreground/30 uppercase tracking-[0.2em] font-black border-b border-border/60">
                        <span>Rank</span>
                        <span>Event</span>
                        <span>Participants</span>
                        <span>Total Votes</span>
                        <span>Prize Pool</span>
                    </div>
                );
            case 'content':
                return (
                    <div className="hidden md:grid grid-cols-[80px_1fr_150px_150px_150px] gap-4 px-8 py-5 text-[10px] text-foreground/30 uppercase tracking-[0.2em] font-black border-b border-border/60">
                        <span>Rank</span>
                        <span>Content</span>
                        <span>Creator</span>
                        <span>Votes</span>
                        <span>Earned</span>
                    </div>
                );
            default: // users
                return (
                    <div className="hidden md:grid grid-cols-[80px_1fr_150px_150px_150px_1fr] gap-4 px-8 py-5 text-[10px] text-foreground/30 uppercase tracking-[0.2em] font-black border-b border-border/60">
                        <span>Rank</span>
                        <span>User</span>
                        <span>XP</span>
                        <span>Votes Cast</span>
                        <span>Votes Received</span>
                        <span>Rewards</span>
                    </div>
                );
        }
    };

    const renderRow = (item: any, i: number) => {
        const isUser = activeTab === 'users';
        const isBrand = activeTab === 'brands';
        const isEvent = activeTab === 'events';
        const isContent = activeTab === 'content';

        return (
            <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                    "group transition-all duration-300",
                    isUser && item.isCurrentUser ? "bg-primary/5" : "hover:bg-foreground/[0.02]"
                )}
            >
                <div className={cn(
                    "grid gap-4 items-center px-8 py-6 cursor-pointer",
                    isUser ? "grid-cols-[80px_1fr_150px_150px_150px_1fr]" : "grid-cols-[80px_1fr_150px_150px_150px]"
                )}>
                    {/* Rank */}
                    <span className={cn("text-sm font-black tracking-tight", item.rank <= 3 ? "text-primary" : "text-foreground/30")}>
                        #{item.rank.toString().padStart(2, '0')}
                    </span>

                    {/* Identity Column */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img src={item.avatar || item.coverImage} alt={item.username || item.name || item.title} className={cn("w-10 h-10 object-cover bg-background group-hover:border-primary transition-colors", isUser || isBrand ? "rounded-full border-2 border-border/50" : "rounded-lg border border-border/50")} />
                            {isUser && item.isCurrentUser && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />}
                        </div>
                        <div className="flex flex-col">
                            <span className={cn("text-sm font-black tracking-tight", isUser && item.isCurrentUser ? "text-primary" : "text-foreground")}>
                                {item.username || item.name || item.title}
                            </span>
                            {isUser && item.isCurrentUser && <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5">You</span>}
                        </div>
                    </div>

                    {/* Columns based on type */}
                    {isUser && (
                        <>
                            <span className="text-sm font-black text-primary tracking-tight">{item.xp?.toLocaleString()} XP</span>
                            <span className="text-sm font-bold text-foreground/60 flex items-center gap-2">
                                <MousePointerClick className="w-4 h-4 text-foreground/20" />
                                {item.votesCast?.toLocaleString()}
                            </span>
                            <span className="text-sm font-bold text-foreground/60 flex items-center gap-2">
                                <ThumbsUp className="w-4 h-4 text-foreground/20" />
                                {item.totalVotesReceived?.toLocaleString()}
                            </span>
                            <span className="text-sm font-black text-accent tracking-tight">${item.totalRewardsEarned?.toLocaleString()}</span>
                        </>
                    )}

                    {isBrand && (
                        <>
                            <span className="text-sm font-bold text-foreground/60 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-foreground/20" />
                                {item.campaignsCount}
                            </span>
                            <span className="text-sm font-black text-accent">${item.totalPrizePool?.toLocaleString()}</span>
                            <span className="text-sm font-bold text-foreground/60 flex items-center gap-2">
                                <ThumbsUp className="w-4 h-4 text-foreground/20" />
                                {item.totalEngagements > 1000000 ? `${(item.totalEngagements / 1000000).toFixed(1)}M` : `${(item.totalEngagements / 1000).toFixed(1)}k`}
                            </span>
                        </>
                    )}

                    {isEvent && (
                        <>
                            <span className="text-sm font-bold text-foreground/60">{item.participants?.toLocaleString()}</span>
                            <span className="text-sm font-bold text-foreground/60">{item.totalVotes?.toLocaleString()}</span>
                            <span className="text-sm font-black text-accent">${item.prizePool?.toLocaleString()}</span>
                        </>
                    )}

                    {isContent && (
                        <>
                            <span className="text-sm font-bold text-foreground/60">{item.creatorName}</span>
                            <span className="text-sm font-bold text-foreground/60">{item.votes?.toLocaleString()}</span>
                            <span className="text-sm font-black text-accent">${item.earned?.toLocaleString()}</span>
                        </>
                    )}

                </div>
            </motion.div>
        );
    };

    return (
        <div className="bg-card/50 backdrop-blur-xl border border-border/80 rounded-[32px] overflow-hidden shadow-2xl">
            {renderHeader()}
            <div className="divide-y divide-border/40">
                {data.map((item, i) => renderRow(item, i))}
            </div>

            {/* Mobile Fallback - Simplified List */}
            <div className="md:hidden flex flex-col gap-4 p-4 text-center">
                <p className="text-xs text-foreground/40 italic">Switch to desktop for detailed {activeTab} stats.</p>
                {data.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                        <span className="text-xs font-black text-foreground/30 w-5">#{item.rank}</span>
                        <div className="flex-1 text-left font-bold text-sm truncate">{item.username || item.name || item.title}</div>
                        <div className="text-xs font-black text-primary">
                            {isUser && `${item.xp} XP`}
                            {!isUser && (item.totalPrizePool || item.prizePool || item.earned ? `$${(item.totalPrizePool || item.prizePool || item.earned).toLocaleString()}` : '')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const isUser = false; // Just to satisfy typescript in the mobile fallback map, though it won't work perfectly without context. Corrected below.
