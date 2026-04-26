"use client";

import Link from "next/link";
import { useSidebar } from "@/context/SidebarContext";
import { IoMenuOutline, IoNotificationsOutline } from "react-icons/io5";
import MobileSidebar from "@/components/MobileSidebar";

export default function MobileHeader() {
    const { toggleMobileSidebar } = useSidebar();

    return (
        <>
            <header className="md:hidden flex items-center justify-between px-6 py-3 bg-card dark:bg-card glass-nav border-b border-border sticky top-0 z-40">
                {/* Left: Hamburger + Logo */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleMobileSidebar}
                        className="p-1.5 rounded-lg hover:bg-secondary text-foreground/70 transition-colors"
                    >
                        <IoMenuOutline size={22} />
                    </button>
                    <Link href="/home" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="text-primary-foreground font-bold text-sm">A</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-foreground">Aris</span>
                    </Link>
                </div>

                {/* Right: Notifications */}
                <Link href="/notifications">
                    <button className="p-2 rounded-full hover:bg-secondary text-foreground/80 transition-colors relative">
                        <IoNotificationsOutline size={24} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background" />
                    </button>
                </Link>
            </header>
            <MobileSidebar />
        </>
    );
}
