"use client";

import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { isCollapsed } = useSidebar();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (isCollapsed) {
        return (
            <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-10 h-10 rounded-full bg-surface hover:bg-surface-hover flex items-center justify-center text-foreground/50 hover:text-primary transition-colors mx-auto border border-surface-border"
            >
                {theme === "dark" ? <IoMoonOutline size={18} /> : <IoSunnyOutline size={18} />}
            </button>
        );
    }

    return (
        <div className="bg-surface border border-surface-border p-1 rounded-full flex items-center w-full max-w-[200px] mx-auto">
            <button
                onClick={() => setTheme("light")}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                    theme === "light"
                        ? "bg-card text-foreground shadow-soft border border-surface-border"
                        : "text-foreground/40 hover:text-foreground"
                )}
            >
                <IoSunnyOutline size={14} />
                Light
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                    theme === "dark"
                        ? "bg-secondary text-secondary-foreground shadow-soft"
                        : "text-foreground/40 hover:text-foreground"
                )}
            >
                <IoMoonOutline size={14} />
                Dark
            </button>
        </div>
    );
}
