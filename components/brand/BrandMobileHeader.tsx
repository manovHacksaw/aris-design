"use client";

import Link from "next/link";
import { IoNotificationsOutline, IoPersonCircleOutline } from "react-icons/io5";

export default function BrandMobileHeader() {
    return (
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-3">
                <Link href="/brand/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-white font-black text-sm">B</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-black tracking-tight text-foreground leading-none">Nike Inc.</span>
                        <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Brand Portal</span>
                    </div>
                </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
                <button className="p-2 rounded-full hover:bg-secondary text-foreground/80 transition-colors relative">
                    <IoNotificationsOutline size={22} />
                    <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-background" />
                </button>
                <Link href="/brand/settings">
                    <button className="p-2 rounded-full hover:bg-secondary text-foreground/80 transition-colors">
                        <IoPersonCircleOutline size={24} />
                    </button>
                </Link>
            </div>
        </header>
    );
}
