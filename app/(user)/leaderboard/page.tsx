"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import LeaderboardBanner from "@/components/leaderboard/LeaderboardBanner";
import TopUsers from "@/components/leaderboard/TopUsers";
import LeaderboardFilters from "@/components/leaderboard/LeaderboardFilters";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";

export default function Leaderboard() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto">
                    <div className="px-4 md:px-8 py-8 space-y-10 pb-24 md:pb-20 w-full">
                        {/* Title + Subtitle */}
                        <div className="mb-2">
                            <h1 className="text-3xl font-black text-foreground tracking-tighter mb-2">Leaderboard</h1>
                            <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-[0.15em] leading-relaxed">Top earning creators and most influential brands</p>
                        </div>

                        {/* Top 3 Users */}
                        <TopUsers />

                        {/* Filters + Table */}
                        <div className="space-y-6">
                            <LeaderboardFilters />
                            <LeaderboardTable />
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
