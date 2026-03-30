"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Bell, Loader2, Flame, Trophy, Zap, Star,
    Vote, Megaphone, UserPlus, Image as ImageIcon,
    XCircle, RefreshCw, Gift, Sparkles,
} from "lucide-react";
import { useNotifications, Notification } from "@/context/NotificationContext";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return `${Math.floor(d / 7)}w ago`;
}

// Map notification type → icon config
const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    STREAK:             { icon: Flame,      bg: "bg-orange-500/20",  color: "text-orange-400" },
    WELCOME:            { icon: Sparkles,   bg: "bg-blue-500/20",    color: "text-blue-400" },
    EVENT_RESULT:       { icon: Trophy,     bg: "bg-yellow-500/20",  color: "text-yellow-400" },
    VOTING_LIVE:        { icon: Vote,       bg: "bg-purple-500/20",  color: "text-purple-400" },
    BRAND_POST:         { icon: Megaphone,  bg: "bg-primary/20",     color: "text-primary" },
    NEW_SUBSCRIBER:     { icon: UserPlus,   bg: "bg-green-500/20",   color: "text-green-400" },
    SUBMISSION_VOTE:    { icon: Star,       bg: "bg-pink-500/20",    color: "text-pink-400" },
    EVENT_PHASE_CHANGE: { icon: RefreshCw,  bg: "bg-cyan-500/20",    color: "text-cyan-400" },
    EVENT_SUBMISSION:   { icon: ImageIcon,  bg: "bg-indigo-500/20",  color: "text-indigo-400" },
    EVENT_VOTE:         { icon: Vote,       bg: "bg-purple-500/20",  color: "text-purple-400" },
    XP_MILESTONE:       { icon: Zap,        bg: "bg-lime-500/20",    color: "text-lime-400" },
    EVENT_CANCELLED:    { icon: XCircle,    bg: "bg-red-500/20",     color: "text-red-400" },
    REWARD:             { icon: Gift,       bg: "bg-primary/20",     color: "text-primary" },
};

function NotificationAvatar({ n }: { n: Notification }) {
    const meta = n.metadata ?? n.data;
    const brandLogoCid = n.brand?.logoCid;

    // 1. Brand logo for brand/event-related notifications
    if (brandLogoCid && ["EVENT_RESULT", "VOTING_LIVE", "BRAND_POST", "EVENT_PHASE_CHANGE",
        "EVENT_SUBMISSION", "EVENT_VOTE", "EVENT_CANCELLED", "SUBMISSION_VOTE"].includes(n.type)) {
        return (
            <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/[0.04]">
                <img
                    src={`${PINATA_GW}/${brandLogoCid}`}
                    alt={n.brand?.name ?? "Brand"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback to icon on image load failure
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                        (e.currentTarget.parentElement as HTMLElement).setAttribute("data-fallback", "1");
                    }}
                />
            </div>
        );
    }

    // 2. Event/submission image from metadata
    const imageUrl = meta?.eventImageUrl ?? meta?.userContentImageUrl ?? meta?.imageUrl;
    if (imageUrl && ["EVENT_RESULT", "SUBMISSION_VOTE", "VOTING_LIVE"].includes(n.type)) {
        return (
            <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/[0.04]">
                <img
                    src={imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
            </div>
        );
    }

    // 3. Type-specific icon
    const cfg = TYPE_CONFIG[n.type] ?? { icon: Bell, bg: "bg-white/[0.06]", color: "text-foreground/40" };
    const Icon = cfg.icon;
    return (
        <div className={cn("shrink-0 w-10 h-10 rounded-full flex items-center justify-center", cfg.bg)}>
            <Icon className={cn("w-4.5 h-4.5", cfg.color)} size={18} strokeWidth={2} />
        </div>
    );
}

// Map filter tabs → matching backend types
const FILTER_TYPES: Record<string, string[]> = {
    social:  ["NEW_SUBSCRIBER"],
    events:  ["EVENT_RESULT", "VOTING_LIVE", "BRAND_POST", "EVENT_PHASE_CHANGE",
              "EVENT_SUBMISSION", "EVENT_VOTE", "EVENT_CANCELLED", "SUBMISSION_VOTE"],
    rewards: ["REWARD", "XP_MILESTONE"],
    system:  ["STREAK", "WELCOME"],
};

const FILTERS = ["all", "social", "events", "rewards", "system"] as const;
type Filter = typeof FILTERS[number];

export default function NotificationsPage() {
    const [filter, setFilter] = useState<Filter>("all");
    const { notifications, isLoading, hasMore, loadMore, markAsRead, markAllAsRead, unreadCount } = useNotifications();
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (unreadCount > 0 && !isLoading) markAllAsRead();
    }, [unreadCount, isLoading, markAllAsRead]);

    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMore(); },
            { threshold: 0.1 }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    const filtered = notifications.filter(n => {
        if (filter === "all") return true;
        return FILTER_TYPES[filter]?.includes(n.type) ?? false;
    });

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="w-full pt-8 lg:pt-12 pb-24 md:pb-16 max-w-3xl">

                    {/* Header */}
                    <div className="mb-8 space-y-1">
                        <h1 className="font-display text-[3.5rem] sm:text-[5rem] md:text-[6rem] uppercase leading-none tracking-tight text-foreground">
                            Notifications
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-foreground/35">
                            Stay updated with your latest interactions
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-8 pb-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                    filter === f
                                        ? "bg-white text-black border-white"
                                        : "bg-transparent text-foreground/45 border-white/15 hover:border-white/30 hover:text-foreground/70"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Loading skeleton */}
                    {isLoading && (
                        <div className="space-y-[3px]">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.03]">
                                    <div className="w-10 h-10 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-2/5 rounded-md bg-white/[0.07] animate-pulse" />
                                        <div className="h-2.5 w-3/5 rounded-md bg-white/[0.04] animate-pulse" />
                                        <div className="h-2 w-16 rounded-md bg-white/[0.03] animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* List */}
                    {!isLoading && (
                        <div className="space-y-[3px]">
                            <AnimatePresence initial={false}>
                                {filtered.length > 0 ? filtered.map((n, i) => (
                                    <motion.div
                                        key={n.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: i * 0.03, duration: 0.2 }}
                                        onClick={() => !n.isRead && markAsRead(n.id)}
                                        className={cn(
                                            "flex items-center gap-4 px-5 py-4 rounded-xl transition-all cursor-pointer",
                                            n.isRead
                                                ? "bg-white/[0.03] hover:bg-white/[0.05]"
                                                : "bg-white/[0.06] hover:bg-white/[0.08]"
                                        )}
                                    >
                                        <NotificationAvatar n={n} />

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground leading-snug mb-0.5">
                                                {n.title}
                                            </p>
                                            <p className="text-[13px] text-foreground/55 font-normal leading-snug">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mt-1.5">
                                                {formatRelativeTime(n.createdAt)}
                                            </p>
                                        </div>

                                        {!n.isRead && (
                                            <div className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                                        )}
                                    </motion.div>
                                )) : (
                                    <div className="py-28 text-center">
                                        <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                                            <Bell className="w-5 h-5 text-foreground/20" />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground/30">
                                            No notifications yet
                                        </p>
                                        <p className="text-[10px] text-foreground/20 font-medium mt-1 uppercase tracking-wider">
                                            We'll notify you when something happens
                                        </p>
                                    </div>
                                )}
                            </AnimatePresence>

                            {hasMore && (
                                <div ref={sentinelRef} className="flex justify-center py-6">
                                    <Loader2 className="w-4 h-4 animate-spin text-foreground/20" />
                                </div>
                            )}
                        </div>
                    )}

                </main>

                <div className="md:hidden fixed bottom-1 left-0 right-0 z-50">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}
