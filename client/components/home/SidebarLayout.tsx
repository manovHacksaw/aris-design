"use client";

import { Suspense } from "react";
import { useSidebar } from "@/context/SidebarContext";
import Sidebar from "@/components/home/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import BrandPreviewBanner from "@/components/brand/BrandPreviewBanner";
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
                <Suspense>
                    <BrandPreviewBanner />
                </Suspense>
                <MobileHeader />

                {/* Content wrapper - Responsive padding and container sizing */}
                <div className="flex-1 w-full max-w-[1600px] mx-auto pt-3 px-0 md:pt-4 lg:pt-6 md:px-6 lg:px-8">
                    <div className="px-3 sm:px-4 md:px-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
