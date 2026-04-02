"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BrandInsightsRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/brand/dashboard");
    }, [router]);
    return null;
}
