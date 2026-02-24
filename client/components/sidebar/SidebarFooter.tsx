"use client";

import SidebarMore from "@/components/sidebar/SidebarMore";
import SidebarButton from "@/components/sidebar/SidebarButton";
import { cn } from "@/lib/utils";
import { IoMoonOutline, IoSunnyOutline, IoLogOutOutline } from "react-icons/io5";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SidebarFooter() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { disconnect, isConnected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleLogout = async () => {
    try {
      await disconnect();
      toast.success("Signed out successfully");
      router.push("/register");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Theme Toggle */}
      <SidebarButton
        label={theme === "dark" ? "Light Mode" : "Dark Mode"}
        icon={theme === "dark" ? IoSunnyOutline : IoMoonOutline}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      />

      {/* More Menu */}
      <SidebarMore />

      {/* Logout — only show when connected */}
      {isConnected && (
        <SidebarButton
          label="Log out"
          icon={IoLogOutOutline}
          onClick={handleLogout}
          isDestructive
        />
      )}
    </div>
  );
}
