import AuthGuard from "@/components/auth/AuthGuard";
import BrandPreviewBanner from "@/components/brand/BrandPreviewBanner";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BrandPreviewBanner />
      {children}
    </AuthGuard>
  );
}
