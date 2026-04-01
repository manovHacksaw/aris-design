"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { cn } from "@/lib/utils";

type TabType = "users" | "brands" | "events";
type TimelineKey = "D" | "W" | "M" | "A";

const TABS: { id: TabType; label: string }[] = [
    { id: "users", label: "Users" },
    { id: "brands", label: "Brands" },
    { id: "events", label: "Events" },
];

const BRAND_DOMAINS = ["ALL", "APPAREL", "SAAS", "FINANCE", "ELECTRONICS", "F&B", "GAMING", "STARTUPS"];
const EVENT_DOMAINS = ["ALL", "LOGO", "POSTER", "PRODUCT", "SOCIAL", "MOTION", "PACKAGING", "OTHER"];

const TIMELINES: { key: TimelineKey; label: string }[] = [
    { key: "D", label: "1d" },
    { key: "W", label: "1w" },
    { key: "M", label: "1m" },
    { key: "A", label: "1yr" },
];

function LeaderboardContent() {
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get("tab") as TabType) || "users";
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [brandDomain, setBrandDomain] = useState("ALL");
    const [eventDomain, setEventDomain] = useState("ALL");
    const [timeline, setTimeline] = useState<TimelineKey>("A");

    const activeDomains = activeTab === "brands" ? BRAND_DOMAINS : EVENT_DOMAINS;
    const activeDomain = activeTab === "brands" ? brandDomain : eventDomain;
    const setActiveDomain = activeTab === "brands" ? setBrandDomain : setEventDomain;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <SidebarLayout>
                <main className="flex-1 flex flex-col w-full pt-6 lg:pt-10 pb-20 md:pb-12 space-y-8">

                    {/* Header */}
                    <div>
                        <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight">
                            Leaderboard
                        </h1>
                        <p className="mt-1 text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">
                            Global Rankings · Real-time
                        </p>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/[0.05] pb-4">

                        {/* Type tabs */}
                        <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 shrink-0">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-150",
                                        activeTab === tab.id
                                            ? "bg-white text-black shadow"
                                            : "text-white/30 hover:text-white/65"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Domain filters — hidden for Users tab */}
                        {activeTab !== "users" && (
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
                                {activeDomains.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setActiveDomain(d)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 border",
                                            activeDomain === d
                                                ? "border-white/20 bg-white/[0.07] text-white/80"
                                                : "border-transparent text-white/22 hover:text-white/50"
                                        )}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeTab === "users" && <div className="flex-1" />}

                        {/* Timeline */}
                        <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 shrink-0">
                            {TIMELINES.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setTimeline(t.key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                                        timeline === t.key
                                            ? "bg-white/10 text-white"
                                            : "text-white/30 hover:text-white/60"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <LeaderboardTable
                        activeTab={activeTab}
                        domain={activeTab === "users" ? "ALL" : activeDomain}
                        timeline={timeline}
                    />

                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}

export default function Leaderboard() {
    return (
        <Suspense>
            <LeaderboardContent />
        </Suspense>
    );
}
