"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

export default function TopBar() {
    return (
        <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-4 md:hidden">
            <Link href="/home" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-white font-bold text-lg select-none">A</span>
                </div>
                <span className="text-foreground font-bold text-lg tracking-tight">Aris</span>
            </Link>

            <Link href="/notifications" className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-border bg-secondary text-foreground/40 hover:bg-foreground hover:text-background transition-all shadow-md">
                <Bell className="w-5 h-5" />
            </Link>
        </header>
    );
}
