"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import HomeHeader from "@/components/home/HomeHeader";
import TrendingEvents from "@/components/home/TrendingEvents";
import EventsTabFeed from "@/components/home/EventsTabFeed";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/auth/AuthGuard";
import RightDashboard from "@/components/home/RightDashboard";
import PlatformTour from "@/components/tour/PlatformTour";
import { useEffect } from "react";
import { perfLog, perfNow } from "@/lib/perf";

export default function Home() {
  useEffect(() => {
    const start = perfNow();
    perfLog("home", "mounted");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        perfLog("home", `first painted frame in ${(perfNow() - start).toFixed(1)}ms`);
      });
    });
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
        <SidebarLayout>
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full mx-auto pb-20">

            {/* Left: Main Content Area (~70%) */}
            <main className="flex-1 min-w-0 space-y-12 pt-6 lg:pt-10">
              {/* 1. Header Section (Heading, Search, Categories) */}
              <HomeHeader />

              {/* 2. Trending Section */}
              <TrendingEvents />

              {/* 4. Events Tabbed Feed */}
              <EventsTabFeed />
            </main>

            {/* Right: Personal Activity & XP (~30%) */}
            <aside className="hidden lg:block w-full lg:w-[350px] 2xl:w-[400px] flex-shrink-0 pt-6">
              <RightDashboard />
            </aside>
          </div>

          {/* Mobile Bottom Nav */}
          <div className="md:hidden fixed bottom-1 left-0 right-0 z-50">
            <BottomNav />
          </div>
        </SidebarLayout>
        <PlatformTour />
      </div>
    </AuthGuard>
  );
}
