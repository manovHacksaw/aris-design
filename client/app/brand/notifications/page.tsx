"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Zap, DollarSign, AlertCircle, Loader2, Users, CheckCircle2, Check, CheckSquare } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return `${Math.floor(d / 7)}w ago`;
}

function NotifIcon({ type }: { type: string }) {
    const base = "w-16 h-16 rounded-[16px] flex items-center justify-center shrink-0 border";
    if (type === "event") return (
        <div className={cn(base, "bg-yellow-500/10 border-yellow-500/20")}>
            <Zap className="w-6 h-6 text-yellow-500 fill-yellow-400" />
        </div>
    );
    if (type === "reward") return (
        <div className={cn(base, "bg-green-500/10 border-green-500/20")}>
            <DollarSign className="w-6 h-6 text-green-400" />
        </div>
    );
    if (type === "social") return (
        <div className={cn(base, "bg-primary/10 border-primary/20")}>
            <Users className="w-6 h-6 text-primary" />
        </div>
    );
    if (type === "system") return (
        <div className={cn(base, "bg-foreground/5 border-border/50")}>
            <AlertCircle className="w-6 h-6 text-foreground/40" />
        </div>
    );
    return (
        <div className={cn(base, "bg-primary/10 border-primary/20")}>
            <CheckCircle2 className="w-6 h-6 text-primary" />
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

    // Removed auto-mark all as read visually to preserve the unread states until clicked
    // as per typical notification behaviors aligned with card structures.

    const filtered = notifications.filter(n => {
        if (filter === "all") return true;
        return n.type === filter;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="font-display text-4xl text-white uppercase tracking-tight">Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-black px-2.5 py-1 rounded-full border border-primary/20">
                                {unreadCount} New
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Manage your brand updates, rewards, and insights.</p>
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground text-sm font-bold rounded-full hover:bg-secondary/80 border border-border transition-colors whitespace-nowrap"
                        >
                            <CheckSquare className="w-4 h-4" />
                            <span className="hidden md:inline">Mark all as read</span>
                            <span className="md:hidden">Read all</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Filter tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {FILTERS.map(({ label, value }) => {
                    const count = value === "all" 
                        ? notifications.length 
                        : notifications.filter(n => n.type === value).length;
                        
                    return (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                filter === value
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                            )}
                        >
                            {label}
                            {count > 0 && (
                                <span className={cn(
                                    "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                    filter === value ? "bg-white/20" : "bg-secondary"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {filtered.length > 0 ? (
                            filtered.map((n, i) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: Math.min(i * 0.03, 0.15) }}
                                >
                                    <div
                                        onClick={() => !n.isRead && markAsRead(n.id)}
                                        className={cn(
                                            "group bg-card border rounded-[24px] p-4 md:p-6 transition-all duration-300 shadow-sm flex flex-col md:flex-row gap-4 md:items-center relative",
                                            n.isRead 
                                                ? "border-border hover:shadow-md cursor-default" 
                                                : "border-primary/30 bg-primary/5 hover:border-primary/50 cursor-pointer shadow-primary/5"
                                        )}
                                    >
                                        {/* Unread dot indicator on Mobile (top right absolute) or Desktop (integrated) */}
                                        {!n.isRead && (
                                            <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] md:hidden" />
                                        )}

                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <NotifIcon type={n.type} />
                                            
                                            <div className="min-w-0 flex-1 pr-6 md:pr-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                                        n.type === "event" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                                                        n.type === "reward" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                        n.type === "social" ? "bg-primary/10 text-primary border-primary/20" :
                                                        "bg-foreground/5 text-muted-foreground border-border/50"
                                                    )}>
                                                        {n.type === "event" ? "Campaign" : n.type}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                        {formatRelativeTime(n.createdAt)}
                                                    </span>
                                                </div>
                                                
                                                <h3 className={cn(
                                                    "text-base md:text-lg font-black tracking-tight truncate transition-colors",
                                                    !n.isRead ? "text-foreground" : "text-foreground/80"
                                                )}>
                                                    {n.title}
                                                </h3>
                                                <p className={cn(
                                                    "text-sm mt-1 line-clamp-2 md:line-clamp-1",
                                                    !n.isRead ? "text-muted-foreground font-medium" : "text-muted-foreground/70"
                                                )}>
                                                    {n.message}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Actions / Status Right Side */}
                                        <div className="flex items-center justify-end gap-3 mt-2 md:mt-0 md:pl-4 md:border-l md:border-border/50 shrink-0">
                                            {!n.isRead ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                                    className="w-full md:w-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest transition-all hover:opacity-90 flex items-center justify-center gap-2"
                                                >
                                                    <Check className="w-4 h-4" /> Mark Read
                                                </button>
                                            ) : (
                                                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted-foreground">
                                                    <CheckCircle2 className="w-4 h-4" /> Read
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-card border border-border rounded-[24px] p-12 text-center"
                            >
                                <div className="w-16 h-16 rounded-[16px] bg-secondary/60 flex items-center justify-center mx-auto mb-4 border border-border/50">
                                    <Bell className="w-8 h-8 text-muted-foreground/40" />
                                </div>
                                <p className="font-bold text-foreground mb-1 text-lg">
                                    {filter === "all" ? "No notifications yet." : `No ${filter} updates.`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    You're all caught up on your brand's activity!
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
