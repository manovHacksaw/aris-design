"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { IoEyeOutline, IoArrowBackOutline } from "react-icons/io5";

export default function BrandPreviewBanner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    if (searchParams.get("preview") !== "brand") return null;

    return (
        <div className="sticky top-0 z-[60] w-full bg-amber-500/95 backdrop-blur-sm border-b border-amber-600/30 shadow-sm">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-amber-950">
                    <IoEyeOutline size={16} className="shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wide">
                        Brand Preview — View Only
                    </span>
                    <span className="hidden sm:inline text-xs text-amber-800/80 font-medium">
                        · You are viewing the user experience. No actions will be saved.
                    </span>
                </div>

                <button
                    onClick={() => router.push("/brand/dashboard")}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/10 hover:bg-amber-950/20 text-amber-950 rounded-full text-xs font-bold transition-colors whitespace-nowrap"
                >
                    <IoArrowBackOutline size={13} />
                    Back to Brand Portal
                </button>
            </div>
        </div>
    );
}
