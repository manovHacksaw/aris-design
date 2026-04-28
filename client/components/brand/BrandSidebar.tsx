"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    IoGridOutline,
    IoAddCircleOutline,
    IoWalletOutline,
    IoNotificationsOutline,
    IoSunnyOutline,
    IoMoonOutline,
    IoChevronBackOutline,
    IoChevronForwardOutline,
    IoLogOutOutline,
    IoEyeOutline,
    IoRibbonOutline,
    IoGlobeOutline
} from "react-icons/io5";
import { useNotifications } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import SidebarItem from "@/components/sidebar/SidebarItem";
import SidebarButton from "@/components/sidebar/SidebarButton";
import { useWallet } from "@/context/WalletContext";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useUser } from "@/context/UserContext";
import { getCurrentBrand } from "@/services/brand.service";

export default function BrandSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { theme, setTheme } = useTheme();
    const { disconnect } = useWallet();
    const { unreadCount } = useNotifications();
    const { user } = useUser();
    const [mounted, setMounted] = useState(false);
    const [brandLogoUrl, setBrandLogoUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        getCurrentBrand()
            .then((brand) => {
                const url =
                    brand.logoUrls?.thumbnail ||
                    (brand.logoCid ? `https://gateway.pinata.cloud/ipfs/${brand.logoCid}` : null) ||
                    user?.avatarUrl ||
                    undefined;
                setBrandLogoUrl(url ?? undefined);
            })
            .catch(() => {
                setBrandLogoUrl(user?.avatarUrl ?? undefined);
            });
    }, [user]);

    const showExpanded = !isCollapsed;

    useEffect(() => {
        setMounted(true);
    }, []);

    const navItems = [
        { label: "Dashboard", href: "/brand/dashboard", icon: IoGridOutline },
        { label: "Create Campaign", href: "/brand/create-event", icon: IoAddCircleOutline },
        { label: "Milestones", href: "/brand/milestones", icon: IoRibbonOutline },
        { label: "Wallet", href: "/brand/wallet", icon: IoWalletOutline },
        { label: "Notifications", href: "/brand/notifications", icon: IoNotificationsOutline, badge: unreadCount },
        { label: "Profile", href: "/brand/settings", avatar: brandLogoUrl, showUserFallback: true },
    ];

    if (!mounted) return null;

    return (
        <motion.aside
            className="sticky top-0 h-screen bg-card dark:bg-[#111111] border-r border-surface-border hidden md:flex flex-col z-50 overflow-hidden shrink-0 glass-nav"
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
            <div className="flex items-center pt-4 pb-2 pl-6 pr-3 h-[64px]">
                <Link href="/brand/dashboard" className="flex items-center group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-foreground/8 dark:bg-white/10 flex items-center justify-center transition-transform duration-150 group-hover:scale-105 active:scale-95">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground">
                            <path d="M12 4L4 18H20L12 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span
                        className={cn(
                            "text-xl font-black tracking-[0.15em] text-foreground uppercase overflow-hidden transition-all duration-150 ease-out whitespace-nowrap ml-4",
                            showExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
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
                <div className="flex flex-col gap-1.5">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <div key={item.href} className="relative">
                                <SidebarItem
                                    label={item.label}
                                    href={item.href}
                                    icon={item.icon}
                                    avatar={(item as any).avatar}
                                    showUserFallback={(item as any).showUserFallback}
                                    isActive={isActive}
                                />
                                {item.badge !== undefined && item.badge > 0 ? (
                                    <span className={cn(
                                        "absolute top-2.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-black pointer-events-none",
                                        showExpanded ? "right-3 min-w-[18px] h-[18px] px-1" : "right-2 w-2 h-2"
                                    )}>
                                        {showExpanded ? (item.badge > 99 ? "99+" : item.badge) : ""}
                                    </span>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {/* Footer cluster */}
                <div className="pb-4 pt-4 mt-auto">
                    {/* Subtle separator */}
                    <div className="mx-1 h-[1px] bg-border mb-2" />

                    <div className="flex flex-col gap-1">
                        {/* View as User */}
                        <SidebarButton
                            label="View as User"
                            icon={IoEyeOutline}
                            onClick={() => {
                                sessionStorage.setItem("brand_preview_mode", "true");
                                router.push("/");
                            }}
                        />

                        {/* Public Website */}
                        <SidebarButton
                            label="Public Website"
                            icon={IoGlobeOutline}
                            onClick={() => window.open("http://www.aristhrottle.org/", "_blank", "noopener,noreferrer")}
                        />

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className={cn(
                                "group flex items-center w-full pl-3 py-2 rounded-xl",
                                "text-foreground/50 hover:bg-surface-hover hover:text-foreground",
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

                        {/* Sign Out */}
                        <SidebarButton
                            label="Sign Out"
                            icon={IoLogOutOutline}
                            onClick={async () => {
                                await disconnect();
                                router.push("/register-brand");
                            }}
                        />

                        {/* Collapse Toggle - icon only, subtle */}
                        <button
                            onClick={toggleSidebar}
                            className={cn(
                                "group flex items-center w-full pl-3 py-2 rounded-xl",
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
