"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FinancialsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/brand/wallet");
    }, [router]);

    return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-10 w-48 bg-secondary/60 rounded-xl" />
                <div className="h-4 w-64 bg-secondary/40 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-64 bg-card border border-border/60 rounded-[28px]" />
                <div className="h-64 bg-card border border-border/60 rounded-[28px]" />
            </div>
        </div>
    );
}
