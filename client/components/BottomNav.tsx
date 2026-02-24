"use client";

import { Home, Compass, PlusCircle, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navItems = [
    { icon: Home, label: "Home", href: "/home" },
    { icon: Compass, label: "Explore", href: "/explore" },
    { icon: PlusCircle, label: "Create", href: "/create" },
    { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
    { icon: User, label: "Profile", href: "/profile" },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none">
            <nav className="pointer-events-auto bg-card/80 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl flex justify-between items-center px-8 py-3.5 mx-auto max-w-sm">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href === "/home" && pathname === "/");
                    const Icon = item.icon;
                    const isCreate = item.label === "Create";

                    if (isCreate) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative -top-6"
                            >
                                <div className="w-14 h-14 bg-foreground rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl border-4 border-background">
                                    <Icon className="w-7 h-7 text-background" />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex flex-col items-center justify-center transition-all duration-300",
                                isActive ? "text-primary scale-110" : "text-foreground/40 hover:text-foreground"
                            )}
                        >
                            <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
