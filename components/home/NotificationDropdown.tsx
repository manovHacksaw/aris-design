"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, Heart, UserPlus, Zap, CheckCircle2, ChevronRight, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

// Dummy Notification Data
const DUMMY_NOTIFICATIONS = [
    {
        id: 1,
        type: "like",
        user: "Sarah Jenkins",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
        content: "liked your submission in",
        target: "Cyberpunk 2077 Challenge",
        time: "2m ago",
        read: false,
    },
    {
        id: 2,
        type: "follow",
        user: "Alex Rivera",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
        content: "started following you",
        time: "1h ago",
        read: false,
    },
    {
        id: 3,
        type: "system",
        title: "Wallet Connected",
        content: "Your Phantom wallet was successfully linked.",
        time: "3h ago",
        read: true,
    },
    {
        id: 4,
        type: "challenge",
        title: "New Challenge",
        content: "Nike Air Max Design Contest is now live!",
        time: "5h ago",
        read: true,
    },
    {
        id: 5,
        type: "like",
        user: "Mike Chen",
        avatar: "https://i.pravatar.cc/150?u=a04258114e29026302d",
        content: "liked your comment",
        time: "1d ago",
        read: true,
    },
];

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<"all" | "mentions">("all");

    // Close on click outside
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

    // Filter notifications
    const notifications = activeTab === "all"
        ? DUMMY_NOTIFICATIONS
        : DUMMY_NOTIFICATIONS.filter(n => n.type === "follow" || n.type === "like");

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
                        <h3 className="font-bold text-foreground">Notifications</h3>
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
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "px-4 py-3 flex gap-3 hover:bg-secondary/50 transition-colors cursor-pointer group relative",
                                        !notification.read && "bg-secondary/30"
                                    )}
                                >
                                    {/* Icon / Avatar */}
                                    <div className="flex-shrink-0 mt-1">
                                        {notification.type === "like" ? (
                                            <div className="relative">
                                                <img src={notification.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                                                <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-card">
                                                    <Heart className="w-2.5 h-2.5 text-white fill-white" />
                                                </div>
                                            </div>
                                        ) : notification.type === "follow" ? (
                                            <div className="relative">
                                                <img src={notification.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                                                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-card">
                                                    <UserPlus className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            </div>
                                        ) : notification.type === "system" ? (
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/20">
                                                <Zap className="w-5 h-5 text-accent" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-foreground">
                                            {notification.user && <span className="font-bold text-foreground mr-1">{notification.user}</span>}
                                            {notification.title && <span className="font-bold text-foreground block mb-0.5">{notification.title}</span>}
                                            <span className="text-foreground/60">{notification.content}</span>
                                            {notification.target && <span className="text-primary ml-1 font-bold hover:underline">{notification.target}</span>}
                                        </div>
                                        <div className="mt-1 text-[10px] text-foreground/40 font-bold uppercase tracking-widest">
                                            {notification.time}
                                        </div>
                                    </div>

                                    {/* Unread Indicator */}
                                    {!notification.read && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-[#6B7280] text-sm">
                                No new notifications
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-border bg-card/50 backdrop-blur-sm">
                        <button className="w-full py-2 text-center text-[10px] font-bold text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all uppercase tracking-widest">
                            Mark all as read
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
