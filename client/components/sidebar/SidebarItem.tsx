"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { IconType } from "react-icons";

interface SidebarItemProps {
    label: string;
    href: string;
    icon?: IconType;
    activeIcon?: IconType;
    avatar?: string;
    isActive?: boolean;
}

export default function SidebarItem({
    label,
    href,
    icon: Icon,
    activeIcon: ActiveIcon,
    avatar,
    isActive,
}: SidebarItemProps) {
    const { isCollapsed } = useSidebar();
    const showExpanded = !isCollapsed;

    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center relative w-full py-2.5 my-1",
                isCollapsed ? "justify-center" : "pl-3",
                "transition-all duration-200 ease-out",
                // Active/Hover states
                isActive
                    ? "bg-[#6366F1] text-white border border-white/10 shadow-[1px_1px_0px_0px_#FFFFFF]"
                    : "text-white/50 hover:bg-white/5 hover:text-white",
                // Rounded
                "rounded-xl"
            )}
        >
            <div className="flex-shrink-0 relative flex items-center justify-center w-8 h-8 transition-all duration-200">
                {avatar ? (
                    <img
                             src={avatar}
                        alt={label}
                        className={cn(
                            "w-7 h-7 rounded-full object-cover transition-all duration-150",
                            isActive ? "ring-2 ring-white" : "border border-transparent"
                        )}
                    />
                ) : isActive && ActiveIcon ? (
                    <ActiveIcon
                        size={22}
                        className="transition-colors duration-150 text-white"
                    />
                ) : Icon ? (
                    <Icon
                        size={22}
                        className={cn(
                            "transition-colors duration-150",
                            isActive
                                ? "text-white"
                                : "text-white/40 group-hover:text-white"
                        )}
                    />
                ) : null}
            </div>

            <span
                className={cn(
                    "whitespace-nowrap overflow-hidden transition-all duration-150 ease-out text-base",
                    isActive ? "font-black text-white" : "font-semibold",
                    showExpanded ? "opacity-100 w-auto ml-3" : "opacity-0 w-0 ml-0"
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
