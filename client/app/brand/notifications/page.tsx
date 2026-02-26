"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Zap, DollarSign, AlertCircle, Loader2, Users, CheckCircle2 } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return `${Math.floor(d / 7)}w ago`;
}

function NotifIcon({ type }: { type: string }) {
    const base = "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0";
    if (type === "event") return (
        <div className={cn(base, "bg-yellow-500/10 border border-yellow-500/20")}>
            <Zap className="w-5 h-5 text-yellow-500 fill-yellow-400" />
        </div>
    );
    if (type === "reward") return (
        <div className={cn(base, "bg-green-500/10 border border-green-500/20")}>
            <DollarSign className="w-5 h-5 text-green-400" />
        </div>
    );
    if (type === "social") return (
        <div className={cn(base, "bg-primary/10 border border-primary/20")}>
            <Users className="w-5 h-5 text-primary" />
        </div>
    );
    if (type === "system") return (
        <div className={cn(base, "bg-foreground/5 border border-border/50")}>
            <AlertCircle className="w-5 h-5 text-foreground/40" />
        </div>
    );
    return (
        <div className={cn(base, "bg-primary/10 border border-primary/20")}>
            <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
    );
}

const FILTERS = [
    { label: "All", value: "all" },
    { label: "Campaigns", value: "event" },
    { label: "Rewards", value: "reward" },
    { label: "People", value: "social" },
    { label: "System", value: "system" },
] as const;

type FilterValue = typeof FILTERS[number]["value"];

export default function BrandNotificationsPage() {
    const [filter, setFilter] = useState<FilterValue>("all");
    const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    // Auto-mark all as read when the page opens
    useEffect(() => {
        if (unreadCount > 0 && !isLoading) {
            markAllAsRead();
        }
    }, [unreadCount, isLoading, markAllAsRead]);

    const filtered = notifications.filter(n => {
        if (filter === "all") return true;
        return n.type === filter;
    });

    return (
        <main className="flex-1 px-6 py-8 pb-32 md:pb-8 max-w-3xl w-full mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display uppercase tracking-tight leading-none">
                        Notifications
                    </h1>
                    <p className="text-sm text-foreground/40 mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-[11px] font-black text-primary hover:text-foreground transition-colors uppercase tracking-widest"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
                {FILTERS.map(({ label, value }) => (
                    <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={cn(
                            "px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                            filter === value
                                ? "bg-primary text-white shadow-sm shadow-primary/20"
                                : "bg-card border border-border/50 text-foreground/40 hover:text-foreground hover:border-border"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
            )}

            {/* List */}
            {!isLoading && (
                <AnimatePresence mode="popLayout">
                    {filtered.length > 0 ? (
                        <div className="space-y-2">
                            {filtered.map((n, i) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                                    onClick={() => !n.isRead && markAsRead(n.id)}
                                    className={cn(
                                        "flex gap-4 items-start p-4 rounded-2xl border transition-all cursor-pointer group",
                                        n.isRead
                                            ? "bg-card border-border/40 hover:border-border"
                                            : "bg-primary/5 border-primary/20 hover:border-primary/40"
                                    )}
                                >
                                    <NotifIcon type={n.type} />

                                    <div className="flex-1 min-w-0 py-0.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-black text-foreground leading-tight">
                                                {n.title}
                                            </p>
                                            {!n.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                        <p className="text-xs text-foreground/50 mt-1 leading-relaxed">
                                            {n.message}
                                        </p>
                                        <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-2">
                                            {formatRelativeTime(n.createdAt)}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-24 text-center space-y-3"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto">
                                <Bell className="w-8 h-8 text-foreground/20" />
                            </div>
                            <p className="text-sm font-bold text-foreground/40">No notifications</p>
                            <p className="text-xs text-foreground/25">
                                {filter === "all"
                                    ? "You're all caught up."
                                    : `No ${filter} notifications yet.`}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </main>
    );
}
