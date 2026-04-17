"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { IconType } from "react-icons";

interface SidebarButtonProps {
    label: string;
    icon: IconType;
    onClick: () => void;
    isActive?: boolean;
    isDestructive?: boolean;
}

export default function SidebarButton({
    label,
    icon: Icon,
    onClick,
    isActive,
    isDestructive,
}: SidebarButtonProps) {
    const { isCollapsed } = useSidebar();
    const showExpanded = !isCollapsed;

    return (
        <button
            onClick={onClick}
            className={cn(
                "group flex items-center relative w-full pl-3 py-3",
                "transition-colors duration-150 ease-out",
                // Hover effect
                isDestructive
                    ? "text-[#FF60B6] hover:bg-[#FF60B6]/10"
                    : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground",
                // Rounded
                "rounded-xl",
                // Active Styling
                isActive && !isDestructive && "text-foreground font-black bg-[#6366F1] border border-white/10 dark:shadow-[4px_4px_0px_0px_#FFFFFF] shadow-[4px_4px_0px_0px_#6366F1]"
            )}
        >
            <div className="flex-shrink-0 relative flex items-center justify-center w-7 h-7">
                <Icon
                    size={18}
                    className={cn(
                        "transition-colors duration-150",
                        isActive && !isDestructive
                            ? "text-foreground"
                            : "",
                        isDestructive ? "text-[#FF60B6]" : "group-hover:text-foreground",
                        !isActive && !isDestructive && "text-foreground/40"
                    )}
                />
            </div>

            <span
                className={cn(
                    "whitespace-nowrap overflow-hidden transition-all duration-150 ease-out text-left ml-3 text-sm",
                    isActive ? "font-black" : "font-semibold",
                    showExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}
            >
                {label}
            </span>

            {/* Tooltip for Collapsed State */}
            {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-card text-foreground text-xs rounded-[8px] shadow-spotify opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none font-bold">
                    {label}
                </div>
            )}
        </button>
    );
}
