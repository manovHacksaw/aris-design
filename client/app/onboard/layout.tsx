import AuthGuard from "@/components/auth/AuthGuard";

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
