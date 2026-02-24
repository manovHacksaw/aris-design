"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-8 h-8" />; // avoid hydration mismatch
    }

    const isDark = theme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={clsx(
                "relative rounded-full w-14 h-8 p-1 flex items-center transition-colors duration-300",
                isDark ? "bg-[#111217]" : "bg-[#E5E7EB]",
                className
            )}
            aria-label="Toggle Theme"
        >
            <motion.div
                layout
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                className={clsx(
                    "w-6 h-6 rounded-full shadow-sm flex items-center justify-center",
                    "bg-white text-black"
                )}
                style={{
                    marginLeft: isDark ? "auto" : "0",
                    marginRight: isDark ? "0" : "auto",
                }}
            >
                {isDark ? (
                    <Moon className="w-3.5 h-3.5 fill-current text-indigo-500" />
                ) : (
                    <Sun className="w-3.5 h-3.5 fill-current text-yellow-500" />
                )}
            </motion.div>
        </button>
    );
}
