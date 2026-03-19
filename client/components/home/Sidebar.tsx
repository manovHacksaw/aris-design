"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { IoHomeOutline, IoHome, IoCompassOutline, IoCompass, IoAddCircleOutline, IoAddCircle, IoTrophyOutline, IoTrophy, IoGridOutline, IoGrid, IoWalletOutline, IoWallet, IoNotificationsOutline, IoNotifications, IoSunnyOutline, IoMoonOutline, IoChevronBackOutline, IoChevronForwardOutline, IoPersonOutline, IoPerson, IoLogOutOutline } from "react-icons/io5";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/context/UserContext";
import { useWallet } from "@/context/WalletContext";
import SidebarItem from "@/components/sidebar/SidebarItem";
import SidebarMore from "@/components/sidebar/SidebarMore";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar, isMobileOpen, setMobileOpen } = useSidebar();
    const { theme, setTheme } = useTheme();
    const { logout } = usePrivy();
    const [mounted, setMounted] = useState(false);

    const showExpanded = !isCollapsed;

    const { user } = useUser();
    const { userInfo } = useWallet();
    const avatarUrl = user?.avatarUrl || userInfo?.profileImage || undefined;

    useEffect(() => {
        setMounted(true);
    }, []);

    const navItems = [
        { label: "Home", href: "/home", icon: IoHomeOutline, activeIcon: IoHome },


        { label: "Explore", href: "/explore", icon: IoCompassOutline, activeIcon: IoCompass },
        { label: "Create", href: "/create", icon: IoAddCircleOutline, activeIcon: IoAddCircle },
        { label: "Leaderboard", href: "/leaderboard", icon: IoTrophyOutline, activeIcon: IoTrophy },
        { label: "Dashboard", href: "/dashboard", icon: IoGridOutline, activeIcon: IoGrid },
        { label: "Notifications", href: "/notifications", icon: IoNotificationsOutline, activeIcon: IoNotifications },
        { label: "Wallet", href: "/wallet", icon: IoWalletOutline, activeIcon: IoWallet },

        {
            label: "Profile",
            href: "/profile",
            icon: IoPersonOutline,
            activeIcon: IoPerson,
            avatar: avatarUrl
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
                    "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-50 overflow-hidden",
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
                <div className={cn("flex items-center pt-8 pb-6 h-[88px]", isCollapsed ? "justify-center" : "pl-6 pr-3")}>
                    <Link href="/home" className="flex items-center group">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center transition-transform duration-150 group-hover:scale-105 active:scale-95">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground">
                                <path d="M12 4L4 18H20L12 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span
                            className={cn(
                                "text-xl font-black tracking-[0.15em] text-foreground uppercase overflow-hidden transition-all duration-150 ease-out whitespace-nowrap",
                                showExpanded ? "opacity-100 w-auto ml-4" : "opacity-0 w-0 ml-0"
                            )}
                        >
                            ARIS
                        </span>
                    </Link>
                </div>

                {/* Divider removed to match image */}

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
                                        icon={item.icon}
                                        activeIcon={item.activeIcon}
                                        avatar={item.avatar}
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
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className={cn(
                                    "group flex items-center w-full py-2 rounded-xl",
                                    isCollapsed ? "justify-center" : "pl-3",
                                    "text-foreground/50 hover:bg-foreground/5 hover:text-foreground",
                                    "transition-colors duration-150 ease-out"
                                )}
                            >
                                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                                    {theme === "dark"
                                        ? <IoSunnyOutline size={20} className="transition-colors duration-150" />
                                        : <IoMoonOutline size={20} className="transition-colors duration-150" />
                                    }
                                </div>
                                {showExpanded && (
                                    <div className="ml-3 mr-2">
                                        <div className={cn(
                                            "relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0",
                                            theme === "dark" ? "bg-primary" : "bg-foreground/20"
                                        )}>
                                            <div className={cn(
                                                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200",
                                                theme === "dark" ? "translate-x-4" : "translate-x-0.5"
                                            )} />
                                        </div>
                                    </div>
                                )}
                            </button>

                            {/* Logout */}
                            <button
                                onClick={() => logout()}
                                className={cn(
                                    "group relative flex items-center w-full py-2 rounded-xl",
                                    isCollapsed ? "justify-center" : "pl-3",
                                    "text-foreground/50 hover:bg-foreground/5 hover:text-red-400",
                                    "transition-colors duration-150 ease-out"
                                )}
                            >
                                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                                    <IoLogOutOutline size={20} className="transition-colors duration-150" />
                                </div>
                                <span className={cn(
                                    "whitespace-nowrap overflow-hidden transition-all duration-150 ease-out text-base font-medium",
                                    showExpanded ? "opacity-100 w-auto ml-3" : "opacity-0 w-0 ml-0"
                                )}>
                                    Logout
                                </span>
                                {isCollapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-card text-foreground text-xs rounded-[8px] shadow-spotify opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none font-bold">
                                        Logout
                                    </div>
                                )}
                            </button>

                            {/* More Menu */}
                            <SidebarMore />

                            {/* Collapse Toggle - icon only, subtle */}
                            <button
                                onClick={toggleSidebar}
                                className={cn(
                                    "group flex items-center w-full py-2 rounded-xl",
                                    isCollapsed ? "justify-center" : "pl-3",
                                    "text-foreground/50 hover:bg-foreground/5 hover:text-foreground",
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
