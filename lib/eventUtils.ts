import { EventStatus, UserEventState } from "@/types/events";

export function getStatusStyles(status: EventStatus, userState?: UserEventState) {
    const base = {
        borderClass: "border-border",
        bgTint: "",
        ctaEnabled: true,
        badgeVariant: "default" as const,
    };

    // User state overrides
    if (userState === "won") {
        return {
            ...base,
            borderClass: "border-primary/60",
            bgTint: "bg-primary/[0.02]",
            ctaEnabled: false,
            badgeVariant: "won" as const,
        };
    }

    if (userState === "participated") {
        return {
            ...base,
            borderClass: "border-primary/30",
            bgTint: "bg-primary/[0.01]",
            ctaEnabled: false,
            badgeVariant: "participated" as const,
        };
    }

    switch (status) {
        case "live":
            return {
                ...base,
                borderClass: "border-emerald-500/30",
                bgTint: "",
                badgeVariant: "live" as const,
            };
        case "ending_soon":
            return {
                ...base,
                borderClass: "border-amber-500/30",
                bgTint: "bg-amber-500/[0.02]",
                badgeVariant: "ending_soon" as const,
            };
        case "ended":
            return {
                ...base,
                borderClass: "border-border/50",
                bgTint: "opacity-80",
                ctaEnabled: false,
                badgeVariant: "ended" as const,
            };
        case "upcoming":
            return {
                ...base,
                borderClass: "border-primary/20",
                bgTint: "",
                ctaEnabled: false,
                badgeVariant: "upcoming" as const,
            };
        default:
            return base;
    }
}

export function formatCount(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
}
