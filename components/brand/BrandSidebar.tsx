"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    IoGridOutline,
    IoMegaphoneOutline,
    IoAddCircleOutline,
    IoBarChartOutline,
    IoWalletOutline,
    IoSettingsOutline,
    IoSunnyOutline,
    IoMoonOutline,
    IoChevronBackOutline,
    IoChevronForwardOutline,
    IoLogOutOutline
} from "react-icons/io5";
import SidebarItem from "@/components/sidebar/SidebarItem";
import SidebarButton from "@/components/sidebar/SidebarButton";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export default function BrandSidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const showExpanded = !isCollapsed;

    useEffect(() => {
        setMounted(true);
    }, []);

    const navItems = [
        { label: "Dashboard", href: "/brand/dashboard", icon: IoGridOutline },
        { label: "Campaigns", href: "/brand/events", icon: IoMegaphoneOutline },
        { label: "Create Campaign", href: "/brand/create-event", icon: IoAddCircleOutline },
        { label: "Analytics", href: "/brand/analytics", icon: IoBarChartOutline },
        { label: "Financials", href: "/brand/financials", icon: IoWalletOutline },
        { label: "Settings", href: "/brand/settings", icon: IoSettingsOutline },
    ];

    if (!mounted) return null;

    return (
        <motion.aside
            className="sticky top-0 h-screen bg-background border-r border-border hidden md:flex flex-col z-50 overflow-hidden shrink-0"
            initial={false}
            animate={{
                width: showExpanded ? 260 : 72
            }}
            transition={{
                duration: 0.2,
                ease: [0.25, 0.1, 0.25, 1]
            }}
        >
            {/* Logo Section */}
            <div className="flex items-center pt-6 pb-5 pl-4 pr-3 h-[88px]">
                <Link href="/brand/dashboard" className="flex items-center group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform duration-150 group-hover:scale-105 active:scale-95">
                        <span className="text-white font-bold text-base select-none">B</span>
                    </div>
                    <span
                        className={cn(
                            "text-xl font-bold tracking-tight text-foreground overflow-hidden transition-all duration-150 ease-out whitespace-nowrap ml-3",
                            showExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                        )}
                    >
                        Aris <span className="text-primary text-sm font-medium ml-1">Brand</span>
                    </span>
                </Link>
            </div>

            {/* Subtle divider under logo */}
            <div className="mx-4 h-[1px] bg-border mb-2" />

            {/* Navigation */}
            <nav className="flex-1 flex flex-col px-3 pt-2 overflow-y-auto scrollbar-hide">
                {/* Main nav items */}
                <div className="flex flex-col gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <SidebarItem
                                key={item.href}
                                label={item.label}
                                href={item.href}
                                icon={item.icon}
                                isActive={isActive}
                            />
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

                        {/* Logout - Placeholder */}
                        <SidebarButton
                            label="Sign Out"
                            icon={IoLogOutOutline}
                            onClick={() => console.log("Sign out clicked")}
                        />

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
    );
}
