"use client";

import { useSidebar } from "@/context/SidebarContext";
import { ChevronRight, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { useWallet } from "@/context/WalletContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

interface SidebarProfileProps {
  forceExpanded?: boolean;
}

export default function SidebarProfile({ forceExpanded }: SidebarProfileProps) {
  const { isCollapsed } = useSidebar();
  const showExpanded = !isCollapsed || forceExpanded;
  const { user } = useUser();
  const { isConnected, userInfo, disconnect } = useWallet();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const displayName = user?.displayName || userInfo?.name || "Guest";
  const username = user?.username || userInfo?.email?.split("@")[0] || "user";
  const avatarUrl = user?.avatarUrl || userInfo?.profileImage || null;

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (signingOut) return;
    setSigningOut(true);
    try {
      await disconnect();
      toast.success("Signed out successfully");
      router.push("/register");
    } catch {
      toast.error("Failed to sign out");
      setSigningOut(false);
    }
  };

  if (!isConnected) {
    return (
      <Link
        href="/register"
        className={cn(
          "flex items-center rounded-xl overflow-hidden transition-all duration-300",
          "hover:bg-surface-hover group",
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
          <p className="text-sm font-medium text-foreground/80 truncate">Sign in</p>
          <p className="text-[11px] text-foreground/40 truncate">Connect wallet</p>
        </div>
      </Link>
    );
  }

  // Collapsed: show avatar with a logout button stacked below
  if (isCollapsed && !forceExpanded) {
    return (
      <div className="flex flex-col items-center gap-1">
        {/* Profile link */}
        <Link
          href="/profile"
          className="group relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
          title={displayName}
        >
          {avatarUrl ? (
            <img className="w-8 h-8 rounded-full object-cover border border-border bg-background" src={avatarUrl} alt={displayName} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary text-xs font-bold uppercase">{displayName.charAt(0)}</span>
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] border-2 border-card rounded-full" />
          {/* Tooltip */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-card text-foreground text-xs rounded-[8px] shadow-spotify opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none font-bold">
            {displayName}
          </div>
        </Link>

        {/* Logout icon */}
        <button
          onClick={handleLogout}
          disabled={signingOut}
          title="Sign out"
          className="group relative w-10 h-10 flex items-center justify-center rounded-xl text-foreground/30 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          <LogOut className="w-4 h-4" />
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-card text-foreground text-xs rounded-[8px] shadow-spotify opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none font-bold">
            Sign out
          </div>
        </button>
      </div>
    );
  }

  // Expanded: profile row with logout button revealed on hover
  return (
    <div className="group/profile relative flex items-center w-full px-3 py-2 rounded-xl hover:bg-secondary transition-colors duration-200">
      <Link href="/profile" className="flex items-center flex-1 min-w-0">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img className="w-8 h-8 rounded-full object-cover border border-border bg-background" src={avatarUrl} alt={displayName} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary text-xs font-bold uppercase">{displayName.charAt(0)}</span>
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] border-2 border-card rounded-full" />
        </div>

        {/* Name + handle */}
        <div className="flex-1 min-w-0 ml-3 pr-2">
          <p className="text-sm font-medium text-foreground/80 truncate group-hover/profile:text-foreground transition-colors">
            {displayName}
          </p>
          <p className="text-[11px] text-foreground/40 truncate">
            @{username}
          </p>
        </div>
      </Link>

      {/* Logout button — visible on hover */}
      <button
        onClick={handleLogout}
        disabled={signingOut}
        title="Sign out"
        className={cn(
          "flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg",
          "text-foreground/20 hover:text-red-400 hover:bg-red-400/10",
          "opacity-0 group-hover/profile:opacity-100",
          "transition-all duration-150 disabled:pointer-events-none"
        )}
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
