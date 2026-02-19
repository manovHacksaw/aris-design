"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { IoHomeOutline, IoCompassOutline, IoAddCircleOutline, IoTrophyOutline, IoGridOutline, IoWalletOutline, IoSunnyOutline, IoMoonOutline, IoChevronBackOutline, IoChevronForwardOutline, IoNotificationsOutline } from "react-icons/io5";
import SidebarItem from "@/components/sidebar/SidebarItem";
import SidebarButton from "@/components/sidebar/SidebarButton";
import SidebarMore from "@/components/sidebar/SidebarMore";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar, isMobileOpen, setMobileOpen } = useSidebar();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const showExpanded = !isCollapsed;

    useEffect(() => {
        setMounted(true);
    }, []);

    const navItems = [
        { label: "Home", href: "/home", icon: IoHomeOutline },

        { label: "Discover", href: "/discover", icon: IoCompassOutline },
        { label: "Leaderboard", href: "/leaderboard", icon: IoTrophyOutline },
        { label: "Dashboard", href: "/dashboard", icon: IoGridOutline },
        { label: "Notifications", href: "/notifications", icon: IoNotificationsOutline },
        { label: "Wallet", href: "/wallet", icon: IoWalletOutline },
        { label: "Create", href: "/create", icon: IoAddCircleOutline },
        {
            label: "Profile",
            href: "/profile",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC6sD8shcEbuD1sEWqq_k9nBz6jYqCaILxk058kBiCwlwVdu9qFIfZxlQnh5BDwQhyeNNMD8zPG6w5PZNz5SW2R1GOlu3Zmh6hUYGMxRRQOuSWRiPcTG8n5eOb03VlvlW27x-HnAdO-0MWUmldh-SIDwr6fw_J2CRzUpPr-TtHAl-NTFI7tZEvP_ts4aOpuQKxH92CjPdAXUV8Opd5SOHIXZB8fr-rU9B9-DRUgY51RYxnY0cAyhSkZXheEfrkR4KWzScuV5TQQuA5s"
        },
    ];

    if (!mounted) return null;

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <motion.aside
                className={cn(
                    "fixed left-0 top-0 h-screen bg-background border-r border-border flex flex-col z-50 overflow-hidden",
                    // Mobile styles: fixed inset-y-0 left-0 transform transition-transform
                    // Desktop styles: hidden md:flex
                    isMobileOpen ? "translate-x-0 w-[240px]" : "-translate-x-full md:translate-x-0",
                    "md:flex transition-transform duration-300 ease-in-out md:transition-none"
                )}
                initial={false}
                animate={{
                    width: (showExpanded || isMobileOpen) ? 220 : 72
                }}
                transition={{
                    duration: 0.2,
                    ease: [0.25, 0.1, 0.25, 1]
                }}
            >
                {/* Logo Section */}
                <div className="flex items-center pt-6 pb-5 pl-4 pr-3">
                    <Link href="/home" className="flex items-center group">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform duration-150 group-hover:scale-105 active:scale-95">
                            <span className="text-white font-bold text-base select-none">A</span>
                        </div>
                        <span
                            className={cn(
                                "text-xl font-bold tracking-tight text-foreground overflow-hidden transition-all duration-150 ease-out whitespace-nowrap ml-3",
                                showExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                            )}
                        >
                            Aris
                        </span>
                    </Link>
                </div>

                {/* Subtle divider under logo */}
                <div className="mx-4 h-[1px] bg-border mb-2" />

                {/* Navigation */}
                <nav className="flex-1 flex flex-col px-3 pt-2">
                    {/* Main nav items */}
                    <div className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href === "/home" && pathname === "/");
                            return (
                                <div key={item.href} onClick={() => setMobileOpen(false)}>
                                    <SidebarItem
                                        label={item.label}
                                        href={item.href}
                                        icon={'icon' in item ? item.icon : undefined}
                                        avatar={'avatar' in item ? item.avatar : undefined}
                                        isActive={isActive}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer cluster - pushed to bottom */}
                    <div className="mt-auto pb-6">
                        {/* Subtle separator */}
                        <div className="mx-1 h-[1px] bg-border mb-2" />

                        <div className="flex flex-col gap-1">
                            {/* Theme Toggle */}
                            <SidebarButton
                                label={theme === "dark" ? "Light Mode" : "Dark Mode"}
                                icon={theme === "dark" ? IoSunnyOutline : IoMoonOutline}
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            />

                            {/* More Menu */}
                            <SidebarMore />

                            {/* Collapse Toggle - icon only, subtle */}
                            <button
                                onClick={toggleSidebar}
                                className={cn(
                                    "group flex items-center w-full pl-3 py-3 rounded-xl",
                                    "text-foreground/60 hover:bg-secondary hover:text-foreground",
                                    "transition-colors duration-150 ease-out"
                                )}
                                aria-label={showExpanded ? "Collapse sidebar" : "Expand sidebar"}
                            >
                                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                                    {showExpanded
                                        ? <IoChevronBackOutline size={20} className="transition-colors duration-150" />
                                        : <IoChevronForwardOutline size={20} className="transition-colors duration-150" />
                                    }
                                </div>
                            </button>
                        </div>
                    </div>
                </nav>
            </motion.aside>
        </>
    );
}
