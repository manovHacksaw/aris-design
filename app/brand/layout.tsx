import BrandSidebar from "@/components/brand/BrandSidebar";
import BrandMobileHeader from "@/components/brand/BrandMobileHeader";
import BrandBottomNav from "@/components/brand/BrandBottomNav";

export default function BrandDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex">
            <BrandSidebar />
            <div className="flex-1 flex flex-col min-h-screen relative w-full">
                {/* Mobile Header */}
                <BrandMobileHeader />

                <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                <BrandBottomNav />
            </div>
        </div>
    );
}
