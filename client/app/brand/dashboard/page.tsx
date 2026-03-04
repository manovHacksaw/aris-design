"use client";

import { useEffect, useState } from "react";
import BrandDashboardCharts from "@/components/BrandDashboardCharts";
import { Plus, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getBrandEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import { useNotifications } from "@/context/NotificationContext";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { calculateTotalPool } from "@/lib/eventUtils";

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
    posting: "bg-green-500/10 text-green-500 border-green-500/20",
    voting: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    completed: "bg-muted text-muted-foreground border-border",
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
    posting: "Active", voting: "Voting",
    scheduled: "Scheduled", draft: "Draft", completed: "Ended",
};

function engagementPercent(event: Event): number {
    const submissions = event._count?.submissions ?? 0;
    if (!submissions) return 0;
    return Math.min(100, Math.round((submissions / 100) * 100));
}

function formatPool(pool?: number): string {
    return pool ? `$${pool.toLocaleString()}` : "—";
}

export default function BrandDashboard() {
    const { user } = useUser();
    const { onboardingData } = useAuth();
    // Prefer backend brand name → localStorage brand name → fallback
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
        <div className="space-y-8 pb-32 md:pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Overview</h1>
                    <p className="text-muted-foreground">Welcome back, {brandName}</p>
                </div>
                <Link
                    href="/brand/create-event"
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap self-start md:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">Create Campaign</span>
                    <span className="md:hidden">New</span>
                </Link>
            </header>

            {/* Detailed Analytics */}
            <BrandDashboardCharts />

            {/* Campaigns + Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Campaigns */}
                <section className="lg:col-span-2 bg-card border border-border rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h3 className="font-bold text-lg">Active Campaigns</h3>
                        <Link href="/brand/events" className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {loadingEvents ? (
                        <div className="p-6 space-y-3 animate-pulse">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-12 bg-secondary/50 rounded-lg" />
                            ))}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">No campaigns yet.</div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-secondary/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Campaign</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Pool</th>
                                            <th className="px-6 py-4 text-right">Engagement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {events.map((event) => {
                                            const pct = engagementPercent(event);
                                            return (
                                                <tr key={event.id} className="hover:bg-secondary/30 transition-colors cursor-pointer">
                                                    <td className="px-6 py-4 font-bold text-foreground">
                                                        {event.title}
                                                        <div className="text-xs text-muted-foreground font-medium mt-0.5 capitalize">{event.eventType}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                                            CAMPAIGN_STATUS_STYLES[event.status] ?? CAMPAIGN_STATUS_STYLES.ended
                                                        )}>
                                                            {CAMPAIGN_STATUS_LABELS[event.status] ?? event.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-muted-foreground font-bold">{formatPool(calculateTotalPool(event))}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className="text-xs font-bold">{pct}%</span>
                                                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="md:hidden divide-y divide-border">
                                {events.map((event) => {
                                    const pct = engagementPercent(event);
                                    return (
                                        <div key={event.id} className="p-4 flex items-center justify-between active:bg-secondary/50 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn(
                                                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                                                        CAMPAIGN_STATUS_STYLES[event.status] ?? CAMPAIGN_STATUS_STYLES.ended
                                                    )}>
                                                        {CAMPAIGN_STATUS_LABELS[event.status] ?? event.status}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-sm text-foreground mb-1">{event.title}</h4>
                                                <p className="text-xs text-muted-foreground capitalize">{event.eventType} • {formatPool(calculateTotalPool(event))}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="w-12 h-12 rounded-full border-4 border-secondary flex items-center justify-center relative">
                                                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent border-l-transparent rotate-45" style={{ opacity: pct / 100 }} />
                                                    <span className="text-[10px] font-bold">{pct}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>

                {/* Notifications + Pro Tip */}
                <aside className="space-y-6">
                    <div className="bg-card border border-border rounded-[24px] p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4">Needs Attention</h3>
                        {loadingNotifs ? (
                            <div className="space-y-3 animate-pulse">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-12 bg-secondary/50 rounded-xl" />
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">All clear!</p>
                        ) : (
                            <div className="space-y-3">
                                {notifications.slice(0, 5).map((item) => (
                                    <div key={item.id} className="flex gap-3 items-start p-3 rounded-xl bg-secondary/30 border border-border/50">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                            item.type === "reward" ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" :
                                                item.type === "event" ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" :
                                                    "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                                        )} />
                                        <div>
                                            <p className="text-sm font-bold leading-tight">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">{item.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-[24px] p-6">
                        <h3 className="font-bold text-primary mb-2">Pro Tip</h3>
                        <p className="text-sm text-muted-foreground mb-4 font-medium">
                            Campaigns with video requirements get 40% higher engagement on average.
                        </p>
                        <Link href="#" className="text-xs font-black text-primary flex items-center gap-1 hover:underline uppercase tracking-wide">
                            Read Case Study <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
