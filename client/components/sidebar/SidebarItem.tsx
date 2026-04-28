"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";
import { IconType } from "react-icons";
import { IoPersonCircleOutline } from "react-icons/io5";

interface SidebarItemProps {
    label: string;
    href: string;
    icon?: IconType;
    activeIcon?: IconType;
    avatar?: string;
    showUserFallback?: boolean;
    isActive?: boolean;
    hasNotification?: boolean;
    notificationCount?: number;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function SidebarItem({
    label,
    href,
    icon: Icon,
    activeIcon: ActiveIcon,
    avatar,
    showUserFallback,
    isActive,
    hasNotification,
    notificationCount,
    onClick,
}: SidebarItemProps) {
    const { isCollapsed } = useSidebar();
    const showExpanded = !isCollapsed;
    const showCount = typeof notificationCount === "number" && notificationCount > 0;
    const countLabel = notificationCount && notificationCount > 99 ? "99+" : notificationCount;

    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "group flex items-center relative w-full py-2.5 my-1",
                isCollapsed ? "justify-center" : "pl-3",
                "transition-all duration-200 ease-out",
                isActive
                    ? "bg-secondary text-secondary-foreground border border-secondary/20 shadow-[0_2px_8px_rgba(111,111,255,0.25)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,0.15)]"
                    : "text-foreground/50 hover:bg-surface-hover hover:text-foreground",
                "rounded-xl"
            )}
        >
            <div className="flex-shrink-0 relative flex items-center justify-center w-7 h-7 transition-all duration-200">
                {avatar ? (
                    <img
                        src={avatar}
                        alt={label}
                        className={cn(
                            "w-7 h-7 rounded-full object-cover transition-all duration-150",
                            isActive ? "ring-2 ring-white" : "border border-transparent"
                        )}
                    />
                ) : showUserFallback ? (
                    <IoPersonCircleOutline
                        size={22}
                        className={cn(
                            "transition-colors duration-150",
                            isActive ? "text-foreground" : "text-foreground/40 group-hover:text-foreground"
                        )}
                    />
                ) : isActive && ActiveIcon ? (
                    <ActiveIcon size={18} className="transition-colors duration-150 text-secondary-foreground" />
                ) : Icon ? (
                    <Icon
                        size={18}
                        className={cn(
                            "transition-colors duration-150",
                            isActive ? "text-secondary-foreground" : "text-foreground/40 group-hover:text-foreground"
                        )}
                    />
                ) : null}

                {/* Badge on icon */}
                {showCount ? (
                    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-[3px] bg-red-500 text-white text-[8px] font-black rounded-full border border-card flex items-center justify-center tabular-nums leading-none shadow-[0_0_6px_rgba(239,68,68,0.5)]">
                        {countLabel}
                    </span>
                ) : hasNotification ? (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-card shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                ) : null}
            </div>

            <span
                className={cn(
                    "whitespace-nowrap overflow-hidden transition-all duration-150 ease-out text-base",
                    isActive ? "font-black text-foreground" : "font-semibold text-foreground",
                    showExpanded ? "opacity-100 w-auto ml-3" : "opacity-0 w-0 ml-0",
                    isActive ? "text-secondary-foreground" : "text-foreground"
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
