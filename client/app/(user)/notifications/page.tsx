"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Heart, UserPlus, Zap, CheckCircle2, Star, Bell, Loader2 } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

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

const ICON_MAP: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
    social: { icon: UserPlus, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    event: { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
    reward: { icon: Star, color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/20" },
    system: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
};

function NotificationIcon({ type }: { type: string }) {
    const cfg = ICON_MAP[type] ?? ICON_MAP.system;
    const Icon = cfg.icon;
    return (
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", cfg.bg, cfg.border)}>
            <Icon className={cn("w-4.5 h-4.5", cfg.color)} size={18} />
        </div>
    );
}

const FILTERS = ["all", "social", "events", "rewards", "system"] as const;
type Filter = typeof FILTERS[number];

export default function NotificationsPage() {
    const [filter, setFilter] = useState<Filter>("all");
    const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

    useEffect(() => {
        if (unreadCount > 0 && !isLoading) markAllAsRead();
    }, [unreadCount, isLoading, markAllAsRead]);

    const filtered = notifications.filter(n => {
        if (filter === "all") return true;
        if (filter === "social") return n.type === "social";
        if (filter === "events") return n.type === "event";
        if (filter === "rewards") return n.type === "reward";
        if (filter === "system") return n.type === "system";
        return true;
    });

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="w-full pt-6 lg:pt-10 pb-20 md:pb-12 space-y-8">

                    {/* ── Header ──────────────────────────── */}
                    <div className="flex items-end justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight">
                                Notifications
                            </h1>
                            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">
                                Stay updated with your latest interactions
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="shrink-0 text-[9px] font-black text-primary/70 hover:text-primary uppercase tracking-widest transition-colors pb-1"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* ── Filter Tabs ─────────────────────── */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-white/[0.05] pt-6">
                        {FILTERS.map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                    filter === f
                                        ? "bg-white text-black border-white"
                                        : "bg-white/[0.04] text-foreground/40 border-white/[0.06] hover:bg-white/[0.08] hover:text-foreground/80"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* ── Loading ──────────────────────────── */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-foreground/20" />
                        </div>
                    )}

                    {/* ── List ────────────────────────────── */}
                    {!isLoading && (
                        <div className="space-y-2">
                            {filtered.length > 0 ? filtered.map((n, i) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    onClick={() => !n.isRead && markAsRead(n.id)}
                                    className={cn(
                                        "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                                        n.isRead
                                            ? "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]"
                                            : "bg-white/[0.05] border-primary/20 hover:border-primary/40"
                                    )}
                                >
                                    {/* Icon */}
                                    <div className="mt-0.5">
                                        <NotificationIcon type={n.type} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-foreground tracking-tight leading-snug mb-0.5">
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-foreground/60 font-medium leading-relaxed">
                                            {n.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                                                {formatRelativeTime(n.createdAt)}
                                            </span>
                                            {!n.isRead && (
                                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="py-24 text-center bg-white/[0.02] rounded-[24px] border border-dashed border-white/[0.07]">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                                        <Bell className="w-5 h-5 text-foreground/20" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
                                        No notifications yet
                                    </p>
                                    <p className="text-[10px] text-foreground/25 font-medium mt-1 uppercase tracking-wider">
                                        We'll notify you when something happens
                                    </p>
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
