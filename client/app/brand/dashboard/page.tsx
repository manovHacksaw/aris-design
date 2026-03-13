"use client";

import { useEffect, useState } from "react";
import BrandDashboardCharts from "@/components/BrandDashboardCharts";
import { Plus, ArrowRight, ExternalLink, Users, Trophy, XCircle, ChevronRight, Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getBrandEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import { useNotifications } from "@/context/NotificationContext";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { calculateTotalPool } from "@/lib/eventUtils";

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
    posting: "bg-neon-lime text-black border-border",
    voting: "bg-lavender text-black border-border",
    scheduled: "bg-vibrant-blue text-black border-border",
    draft: "bg-vibrant-yellow text-black border-border",
    completed: "bg-secondary text-secondary-foreground border-border",
    cancelled: "bg-vibrant-pink text-white border-border",
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
    posting: "Active", voting: "Voting",
    scheduled: "Scheduled", draft: "Draft", completed: "Ended", cancelled: "Cancelled",
};

function formatPool(pool?: number): string {
    return pool ? `$${pool.toLocaleString()}` : "—";
}

function CampaignCard({ event }: { event: Event }) {
    const totalPool = calculateTotalPool(event);
    const submissions = event._count?.submissions ?? 0;
    const votes = event._count?.votes ?? 0;
    const coverUrl = event.imageUrl || (event.imageCid ? `https://gateway.pinata.cloud/ipfs/${event.imageCid}` : null);
    const isCancelled = event.status === "cancelled";

    return (
        <Link
            href={`/brand/events/${event.id}`}
            className={cn(
                "group block bg-card border-[1.5px] border-border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-card hover:-translate-y-1",
                isCancelled && "opacity-75 hover:opacity-100"
            )}
        >
            {/* Cover */}
            <div className="relative h-28 bg-secondary/40">
                {coverUrl ? (
                    <img src={coverUrl} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Layers className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className={cn(
                    "absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm",
                    CAMPAIGN_STATUS_STYLES[event.status] ?? CAMPAIGN_STATUS_STYLES.draft
                )}>
                    {CAMPAIGN_STATUS_LABELS[event.status] ?? event.status}
                </span>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                <div>
                    <h4 className="font-black text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {event.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                        {event.eventType === "post_and_vote" ? "Post & Vote" : "Vote Only"}
                    </p>
                </div>

                {isCancelled && event.cancelReason ? (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-400 leading-tight line-clamp-2">{event.cancelReason}</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                            <Users className="w-3 h-3" /> {submissions}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                            <Trophy className="w-3 h-3" /> {votes}
                        </span>
                        <span className="font-bold text-foreground">{formatPool(totalPool)}</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-3 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                    {new Date(event.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
        </Link>
    );
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
                <section className="lg:col-span-2 bg-card border-[1.5px] border-border rounded-xl overflow-hidden">
                    <div className="p-6 border-b-[1.5px] border-border flex justify-between items-center bg-secondary/10">
                        <h3 className="font-bold text-lg">Active Campaigns</h3>
                        <Link href="/brand/events" className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {loadingEvents ? (
                        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-52 bg-secondary/50 rounded-[20px]" />
                            ))}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">No campaigns yet.</div>
                    ) : (
                        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {events.map(event => <CampaignCard key={event.id} event={event} />)}
                        </div>
                    )}
                </section>

                {/* Notifications + Pro Tip */}
                <aside className="space-y-6">
                    <div className="bg-card border-[1.5px] border-border rounded-xl p-6">
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

                    <div className="bg-neon-lime border-[1.5px] border-border rounded-xl p-6 shadow-card">
                        <h3 className="font-black text-black mb-2 uppercase tracking-tight">Pro Tip</h3>
                        <p className="text-sm text-black/80 mb-4 font-bold leading-snug">
                            Campaigns with video requirements get 40% higher engagement on average.
                        </p>
                        <Link href="#" className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-white rounded-full text-xs font-black hover:opacity-80 transition-opacity uppercase tracking-wide">
                            Case Study <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
