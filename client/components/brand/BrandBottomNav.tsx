"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { IoGridOutline, IoMegaphoneOutline, IoAddCircleOutline, IoWalletOutline, IoNotificationsOutline, IoRibbonOutline } from "react-icons/io5";
import { useNotifications } from "@/context/NotificationContext";

const navItems = [
    { label: "Home",      href: "/brand/dashboard",     icon: IoGridOutline },
    { label: "Campaigns", href: "/brand/events",        icon: IoMegaphoneOutline },
    { label: "Create",    href: "/brand/create-event",  icon: IoAddCircleOutline, isProminent: true },
    { label: "Milestones", href: "/brand/milestones",   icon: IoRibbonOutline },
    { label: "Wallet",    href: "/brand/financials",    icon: IoWalletOutline },
    { label: "Alerts",    href: "/brand/notifications", icon: IoNotificationsOutline },
];

export default function BrandBottomNav() {
    const pathname = usePathname();
    const { unreadCount } = useNotifications();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none md:hidden">
            <nav className="pointer-events-auto bg-card/90 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl flex justify-between items-center px-4 py-3 mx-auto max-w-sm">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/brand/dashboard");
                    const Icon = item.icon;
                    const showBadge = item.href === "/brand/notifications" && unreadCount > 0;

                    if (item.isProminent) {
                        return (
                            <Link key={item.href} href={item.href} className="relative -top-5">
                                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg border-4 border-background ring-2 ring-primary/20">
                                    <Icon className="w-6 h-6" />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center min-w-[50px] transition-all duration-300",
                                isActive ? "text-primary scale-110" : "text-foreground/40 hover:text-foreground"
                            )}
                        >
                            <Icon className="w-5 h-5 mb-0.5" strokeWidth={isActive ? "20" : "16"} />
                            {showBadge && (
                                <span className="absolute -top-0.5 right-2 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-primary text-black text-[8px] font-black px-0.5">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                            <span className={cn(
                                "text-[9px] font-bold text-center w-full truncate px-0.5 transition-all",
                                isActive ? "opacity-100" : "opacity-0 h-0 w-0 overflow-hidden"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
