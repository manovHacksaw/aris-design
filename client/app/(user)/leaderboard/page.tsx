"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import LeaderboardFilters from "@/components/leaderboard/LeaderboardFilters";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import LeaderboardStatsHeader from "@/components/leaderboard/LeaderboardStatsHeader";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { getFollowing, getUserSubmissions } from "@/services/user.service";
import { getEventsVotedByUser } from "@/services/event.service";
import type { EventData } from "@/types/events";
import { toEventData } from "@/components/home/TrendingEvents"; // I'll check if I can export this or copy logic

export default function Leaderboard() {
    const [activeTab, setActiveTab] = useState<'users' | 'brands' | 'events' | 'content'>('users');
    const { user } = useUser();
    const [topData, setTopData] = useState({
        brands: [] as any[],
        events: [] as any[],
        content: [] as any[]
    });

    useEffect(() => {
        if (!user) return;

        const loadTopSections = async () => {
            try {
                const [followed, participated, submissions] = await Promise.all([
                    getFollowing(user.id).catch(() => []),
                    getEventsVotedByUser(user.id).catch(() => []),
                    getUserSubmissions(user.id).catch(() => [])
                ]);

                setTopData({
                    brands: followed.slice(0, 5).map((b, i) => ({
                        id: b.id,
                        name: b.displayName || b.username,
                        avatar: b.avatarUrl,
                        campaignsCount: 0, // Placeholder
                        rank: i + 1
                    })),
                    events: participated.slice(0, 3).map((e: any) => ({
                        id: e.id,
                        title: e.title,
                        rewardPool: e.leaderboardPool ? `$${e.leaderboardPool.toLocaleString()}` : "TBD",
                        participationCount: e._count?.submissions || 0,
                        image: e.imageUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
                        creator: { name: e.brand?.name || "Unknown" },
                        timeRemaining: "Live",
                        mode: e.eventType === 'vote_only' ? 'vote' : 'post'
                    })),
                    content: submissions.slice(0, 4).map((s: any) => ({
                        id: s.id,
                        imageUrl: s.imageCid ? `https://gateway.pinata.cloud/ipfs/${s.imageCid}` : s.imageUrl,
                        voteCount: s._count?.votes || 0,
                        earned: 0,
                        rank: 0
                    }))
                });
            } catch (err) {
                console.error("Failed to load top data", err);
            }
        };

        loadTopSections();
    }, [user]);

    const userStats = user ? {
        rank: 124, // Mock rank
        username: user.username || user.displayName || "You",
        avatar: user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        xp: user.xp,
        votesCast: 42,
        votesReceived: 128,
        streak: user.currentStreak ?? 0,
        level: Math.floor(user.xp / 1000) + 1,
        nextLevelXp: (Math.floor(user.xp / 1000) + 1) * 1000
    } : null;

    const tabs = [
        { id: 'users', label: 'Users' },
        { id: 'brands', label: 'Brands' },
        { id: 'events', label: 'Events' },
        { id: 'content', label: 'Content' },
    ] as const;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-20 md:pb-0">
            <SidebarLayout>
                <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-12">

                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">Leaderboard</h1>
                        <p className="text-xs font-black text-white/30 uppercase tracking-[0.3em]">Global Rankings & Performance</p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-4 border-t border-white/5">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                    activeTab === tab.id
                                        ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                        : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Stats/Highlight Section (Top Part) */}
                    <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <LeaderboardStatsHeader
                            tab={activeTab}
                            user={userStats}
                            topData={topData}
                        />
                    </section>

                    {/* Global Rankings Table (Bottom Part) */}
                    <section className="space-y-8 pt-12 border-t border-white/5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Global Rankings</h3>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Live updates for all {activeTab}</p>
                            </div>
                            <LeaderboardFilters />
                        </div>

                        <div className="pt-2">
                            <LeaderboardTable activeTab={activeTab} />
                        </div>
                    </section>

                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}
