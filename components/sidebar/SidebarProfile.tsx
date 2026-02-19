"use client";

import { useSidebar } from "@/context/SidebarContext";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProfileProps {
    forceExpanded?: boolean;
}

export default function SidebarProfile({ forceExpanded }: SidebarProfileProps) {
    const { isCollapsed } = useSidebar();
    const showExpanded = !isCollapsed || forceExpanded;

    return (
        <Link
            href="/profile"
            className={cn(
                "flex items-center rounded-xl overflow-hidden transition-all duration-300",
                "hover:bg-gray-100 dark:hover:bg-secondary group",
                showExpanded ? "w-full px-3 py-2" : "w-10 h-10 justify-center p-0 mx-auto"
            )}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <img
                    className="w-8 h-8 rounded-full object-cover border border-border bg-background"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6sD8shcEbuD1sEWqq_k9nBz6jYqCaILxk058kBiCwlwVdu9qFIfZxlQnh5BDwQhyeNNMD8zPG6w5PZNz5SW2R1GOlu3Zmh6hUYGMxRRQOuSWRiPcTG8n5eOb03VlvlW27x-HnAdO-0MWUmldh-SIDwr6fw_J2CRzUpPr-TtHAl-NTFI7tZEvP_ts4aOpuQKxH92CjPdAXUV8Opd5SOHIXZB8fr-rU9B9-DRUgY51RYxnY0cAyhSkZXheEfrkR4KWzScuV5TQQuA5s"
                    alt="User"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] border-2 border-card rounded-full" />
            </div>

            {/* Info */}
            <div className={cn(
                "flex-1 min-w-0 flex items-center justify-between overflow-hidden transition-all duration-300 ease-in-out",
                showExpanded ? "opacity-100 max-w-[200px] ml-3" : "opacity-0 max-w-0 ml-0"
            )}>
                <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium text-[#E5E7EB] truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                        Alex Morgan
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] truncate group-hover:text-gray-600 dark:group-hover:text-[#CBD5F5] transition-colors">
                        @alexm
                    </p>
                </div>
                {/* Arrow - subtle indicator */}
                <ChevronRight className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-all duration-200" />
            </div>
        </Link>
    );
}
