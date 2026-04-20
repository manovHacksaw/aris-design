"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { IoNotificationsOutline, IoEyeOutline, IoMenuOutline, IoCloseOutline, IoMegaphoneOutline, IoSettingsOutline, IoLogOutOutline, IoSunnyOutline, IoMoonOutline, IoHelpCircleOutline } from "react-icons/io5";
import { useNotifications } from "@/context/NotificationContext";
import { useWallet } from "@/context/WalletContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const drawerNavItems = [
    { label: "Campaigns",     href: "/brand/events",         icon: IoMegaphoneOutline },
    { label: "Notifications", href: "/brand/notifications",  icon: IoNotificationsOutline },
    { label: "Settings",      href: "/brand/settings",       icon: IoSettingsOutline },
    { label: "Help",          href: "/brand/help",           icon: IoHelpCircleOutline },
];

export default function BrandMobileHeader() {
    const router = useRouter();
    const { unreadCount } = useNotifications();
    const { disconnect } = useWallet();
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    const handleSignOut = async () => {
        setOpen(false);
        await disconnect();
        router.push("/register-brand");
    };

    return (
        <>
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
                {/* Left: Hamburger + Brand Logo */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setOpen(true)}
                        className="p-1.5 rounded-xl hover:bg-secondary text-foreground/70 transition-colors"
                        aria-label="Open menu"
                    >
                        <IoMenuOutline size={22} />
                    </button>

                    <Link href="/brand/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
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
                            <span className="absolute top-1.5 right-1.5 min-w-4 h-4 flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-black px-0.5 border border-background">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </Link>
                </div>
            </header>

            {/* Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-60 bg-black/50 transition-opacity duration-300 md:hidden",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={cn(
                    "fixed top-0 left-0 h-full w-72 z-50 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-out md:hidden",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                    <Link href="/brand/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="text-white font-black text-sm">B</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-black tracking-tight text-foreground leading-none">Brand Portal</span>
                            <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Aris</span>
                        </div>
                    </Link>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 rounded-xl hover:bg-secondary text-foreground/60 transition-colors"
                    >
                        <IoCloseOutline size={22} />
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest px-3 mb-1">More</p>
                    {drawerNavItems.map((item) => {
                        const Icon = item.icon;
                        const isNotif = item.href === "/brand/notifications";
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-foreground/70 hover:text-foreground transition-colors"
                            >
                                <Icon size={20} />
                                <span className="text-sm font-semibold">{item.label}</span>
                                {isNotif && unreadCount > 0 && (
                                    <span className="ml-auto min-w-5 h-5 flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-black px-1">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-3 pb-6 border-t border-border pt-3 flex flex-col gap-1">
                    {/* Theme toggle */}
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-foreground/70 hover:text-foreground transition-colors w-full"
                    >
                        {theme === "dark" ? <IoSunnyOutline size={20} /> : <IoMoonOutline size={20} />}
                        <span className="text-sm font-semibold">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                        <div className={cn(
                            "ml-auto relative w-9 h-5 rounded-full transition-colors duration-200",
                            theme === "dark" ? "bg-primary" : "bg-foreground/20"
                        )}>
                            <div className={cn(
                                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200",
                                theme === "dark" ? "translate-x-4" : "translate-x-0.5"
                            )} />
                        </div>
                    </button>

                    {/* Sign Out */}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-destructive/80 hover:text-destructive transition-colors w-full"
                    >
                        <IoLogOutOutline size={20} />
                        <span className="text-sm font-semibold">Sign Out</span>
                    </button>
                </div>
            </div>
        </>
    );
}
