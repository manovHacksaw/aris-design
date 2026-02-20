"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { IconType } from "react-icons";

interface SidebarItemProps {
    label: string;
    href: string;
    icon?: IconType;
    avatar?: string;
    isActive?: boolean;
}

export default function SidebarItem({
    label,
    href,
    icon: Icon,
    avatar,
    isActive,
}: SidebarItemProps) {
    const { isCollapsed } = useSidebar();
    const showExpanded = !isCollapsed;

    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center relative w-full pl-3 py-3",
                "transition-all duration-150 ease-out",
                // Active state with neon glow
                isActive
                    ? "text-white border border-neon-blue/60 bg-secondary/30 glow-blue"
                    : "text-[#9CA3AF] hover:bg-secondary/20 hover:text-white hover:border hover:border-neon-blue/30 hover:glow-blue",
                // Rounded
                "rounded-xl"
            )}
        >
            {/* Left neon accent pill for active state */}
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-neon-cyan to-neon-blue rounded-full shadow-lg" />
            )}

            <div className="flex-shrink-0 relative flex items-center justify-center w-8 h-8">
                {avatar ? (
                    <img
                        src={avatar}
                        alt={label}
                        className={cn(
                            "w-7 h-7 rounded-full object-cover transition-all duration-150",
                            isActive ? "ring-2 ring-neon-cyan glow-cyan" : "border border-neon-blue/30 group-hover:border-neon-blue/60"
                        )}
                    />
                ) : Icon ? (
                    <Icon
                        size={24}
                        className={cn(
                            "transition-colors duration-150",
                            isActive
                                ? "text-neon-cyan"
                                : "text-[#9CA3AF] group-hover:text-neon-cyan"
                        )}
                    />
                ) : null}
            </div>

            <span
                className={cn(
                    "whitespace-nowrap overflow-hidden transition-all duration-150 ease-out ml-3 text-[15px]",
                    isActive ? "font-bold text-white" : "font-medium",
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
        </Link>
    );
}
