"use client";

import { useSidebar } from "@/context/SidebarContext";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";

export default function SidebarToggle() {
    const { isCollapsed, toggleSidebar } = useSidebar();

    return (
        <button
            onClick={toggleSidebar}
            className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200",
                "text-[#9CA3AF] hover:text-white hover:bg-secondary",
                "focus:outline-none"
            )}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
            {isCollapsed ? <IoChevronForwardOutline size={18} /> : <IoChevronBackOutline size={18} />}
        </button>
    );
}
