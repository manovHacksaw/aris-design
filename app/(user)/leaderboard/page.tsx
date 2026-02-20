"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import TopUsers from "@/components/leaderboard/TopUsers";
import LeaderboardFilters from "@/components/leaderboard/LeaderboardFilters";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import UserStatsCard from "@/components/leaderboard/UserStatsCard";
import { cn } from "@/lib/utils";
import { getUserStats } from "@/services/mockUserService";

type TabType = 'users' | 'brands' | 'events' | 'content';

export default function Leaderboard() {
    const [activeTab, setActiveTab] = useState<TabType>('users');
    const [userStats, setUserStats] = useState<any>(null);

    useEffect(() => {
        getLeaderboardData();
    }, []);

    const getLeaderboardData = async () => {
        const stats = await getUserStats();
        setUserStats({
            rank: 42,
            username: "You",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            xp: stats.totalXp,
            votesCast: 1420,
            votesReceived: 850,
            streak: stats.streak,
            level: 12,
            nextLevelXp: 5000
        });
    }

    const tabs = [
        { id: 'users', label: 'Users' },
        { id: 'brands', label: 'Brands' },
        { id: 'events', label: 'Events' },
        { id: 'content', label: 'Content' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-20 md:pb-0">
            <SidebarLayout>
                <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto">
                    <div className="px-4 md:px-8 py-8 space-y-8 w-full">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter mb-2">Leaderboard</h1>
                                <p className="text-xs font-bold text-foreground/40 uppercase tracking-[0.15em] leading-relaxed">
                                    Global Rankings & Performance
                                </p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-white/5">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={cn(
                                        "relative px-6 py-3 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "text-primary"
                                            : "text-foreground/40 hover:text-foreground hover:bg-white/5 rounded-t-lg"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_10px_2px_rgba(var(--primary),0.5)]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="space-y-8">

                            {/* User Specific Performance Highlight */}
                            {activeTab === 'users' && userStats && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black tracking-tight text-foreground/80">Your Performance</h3>
                                    </div>
                                    <UserStatsCard user={userStats} />
                                </div>
                            )}

                            {/* Top Ranked Podium (Only for Users) */}
                            {activeTab === 'users' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black tracking-tight text-foreground/80">Top Users</h3>
                                    <TopUsers />
                                </div>
                            )}

                            {/* Main Table */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-black tracking-tight text-foreground/80">Global Rankings</h3>
                                    {activeTab === 'users' && <LeaderboardFilters />}
                                </div>
                                <LeaderboardTable activeTab={activeTab} />
                            </div>
                        </div>
                    </div>
                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}
