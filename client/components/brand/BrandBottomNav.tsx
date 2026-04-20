"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { IoGridOutline, IoAddCircleOutline, IoWalletOutline, IoRibbonOutline } from "react-icons/io5";
import { RiUser3Line } from "react-icons/ri";

const navItems = [
    { label: "Dashboard",  href: "/brand/dashboard",    icon: IoGridOutline },
    { label: "Milestones", href: "/brand/milestones",   icon: IoRibbonOutline },
    { label: "Create",     href: "/brand/create-event", icon: IoAddCircleOutline, isProminent: true },
    { label: "Wallet",     href: "/brand/financials",   icon: IoWalletOutline },
    { label: "Profile",    href: "/brand/settings",     icon: RiUser3Line },
];

export default function BrandBottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-3 pt-1 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none md:hidden">
            <nav className="pointer-events-auto bg-card/80 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl flex justify-between items-center px-5 py-0.5 mx-auto max-w-xs">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/brand/dashboard");
                    const Icon = item.icon;

                    if (item.isProminent) {
                        return (
                            <Link key={item.href} href={item.href} className="relative -top-5">
                                <div className="w-9 h-9 bg-foreground rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl border-2 border-background">
                                    <Icon className="w-5 h-5 text-background" />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center transition-all duration-300",
                                isActive ? "text-primary scale-110" : "text-foreground/40 hover:text-foreground"
                            )}
                        >
                            <Icon className="w-6 h-6" strokeWidth={isActive ? "20" : "16"} />
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
