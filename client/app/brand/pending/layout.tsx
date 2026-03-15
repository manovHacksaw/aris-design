// Standalone layout — overrides brand/layout.tsx so the sidebar is NOT rendered
// on the pending approval page.
export default function BrandPendingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
