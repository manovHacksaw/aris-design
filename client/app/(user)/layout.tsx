"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import BrandPreviewBanner from "@/components/brand/BrandPreviewBanner";
import BottomNav from "@/components/BottomNav";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BrandPreviewBanner />
      {children}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
