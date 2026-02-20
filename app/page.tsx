"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import TrendingCarousel from "@/components/home/TrendingCarousel";
import FilterChips from "@/components/home/FilterChips";
import FeedGrid from "@/components/home/FeedGrid";
import BottomNav from "@/components/BottomNav";

import RightDashboard from "@/components/home/RightDashboard";
import HeroBanner from "@/components/home/HeroBanner";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <SidebarLayout>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full mx-auto pb-20">

          {/* Left: Main Content Area (~70%) */}
          <main className="flex-1 min-w-0 space-y-6 lg:space-y-8 pt-1 lg:pt-2">
            {/* 1. Hero Section & Right Panel Top Alignment Row */}
            <HeroBanner />

            {/* 2. Trending Section */}
            <TrendingCarousel />

            {/* 3. Filters & Feed grid */}
            <div className="space-y-6 lg:space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <FilterChips />

              </div>
              <FeedGrid />
            </div>
          </main>

          {/* Right: Personal Activity & XP (~30%) */}
          <aside className="hidden lg:block w-full lg:w-[340px] 2xl:w-[380px] flex-shrink-0">
            <RightDashboard />
          </aside>
        </div>
        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <BottomNav />
        </div>
      </SidebarLayout>
    </div>
  );
}
