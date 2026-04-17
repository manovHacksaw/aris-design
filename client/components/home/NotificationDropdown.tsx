"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, UserPlus, Zap, CheckCircle2, Star } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";

function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function NotifIcon({ type }: { type: string }) {
    if (type === "social") return (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <UserPlus className="w-5 h-5 text-primary" />
        </div>
    );
    if (type === "event") return (
        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
            <Zap className="w-5 h-5 text-yellow-500" />
        </div>
    );
    if (type === "reward") return (
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/20">
            <Star className="w-5 h-5 text-accent" />
        </div>
    );
    return (
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
    );
}

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<"all" | "mentions">("all");
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    const filtered = activeTab === "all"
        ? notifications
        : notifications.filter(n => n.type === "social");

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-spotify overflow-hidden origin-top-right transition-colors"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10 transition-colors">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-primary text-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                                    activeTab === "all"
                                        ? "bg-foreground text-background shadow-md"
                                        : "text-foreground/40 hover:text-foreground hover:bg-secondary"
                                )}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveTab("mentions")}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                                    activeTab === "mentions"
                                        ? "bg-foreground text-background shadow-md"
                                        : "text-foreground/40 hover:text-foreground hover:bg-secondary"
                                )}
                            >
                                Mentions
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto scrollbar-hide py-2">
                        {filtered.length > 0 ? (
                            filtered.slice(0, 10).map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                                    className={cn(
                                        "px-4 py-3 flex gap-3 hover:bg-secondary/50 transition-colors cursor-pointer group relative",
                                        !notification.isRead && "bg-secondary/30"
                                    )}
                                >
                                    {/* Icon */}
                                    <div className="flex-shrink-0 mt-1">
                                        <NotifIcon type={notification.type} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-foreground">
                                            <span className="font-bold text-foreground block mb-0.5">{notification.title}</span>
                                            <span className="text-foreground/60">{notification.message}</span>
                                        </div>
                                        <div className="mt-1 text-[10px] text-foreground/40 font-bold uppercase tracking-widest">
                                            {formatRelativeTime(notification.createdAt)}
                                        </div>
                                    </div>

                                    {/* Unread Indicator */}
                                    {!notification.isRead && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-[#6B7280] text-sm">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                No notifications yet
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-border bg-card/50 backdrop-blur-sm">
                        <button
                            onClick={markAllAsRead}
                            className="w-full py-2 text-center text-[10px] font-bold text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all uppercase tracking-widest"
                        >
                            Mark all as read
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
