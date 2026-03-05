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
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-secondary flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary transition-colors mx-auto"
            >
                {theme === "dark" ? <IoMoonOutline size={18} /> : <IoSunnyOutline size={18} />}
            </button>
        );
    }

    return (
        <div className="bg-[#F3F4F6] dark:bg-card p-1 rounded-full flex items-center w-full max-w-[200px] mx-auto">
            <button
                onClick={() => setTheme("light")}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                    theme === "light"
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
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
                        ? "bg-secondary text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                )}
            >
                <IoMoonOutline size={14} />
                Dark
            </button>
        </div>
    );
}
