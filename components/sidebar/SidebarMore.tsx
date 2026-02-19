"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
    IoMenuOutline,
    IoSettingsOutline,
    IoPulseOutline,
    IoBookmarkOutline,
    IoWarningOutline,
    IoPersonAddOutline
} from "react-icons/io5";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { motion, AnimatePresence } from "framer-motion";

export default function SidebarMore() {
    const { isCollapsed, expandSidebar } = useSidebar();
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ left: 0, bottom: 0 });
    const [mounted, setMounted] = useState(false);

    // Refs
    // We use a specific type for the ref to match the button element
    const buttonRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Check if click is outside BOTH the button and the content (portal)
            const isOutsideButton = buttonRef.current && !buttonRef.current.contains(event.target as Node);
            const isOutsideContent = contentRef.current && !contentRef.current.contains(event.target as Node);

            if (isOutsideButton && isOutsideContent) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const toggleMenu = () => {
        if (isCollapsed) {
            expandSidebar();
        }

        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Position above the button with a small gap
            setCoords({
                left: rect.left,
                bottom: window.innerHeight - rect.top + 8 // 8px gap above button
            });
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const menuItems = [
        { label: "Settings", icon: IoSettingsOutline, href: "/settings" },
        { label: "Your Activity", icon: IoPulseOutline, href: "/activity" },
        { label: "Saved", icon: IoBookmarkOutline, href: "/saved" },
        { label: "Report a problem", icon: IoWarningOutline, href: "/report" },
    ];

    return (
        <div className="relative">
            {/* Popover Menu - Portaled to body to escape overflow clipping */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={contentRef}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            style={{
                                position: 'fixed',
                                left: coords.left,
                                bottom: coords.bottom,
                                width: '260px',
                                zIndex: 9999
                            }}
                            className="bg-card rounded-[16px] shadow-spotify overflow-hidden"
                        >
                            <div className="p-1.5 flex flex-col gap-0.5">
                                {/* Main Items */}
                                {menuItems.map((item, index) => (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground/40 hover:text-foreground hover:bg-secondary rounded-[16px] transition-colors group text-left"
                                    >
                                        <item.icon size={20} className="flex-shrink-0 text-foreground/20 group-hover:text-foreground transition-colors" />
                                        <span className="flex-1">{item.label}</span>
                                    </Link>
                                ))}

                                <div className="h-[1px] bg-border my-1.5 mx-2" />

                                {/* Switch Accounts */}
                                <button className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-secondary rounded-[16px] transition-colors group">
                                    <IoPersonAddOutline size={20} className="flex-shrink-0 text-[#6B7280] group-hover:text-white transition-colors" />
                                    Switch accounts
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Trigger Button */}
            <button
                ref={buttonRef}
                onClick={toggleMenu}
                className={cn(
                    "group flex items-center w-full pl-3 py-3 rounded-xl",
                    "text-[#9CA3AF] hover:bg-secondary hover:text-white",
                    "transition-colors duration-150 ease-out",
                    isOpen && "text-white bg-secondary"
                )}
            >
                <div className="flex-shrink-0 relative flex items-center justify-center w-8 h-8">
                    <IoMenuOutline
                        size={24}
                        className="transition-colors duration-150"
                    />
                </div>

                <span
                    className={cn(
                        "whitespace-nowrap overflow-hidden transition-all duration-150 ease-out font-normal ml-3 text-[15px]",
                        !isCollapsed ? "opacity-100 w-auto" : "opacity-0 w-0"
                    )}
                >
                    More
                </span>
            </button>
        </div>
    );
}
