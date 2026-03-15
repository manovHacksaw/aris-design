"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { IoEyeOutline, IoArrowBackOutline } from "react-icons/io5";

export default function BrandPreviewBanner() {
    const { user } = useUser();
    const router = useRouter();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(sessionStorage.getItem("brand_preview_mode") === "true");
    }, []);

    const isBrand = user?.role === "BRAND_OWNER";
    if (!visible || !isBrand) return null;

    function exitPreview() {
        sessionStorage.removeItem("brand_preview_mode");
        router.push("/brand/dashboard");
    }

    return (
        <>
            {/* Transparent intercept layer — blocks all pointer events on page content */}
            <div
                className="fixed inset-0 z-40"
                style={{ cursor: "not-allowed" }}
                onClickCapture={(e) => e.stopPropagation()}
                onPointerDownCapture={(e) => e.stopPropagation()}
            />

            {/* Banner */}
            <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500 shadow-lg">
                <div className="flex items-center gap-2 text-amber-950">
                    <IoEyeOutline size={16} className="shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wide">Brand Preview</span>
                    <span className="hidden sm:inline text-xs text-amber-900/70 font-medium">
                        · Viewing as user — all actions are disabled
                    </span>
                </div>
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/15 hover:bg-amber-950/25 text-amber-950 text-xs font-black transition-colors shrink-0"
                    style={{ pointerEvents: "all" }}
                    onClickCapture={(e) => { e.stopPropagation(); exitPreview(); }}
                >
                    <IoArrowBackOutline size={13} />
                    Back to Dashboard
                </button>
            </div>

            {/* Spacer so page content isn't hidden under the banner */}
            <div className="h-10 shrink-0" />
        </>
    );
}
