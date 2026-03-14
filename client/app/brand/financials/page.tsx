"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function FinancialsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/brand/wallet");
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
    );
}
