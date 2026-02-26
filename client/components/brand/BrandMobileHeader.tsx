"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IoNotificationsOutline, IoPersonCircleOutline, IoEyeOutline } from "react-icons/io5";
import { useNotifications } from "@/context/NotificationContext";

export default function BrandMobileHeader() {
    const router = useRouter();
    const { unreadCount } = useNotifications();

    return (
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-3">
                <Link href="/brand/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-white font-black text-sm">B</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-black tracking-tight text-foreground leading-none">Brand Portal</span>
                        <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Aris</span>
                    </div>
                </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => router.push("/home?preview=brand")}
                    className="p-2 rounded-full hover:bg-secondary text-foreground/80 transition-colors"
                    title="View as User"
                >
                    <IoEyeOutline size={22} />
                </button>
                <Link
                    href="/brand/notifications"
                    className="p-2 rounded-full hover:bg-secondary text-foreground/80 transition-colors relative"
                >
                    <IoNotificationsOutline size={22} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-black px-0.5 border border-background">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Link>
                <Link href="/brand/settings">
                    <button className="p-2 rounded-full hover:bg-secondary text-foreground/80 transition-colors">
                        <IoPersonCircleOutline size={24} />
                    </button>
                </Link>
            </div>
        </header>
    );
}
