"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import EventsTabFeed from "@/components/home/EventsTabFeed";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/auth/AuthGuard";
import RightDashboard from "@/components/home/RightDashboard";
import PlatformTour from "@/components/tour/PlatformTour";
import { HomeFilterBar } from "@/components/home/HomeFilterBar";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { perfLog, perfNow } from "@/lib/perf";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("events");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

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
            <main className="flex-1 min-w-0 space-y-8 pt-4 sm:pt-6 lg:pt-10">
              {/* Testnet Disclaimer */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-4"
              >
                <div className="p-2 rounded-xl bg-primary/20 text-primary shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary">Testnet Version</h3>
                  <p className="text-xs font-medium text-primary/70 leading-relaxed">
                    Aris is currently in testnet. All assets, rewards, and transactions are for testing purposes only and have no real-world value.
                  </p>
                </div>
              </motion.div>

              <HomeFilterBar 
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />

              <EventsTabFeed 
                searchQuery={searchQuery}
                category={selectedCategory}
              />
            </main>

            {/* Right: Personal Activity & XP (~30%) */}
            <aside className="hidden lg:block w-full lg:w-[280px] 2xl:w-[300px] flex-shrink-0 pt-6">
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
