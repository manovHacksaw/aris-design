"use client";

import { useEffect, useState } from "react";
import BrandDashboardCharts from "@/components/BrandDashboardCharts";
import { Plus, ArrowRight, ExternalLink, Bell, ArrowUpRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getBrandEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import { useNotifications } from "@/context/NotificationContext";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { calculateTotalPool } from "@/lib/eventUtils";

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
    posting:   "bg-[#00C853] text-white border-foreground",
    voting:    "bg-primary text-primary-foreground border-foreground",
    scheduled: "bg-foreground text-background border-foreground",
    draft:     "bg-secondary text-foreground border-foreground",
    completed: "bg-secondary text-muted-foreground border-foreground",
    cancelled: "bg-red-500 text-white border-foreground",
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
    posting: "Active", voting: "Voting",
    scheduled: "Scheduled", draft: "Draft", completed: "Ended", cancelled: "Cancelled",
};

function formatPool(pool?: number): string {
    return pool ? `$${pool.toLocaleString()}` : "—";
}

function engagementPercent(event: Event): number {
    const submissions = event._count?.submissions ?? 0;
    if (!submissions) return 0;
    return Math.min(100, Math.round((submissions / 100) * 100));
}

function CampaignRow({ event }: { event: Event }) {
    const totalPool = calculateTotalPool(event);
    const engagement = engagementPercent(event);
    const eventTypeLabel = event.eventType === "post_and_vote" ? "Post & Vote" : "Vote";

    return (
        <Link
            href={`/brand/events/${event.id}`}
            className="grid grid-cols-[2fr_1fr_1fr_1.5fr] items-center px-6 py-5 border-b-[3px] border-foreground last:border-0 hover:bg-secondary transition-colors group"
        >
            {/* Campaign name + type */}
            <div>
                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug uppercase tracking-wide">
                    {event.title}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{eventTypeLabel}</p>
            </div>

            {/* Status badge */}
            <div>
                <span className={cn(
                    "inline-flex px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border-2",
                    CAMPAIGN_STATUS_STYLES[event.status] ?? CAMPAIGN_STATUS_STYLES.draft
                )}>
                    {CAMPAIGN_STATUS_LABELS[event.status] ?? event.status}
                </span>
            </div>

            {/* Pool */}
            <div className="font-display text-2xl text-foreground tracking-tighter">
                {formatPool(totalPool)}
            </div>

            {/* Engagement with progress bar */}
            <div className="flex items-center gap-3 pr-2">
                <span className="font-bold text-sm text-foreground w-10 shrink-0 uppercase">{engagement}%</span>
                <div className="flex-1 h-2.5 bg-secondary border border-foreground rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${engagement}%` }}
                    />
                </div>
            </div>
        </Link>
    );
}

export default function BrandDashboard() {
    const { user } = useUser();
    const { onboardingData } = useAuth();
    const brandName = user?.ownedBrands?.[0]?.name ?? onboardingData?.brandName ?? "Your Brand";

    const [events, setEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const { notifications, isLoading: loadingNotifs } = useNotifications();

    useEffect(() => {
        getBrandEvents()
            .then((evts) => { setEvents(evts.slice(0, 5)); setLoadingEvents(false); })
            .catch(() => setLoadingEvents(false));
    }, []);

    return (
        <div className="space-y-10 pb-32 md:pb-12 font-sans selection:bg-primary/30">

            {/* Header */}
            <header className="border-b-4 border-foreground pb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-6xl md:text-8xl font-display text-foreground uppercase tracking-tighter leading-none mb-4">
                            <span className="text-primary">Overview</span>
                        </h1>
                        <p className="text-xl font-bold uppercase tracking-widest border-l-4 border-primary pl-4">
                            Welcome back, {brandName}
                        </p>
                    </div>
                    <Link
                        href="/brand/create-event"
                        className="flex items-center gap-2 px-6 py-3 bg-foreground text-background font-black rounded-xl border-[3px] border-foreground hover:-translate-y-1 hover:translate-x-1 transition-transform shadow-[4px_4px_0px_hsl(var(--foreground)/0.3)] whitespace-nowrap self-start md:self-end uppercase tracking-widest text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Campaign
                    </Link>
                </div>
            </header>

            {/* Analytics section (KPI cards + charts) */}
            <BrandDashboardCharts />

            {/* Campaigns table + right sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Active Campaigns — table layout */}
                <section className="lg:col-span-2 bg-card border-[3px] border-foreground rounded-2xl overflow-hidden shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]">

                    {/* Section header */}
                    <div className="flex justify-between items-center px-6 py-5 border-b-[3px] border-foreground bg-primary text-primary-foreground">
                        <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Active Campaigns
                        </h3>
                        <Link href="/brand/events" className="text-xs font-black hover:opacity-70 flex items-center gap-1 uppercase tracking-widest transition-opacity">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr] px-6 py-4 border-b-[3px] border-foreground bg-secondary">
                        {["Campaign", "Status", "Pool", "Engagement"].map((col) => (
                            <span key={col} className="text-[10px] font-black uppercase tracking-widest text-foreground">
                                {col}
                            </span>
                        ))}
                    </div>

                    {/* Rows */}
                    {loadingEvents ? (
                        <div className="p-6 space-y-3 animate-pulse">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-14 bg-secondary/40 rounded-xl border-[3px] border-foreground/20" />
                            ))}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">No campaigns yet.</div>
                    ) : (
                        <div>
                            {events.map(event => <CampaignRow key={event.id} event={event} />)}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="p-5 bg-foreground text-background border-t-[3px] border-foreground flex justify-center hover:bg-primary transition-colors cursor-pointer group">
                        <Link href="/brand/events" className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                            View All Campaigns <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Link>
                    </div>
                </section>

                {/* Right sidebar */}
                <aside className="space-y-6">

                    {/* Needs Attention */}
                    <div className="bg-card border-[3px] border-foreground rounded-2xl p-6 shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]">
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2 uppercase tracking-widest">
                            <Bell className="w-5 h-5" />
                            Needs Attention
                        </h3>
                        {loadingNotifs ? (
                            <div className="space-y-3 animate-pulse">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-14 bg-secondary/50 rounded-xl border-[3px] border-foreground/20" />
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="bg-secondary border-[3px] border-foreground rounded-xl p-4 text-center">
                                <p className="text-sm font-black uppercase tracking-widest text-foreground">All clear!</p>
                            </div>
                        ) : (
                            <div className="divide-y-[3px] divide-foreground">
                                {notifications.slice(0, 5).map((item) => (
                                    <div key={item.id} className="flex gap-3 items-start py-3 first:pt-0 last:pb-0">
                                        <div className={cn(
                                            "w-3 h-3 rounded-full mt-1.5 shrink-0 border-2 border-foreground",
                                            item.type === "reward"  ? "bg-[#00C853]" :
                                            item.type === "event"   ? "bg-primary"   : "bg-red-500"
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black leading-snug text-foreground uppercase tracking-wide">{item.title}</p>
                                            <p className="text-xs font-medium text-muted-foreground mt-0.5 line-clamp-1">{item.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pro Tip */}
                    <div className="bg-primary border-[3px] border-foreground rounded-2xl p-6 shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]">
                        <h3 className="font-black text-primary-foreground mb-2 uppercase tracking-widest text-lg">Pro Tip</h3>
                        <p className="text-sm text-primary-foreground/80 mb-4 leading-relaxed font-medium">
                            Campaigns with video requirements get 40% higher engagement on average.
                        </p>
                        <Link href="#" className="text-xs font-black text-primary-foreground flex items-center gap-1 hover:opacity-70 uppercase tracking-widest transition-opacity">
                            Read Case Study <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
