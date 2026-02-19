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
                    ? "text-[#EF4444] hover:bg-[#EF4444]/10"
                    : "text-foreground/60 hover:bg-secondary hover:text-foreground",
                // Rounded
                "rounded-xl",
                // Active Styling
                isActive && !isDestructive && "text-foreground font-bold"
            )}
        >
            {/* Left accent pill for active state */}
            {isActive && !isDestructive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-full" />
            )}

            <div className="flex-shrink-0 relative flex items-center justify-center w-8 h-8">
                <Icon
                    size={24}
                    className={cn(
                        "transition-colors duration-150",
                        isActive && !isDestructive
                            ? "text-foreground"
                            : "",
                        isDestructive ? "text-[#EF4444]" : "group-hover:text-foreground",
                        !isActive && !isDestructive && "text-foreground/60"
                    )}
                />
            </div>

            <span
                className={cn(
                    "whitespace-nowrap overflow-hidden transition-all duration-150 ease-out text-left ml-3 text-[15px]",
                    isActive ? "font-semibold" : "font-normal",
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
