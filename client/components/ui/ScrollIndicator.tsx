"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollIndicatorProps {
    /**
     * Ref to a scrollable element.
     * Omit (or pass null ref) to track window scroll instead.
     */
    scrollRef?: React.RefObject<HTMLElement | null>;
    className?: string;
    /** Bottom offset in px from the bottom of the visible area (default 96) */
    bottomOffset?: number;
}

export function ScrollIndicator({ scrollRef, className, bottomOffset = 96 }: ScrollIndicatorProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = scrollRef?.current ?? null;

        const check = () => {
            if (el) {
                setVisible(
                    el.scrollHeight > el.clientHeight + 8 &&
                    el.scrollTop + el.clientHeight < el.scrollHeight - 8
                );
            } else {
                const { scrollY, innerHeight } = window;
                const { scrollHeight } = document.documentElement;
                setVisible(
                    scrollHeight > innerHeight + 8 &&
                    scrollY + innerHeight < scrollHeight - 8
                );
            }
        };

        check();

        const target = el ?? window;
        target.addEventListener("scroll", check, { passive: true });
        const ro = new ResizeObserver(check);
        ro.observe(el ?? document.documentElement);

        return () => {
            target.removeEventListener("scroll", check);
            ro.disconnect();
        };
    }, [scrollRef]);

    const handleClick = () => {
        const el = scrollRef?.current ?? null;
        (el ?? window).scrollBy({ top: 220, behavior: "smooth" });
    };

    return (
        <AnimatePresence>
            {visible && (
                // sticky wrapper: zero height, stays at bottom of visible area
                <div
                    className="sticky z-30 w-full flex justify-center pointer-events-none"
                    style={{ bottom: bottomOffset, height: 0 }}
                >
                    <motion.button
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.25 }}
                        onClick={handleClick}
                        aria-label="Scroll down"
                        className={cn(
                            "-translate-y-full pointer-events-auto",
                            "flex items-center justify-center w-8 h-8 rounded-full",
                            "bg-card border border-surface-border-strong backdrop-blur-md shadow-card",
                            "text-foreground/50 hover:text-foreground hover:bg-surface-hover transition-colors",
                            className
                        )}
                    >
                        <motion.div
                            animate={{ y: [0, 3, 0] }}
                            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                        >
                            <ChevronDown className="w-4 h-4" />
                        </motion.div>
                    </motion.button>
                </div>
            )}
        </AnimatePresence>
    );
}
