"use client";

import { useSidebar } from "@/context/SidebarContext";
import { ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { useWallet } from "@/context/WalletContext";

interface SidebarProfileProps {
  forceExpanded?: boolean;
}

export default function SidebarProfile({ forceExpanded }: SidebarProfileProps) {
  const { isCollapsed } = useSidebar();
  const showExpanded = !isCollapsed || forceExpanded;
  const { user } = useUser();
  const { isConnected, userInfo } = useWallet();

  const displayName = user?.displayName || userInfo?.name || "Guest";
  const username = user?.username || userInfo?.email?.split("@")[0] || "user";
  const avatarUrl = user?.avatarUrl || userInfo?.profileImage || null;

  if (!isConnected) {
    return (
      <Link
        href="/register"
        className={cn(
          "flex items-center rounded-xl overflow-hidden transition-all duration-300",
          "hover:bg-gray-100 dark:hover:bg-secondary group",
          showExpanded ? "w-full px-3 py-2" : "w-10 h-10 justify-center p-0 mx-auto"
        )}
      >
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
            <User className="w-4 h-4 text-foreground/40" />
          </div>
        </div>
        <div className={cn(
          "flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out",
          showExpanded ? "opacity-100 max-w-[200px] ml-3" : "opacity-0 max-w-0 ml-0"
        )}>
          <p className="text-sm font-medium text-[#E5E7EB] truncate">Sign in</p>
          <p className="text-[11px] text-[#9CA3AF] truncate">Connect wallet</p>
        </div>
      </Link>
    );
  }

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
        {avatarUrl ? (
          <img
            className="w-8 h-8 rounded-full object-cover border border-border bg-background"
            src={avatarUrl}
            alt={displayName}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary text-xs font-bold uppercase">
              {displayName.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] border-2 border-card rounded-full" />
      </div>

      {/* Name + handle */}
      <div className={cn(
        "flex-1 min-w-0 flex items-center justify-between overflow-hidden transition-all duration-300 ease-in-out",
        showExpanded ? "opacity-100 max-w-[200px] ml-3" : "opacity-0 max-w-0 ml-0"
      )}>
        <div className="min-w-0 pr-2">
          <p className="text-sm font-medium text-[#E5E7EB] truncate group-hover:text-black dark:group-hover:text-white transition-colors">
            {displayName}
          </p>
          <p className="text-[11px] text-[#9CA3AF] truncate group-hover:text-gray-600 dark:group-hover:text-[#CBD5F5] transition-colors">
            @{username}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-all duration-200" />
      </div>
    </Link>
  );
}
