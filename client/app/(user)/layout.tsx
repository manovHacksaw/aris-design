"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import BrandPreviewBanner from "@/components/brand/BrandPreviewBanner";
import BottomNav from "@/components/BottomNav";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BrandPreviewBanner />
      <div className="pb-16 md:pb-0">
        {children}
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
