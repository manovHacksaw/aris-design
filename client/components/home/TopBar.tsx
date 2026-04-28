"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

export default function TopBar() {
    const { unreadCount } = useNotifications();

    return (
        <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-4 md:hidden">
            <Link href="/home" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-primary-foreground font-bold text-lg select-none">A</span>
                </div>
                <span className="text-foreground font-bold text-lg tracking-tight">Aris</span>
            </Link>

            <Link href="/notifications" className="relative w-10 h-10 flex items-center justify-center rounded-[14px] border border-border bg-secondary text-foreground/40 hover:bg-foreground hover:text-background transition-all shadow-md">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center tabular-nums leading-none border border-background shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </Link>
        </header>
    );
}
