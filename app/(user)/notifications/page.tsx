"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Heart, UserPlus, Zap, CheckCircle2, MessageSquare, Star, Bell } from "lucide-react";
import Link from "next/link";

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
    {
        id: 6,
        type: "comment",
        user: "Jessica Wu",
        avatar: "https://i.pravatar.cc/150?img=5",
        content: "commented: 'Love the colors on this one!'",
        target: "Neon City Vibes",
        time: "2d ago",
        read: true,
    },
    {
        id: 7,
        type: "award",
        title: "Top Creator",
        content: "You've been featured in the weekly top creators list!",
        time: "1w ago",
        read: true,
    }
];

export default function NotificationsPage() {
    const [filter, setFilter] = useState<"all" | "mentions" | "system">("all");

    // Filter logic
    const notifications = DUMMY_NOTIFICATIONS.filter(n => {
        if (filter === "all") return true;
        if (filter === "mentions") return n.type === "like" || n.type === "follow" || n.type === "comment";
        if (filter === "system") return n.type === "system" || n.type === "challenge" || n.type === "award";
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
                        {/* Mobile bell hidden on desktop */}
                        <div className="md:hidden">
                            <Bell className="w-6 h-6 text-primary" />
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        {["all", "mentions", "system"].map((f) => (
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

                    {/* Notifications List */}
                    <div className="space-y-4">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "bg-card border border-border rounded-[20px] p-4 flex gap-4 transition-all hover:border-primary/30 group relative",
                                        !notification.read && "bg-secondary/40 border-primary/20"
                                    )}
                                >
                                    {/* Icon / Avatar */}
                                    <div className="flex-shrink-0 mt-1">
                                        {notification.type === "like" ? (
                                            <div className="relative">
                                                <img src={notification.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                                                <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-card">
                                                    <Heart className="w-3 h-3 text-white fill-white" />
                                                </div>
                                            </div>
                                        ) : notification.type === "follow" ? (
                                            <div className="relative">
                                                <img src={notification.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                                                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 border-2 border-card">
                                                    <UserPlus className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        ) : notification.type === "comment" ? (
                                            <div className="relative">
                                                <img src={notification.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                                                <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-1 border-2 border-card">
                                                    <MessageSquare className="w-3 h-3 text-white fill-white" />
                                                </div>
                                            </div>
                                        ) : notification.type === "system" ? (
                                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                            </div>
                                        ) : notification.type === "challenge" ? (
                                            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                                <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                                                <Star className="w-6 h-6 text-accent" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 py-1">
                                        <div className="text-base text-foreground leading-relaxed">
                                            {notification.user && <span className="font-bold text-foreground mr-1.5">{notification.user}</span>}
                                            {notification.title && <span className="font-bold text-foreground block mb-1">{notification.title}</span>}
                                            <span className="text-foreground/60">{notification.content}</span>
                                            {notification.target && <span className="text-primary ml-1.5 font-black hover:underline cursor-pointer">{notification.target}</span>}
                                        </div>
                                        <div className="mt-2 text-[10px] text-foreground/40 font-bold uppercase tracking-widest flex items-center gap-2">
                                            <span>{notification.time}</span>
                                            {!notification.read && (
                                                <span className="w-2 h-2 bg-primary rounded-full inline-block" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-[#6B7280]">
                                <p className="text-lg">No notifications found</p>
                            </div>
                        )}
                    </div>
                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}
