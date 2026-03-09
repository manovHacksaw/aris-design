"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Zap, DollarSign, AlertCircle, Users, CheckCircle2, Loader2 } from "lucide-react";
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

const TYPE_META: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    event:  { icon: Zap,          bg: "bg-primary",    color: "text-primary-foreground" },
    reward: { icon: DollarSign,   bg: "bg-[#00C853]",  color: "text-white" },
    social: { icon: Users,        bg: "bg-foreground", color: "text-background" },
    system: { icon: AlertCircle,  bg: "bg-secondary",  color: "text-foreground" },
};

const FILTERS = [
    { label: "All",       value: "all" },
    { label: "Campaigns", value: "event" },
    { label: "Rewards",   value: "reward" },
    { label: "People",    value: "social" },
    { label: "System",    value: "system" },
] as const;

type FilterValue = typeof FILTERS[number]["value"];

export default function BrandNotificationsPage() {
    const [filter, setFilter] = useState<FilterValue>("all");
    const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    useEffect(() => {
        if (unreadCount > 0 && !isLoading) markAllAsRead();
    }, [unreadCount, isLoading, markAllAsRead]);

    const filtered = notifications.filter(n =>
        filter === "all" ? true : n.type === filter
    );

    return (
        <div className="space-y-8 pb-32 md:pb-12 font-sans selection:bg-primary/30">

            {/* Header — matches events page exactly */}
            <header className="border-b-4 border-foreground pb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-6xl md:text-8xl font-display text-foreground uppercase tracking-tighter leading-none mb-4">
                            <span className="text-primary">Notifications</span>
                        </h1>
                        <p className="text-xl font-bold uppercase tracking-widest border-l-4 border-primary pl-4">
                            {unreadCount > 0 ? `${unreadCount} unread messages` : "All caught up"}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-6 py-3 bg-foreground text-background font-black rounded-xl border-[3px] border-foreground hover:-translate-y-1 hover:translate-x-1 transition-transform shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3] whitespace-nowrap self-start md:self-end uppercase tracking-widest text-sm"
                        >
                            Mark All Read
                        </button>
                    )}
                </div>
            </header>

            {/* Filter tabs — identical to events page */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {FILTERS.map(({ label, value }) => {
                    const isActive = filter === value;
                    return (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border-[3px] uppercase tracking-widest",
                                isActive
                                    ? "bg-primary text-primary-foreground border-foreground shadow-[3px_3px_0px_#1A1A1A] dark:shadow-[3px_3px_0px_#FDF6E3] -translate-y-0.5 translate-x-0.5"
                                    : "bg-card text-foreground border-foreground hover:bg-secondary shadow-[2px_2px_0px_#1A1A1A] dark:shadow-[2px_2px_0px_#FDF6E3]"
                            )}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-card border-[3px] border-foreground/20 rounded-2xl p-5 flex gap-4 items-center animate-pulse">
                            <div className="w-14 h-14 rounded-xl bg-secondary shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="h-3 w-24 bg-secondary rounded" />
                                <div className="h-5 w-64 bg-secondary rounded" />
                                <div className="h-3 w-16 bg-secondary rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Notification list */}
            {!isLoading && (
                <AnimatePresence mode="popLayout">
                    {filtered.length > 0 ? (
                        <div className="space-y-4">
                            {filtered.map((n, i) => {
                                const meta = TYPE_META[n.type] ?? TYPE_META.system;
                                const Icon = meta.icon;
                                return (
                                    <motion.div
                                        key={n.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ delay: Math.min(i * 0.04, 0.2) }}
                                        onClick={() => !n.isRead && markAsRead(n.id)}
                                        className="group bg-card border-[3px] border-foreground rounded-2xl overflow-hidden flex hover:-translate-y-1 hover:translate-x-1 transition-transform shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3] cursor-pointer"
                                    >
                                        {/* Left colour strip — icon */}
                                        <div className={cn(
                                            "w-16 shrink-0 flex items-center justify-center border-r-[3px] border-foreground",
                                            meta.bg
                                        )}>
                                            <Icon className={cn("w-6 h-6", meta.color)} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 flex items-center gap-4 p-5 min-w-0">
                                            <div className="flex-1 min-w-0">
                                                {/* Type + time */}
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <span className="text-[10px] font-black uppercase tracking-widest border-2 border-foreground/20 px-2 py-0.5 rounded">
                                                        {n.type}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                        {formatRelativeTime(n.createdAt)}
                                                    </span>
                                                </div>
                                                <h3 className="text-base font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors truncate">
                                                    {n.title}
                                                </h3>
                                                <p className="text-xs font-medium text-muted-foreground mt-1 line-clamp-1">
                                                    {n.message}
                                                </p>
                                            </div>

                                            {/* Unread dot */}
                                            {!n.isRead && (
                                                <div className="shrink-0 border-l-[3px] border-foreground pl-4">
                                                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-card border-[3px] border-foreground rounded-2xl p-16 text-center shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]"
                        >
                            <div className="w-20 h-20 bg-secondary border-[3px] border-foreground rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3]">
                                <Bell className="w-10 h-10 text-foreground" />
                            </div>
                            <h3 className="font-display text-2xl uppercase tracking-tighter text-foreground mb-2">
                                All Clear!
                            </h3>
                            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                                {filter === "all" ? "You're all caught up." : `No ${filter} notifications yet.`}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}
