"use client";

import { useSidebar } from "@/context/SidebarContext";
import Sidebar from "@/components/home/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { cn } from "@/lib/utils";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen font-sans selection:bg-[#8B8CF8]/30 bg-background">
            <Sidebar />

            <div
                className={cn(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    isCollapsed ? "md:ml-[72px]" : "md:ml-[220px]"
                )}
            >
                <MobileHeader />

                {/* Content wrapper - Removed mobile horizontal padding for edge-to-edge feel if needed */}
                <div className="flex-1 w-full max-w-[1400px] mx-auto pt-4 px-0 md:px-8">
                    <div className="px-4 md:px-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
