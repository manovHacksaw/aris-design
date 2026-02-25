"use client";

import SidebarMore from "@/components/sidebar/SidebarMore";
import SidebarButton from "@/components/sidebar/SidebarButton";
import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export default function SidebarFooter() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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
    </div>
  );
}
