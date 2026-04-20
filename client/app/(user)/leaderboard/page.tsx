"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SidebarLayout from "@/components/home/SidebarLayout";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { cn } from "@/lib/utils";

type TabType = "users" | "brands" | "events";
type TimelineKey = "D" | "W" | "M" | "A";
type UserMode = "voters" | "creators";

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

const USER_MODES: { id: UserMode; label: string }[] = [
    { id: "voters", label: "Voters" },
    { id: "creators", label: "Creators" },
];

function LeaderboardContent() {
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get("tab") as TabType) || "users";
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [userMode, setUserMode] = useState<UserMode>("voters");
    const [brandDomain, setBrandDomain] = useState("ALL");
    const [eventDomain, setEventDomain] = useState("ALL");
    const [timeline, setTimeline] = useState<TimelineKey>("A");

    const activeDomains = activeTab === "brands" ? BRAND_DOMAINS : EVENT_DOMAINS;
    const activeDomain = activeTab === "brands" ? brandDomain : eventDomain;
    const setActiveDomain = activeTab === "brands" ? setBrandDomain : setEventDomain;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <SidebarLayout>
                <main className="flex-1 flex flex-col w-full pt-4 sm:pt-6 lg:pt-10 pb-20 md:pb-12 space-y-4 sm:space-y-8">

                    {/* Header */}
                    <div>
                        <h1 className="font-display text-[2rem] sm:text-[3rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight">
                            Leaderboard
                        </h1>
                        <p className="mt-1 text-[9px] sm:text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                            Global Rankings · Real-time
                        </p>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col gap-2 sm:gap-3 border-b border-white/[0.05] pb-3 sm:pb-4">

                        {/* Row 1: type tabs + domain filters + timeline (desktop) */}
                        <div className="flex items-center gap-x-2 sm:gap-x-4">

                            {/* Type tabs */}
                            <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg sm:rounded-xl p-0.5 sm:p-1 shrink-0">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-150",
                                            activeTab === tab.id
                                                ? "bg-white text-black shadow"
                                                : "text-white/30 hover:text-white/65"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Domain filters */}
                            {activeTab === "users" ? (
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
                                    {USER_MODES.map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setUserMode(mode.id)}
                                            className={cn(
                                                "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 border",
                                                userMode === mode.id
                                                    ? "border-white/20 bg-white/[0.07] text-white/85"
                                                    : "border-transparent text-white/22 hover:text-white/50"
                                            )}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
                                    {activeDomains.map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setActiveDomain(d)}
                                            className={cn(
                                                "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 border",
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

                            {/* Timeline — desktop only inline */}
                            <div className="hidden sm:flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 shrink-0">
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

                        {/* Row 2: Timeline — mobile only */}
                        <div className="flex sm:hidden items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-md p-0.5 self-end">
                            {TIMELINES.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setTimeline(t.key)}
                                    className={cn(
                                        "px-2 py-1 rounded-md text-[9px] font-bold transition-all",
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
                        userMode={userMode}
                    />

                </main>

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
