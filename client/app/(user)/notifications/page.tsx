"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Heart, UserPlus, Zap, CheckCircle2, MessageSquare, Star, Bell, Loader2 } from "lucide-react";
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

function NotificationIcon({ type }: { type: string }) {
    if (type === "social") return (
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <UserPlus className="w-6 h-6 text-primary" />
        </div>
    );
    if (type === "event") return (
        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
            <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
        </div>
    );
    if (type === "reward") return (
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
            <Star className="w-6 h-6 text-accent" />
        </div>
    );
    // system or unknown
    return (
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
        </div>
    );
}

export default function NotificationsPage() {
    const [filter, setFilter] = useState<"all" | "social" | "events" | "rewards" | "system">("all");
    const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

    useEffect(() => {
        if (unreadCount > 0 && !isLoading) {
            markAllAsRead();
        }
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
                <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto pb-24 md:pb-8">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground mb-2">Notifications</h1>
                            <p className="text-foreground/60">Stay updated with your latest interactions.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs font-bold text-primary hover:text-foreground transition-colors uppercase tracking-widest"
                                >
                                    Mark all read
                                </button>
                            )}
                            <div className="md:hidden">
                                <Bell className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        {["all", "social", "events", "rewards", "system"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-sm font-bold transition-all capitalize",
                                    filter === f
                                        ? "bg-foreground text-background shadow-lg"
                                        : "bg-secondary text-foreground/40 hover:text-foreground hover:bg-secondary/80"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Notifications List */}
                    {!isLoading && (
                        <div className="space-y-4">
                            {filtered.length > 0 ? (
                                filtered.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                                        className={cn(
                                            "bg-card border border-border rounded-[20px] p-4 flex gap-4 transition-all hover:border-primary/30 group relative cursor-pointer",
                                            !notification.isRead && "bg-secondary/40 border-primary/20"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className="flex-shrink-0 mt-1">
                                            <NotificationIcon type={notification.type} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 py-1">
                                            <div className="text-base text-foreground leading-relaxed">
                                                <span className="font-bold text-foreground block mb-1">{notification.title}</span>
                                                <span className="text-foreground/60">{notification.message}</span>
                                            </div>
                                            <div className="mt-2 text-[10px] text-foreground/40 font-bold uppercase tracking-widest flex items-center gap-2">
                                                <span>{formatRelativeTime(notification.createdAt)}</span>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 bg-primary rounded-full inline-block" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center text-[#6B7280]">
                                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-lg">No notifications yet</p>
                                    <p className="text-sm mt-2 opacity-60">We'll notify you when something happens.</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}
