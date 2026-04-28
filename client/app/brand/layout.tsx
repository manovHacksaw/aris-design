"use client";

import BrandSidebar from "@/components/brand/BrandSidebar";
import BrandMobileHeader from "@/components/brand/BrandMobileHeader";
import BrandBottomNav from "@/components/brand/BrandBottomNav";
import AuthGuard from "@/components/auth/AuthGuard";
import { usePathname } from "next/navigation";

export default function BrandDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isPendingPage = pathname === "/brand/pending";

    // Public brand profile — no auth guard, no brand chrome
    const isBrandPublicProfile = /^\/brand\/(?!dashboard|events|create-event|wallet|settings|analytics|insights|milestones|financials|notifications|pending)([\w-]+)$/.test(pathname);
    if (isBrandPublicProfile) {
        return <>{children}</>;
    }

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background flex">
                {!isPendingPage && <BrandSidebar />}
                <div className="flex-1 flex flex-col min-h-screen relative w-full">
                    {/* Mobile Header */}
                    {!isPendingPage && <BrandMobileHeader />}

                    <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
                        {children}
                    </main>

                    {/* Mobile Bottom Nav */}
                    {!isPendingPage && <BrandBottomNav />}
                </div>
            </div>
        </AuthGuard>
    );
}
