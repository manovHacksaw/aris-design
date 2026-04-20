"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { IoGridOutline, IoAddCircleOutline, IoWalletOutline, IoRibbonOutline, IoPersonOutline } from "react-icons/io5";
import { useState, useEffect } from "react";

const navItems = [
    { label: "Dashboard",  href: "/brand/dashboard",    icon: IoGridOutline },
    { label: "Milestones", href: "/brand/milestones",   icon: IoRibbonOutline },
    { label: "Create",     href: "/brand/create-event", icon: IoAddCircleOutline },
    { label: "Wallet",     href: "/brand/financials",   icon: IoWalletOutline },
    { label: "Profile",    href: "/brand/settings",     icon: IoPersonOutline },
];

export default function BrandBottomNav() {
    const pathname = usePathname();
    const [tappedHref, setTappedHref] = useState<string | null>(null);

    const handleTap = (href: string) => {
        setTappedHref(href);
    };

    useEffect(() => {
        if (!tappedHref) return;
        const t = setTimeout(() => setTappedHref(null), 1200);
        return () => clearTimeout(t);
    }, [tappedHref]);

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/60 flex justify-around items-center px-2 md:hidden [box-shadow:0_-4px_12px_0px_rgba(255,255,255,0.06)]"
            style={{ height: "calc(4rem + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            {navItems.map((item) => {
                const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/brand/dashboard");
                const isTapped = tappedHref === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => handleTap(item.href)}
                        className={cn(
                            "relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors duration-150",
                            isActive ? "text-foreground" : "text-foreground/40"
                        )}
                    >
                        {/* Bubble label */}
                        <span
                            className={cn(
                                "absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-full bg-foreground text-background pointer-events-none",
                                "transition-all duration-200",
                                isTapped
                                    ? "opacity-100 scale-100 translate-y-0"
                                    : "opacity-0 scale-75 translate-y-2"
                            )}
                            style={{ transformOrigin: "bottom center" }}
                        >
                            {item.label}
                            <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-foreground" />
                        </span>

                        {/* Icon with bounce */}
                        <span
                            className={cn(
                                "transition-transform duration-150",
                                isTapped ? "animate-bounce-once" : ""
                            )}
                        >
                            <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 1.8} />
                        </span>
                    </Link>
                );
            })}

            <style>{`
                @keyframes bounce-once {
                    0%   { transform: translateY(0); }
                    30%  { transform: translateY(-6px); }
                    55%  { transform: translateY(2px); }
                    75%  { transform: translateY(-3px); }
                    100% { transform: translateY(0); }
                }
                .animate-bounce-once {
                    animation: bounce-once 0.4s ease forwards;
                }
            `}</style>
        </nav>
    );
}
