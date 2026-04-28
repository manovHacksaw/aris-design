import { EventStatus, UserEventState } from "@/types/events";

export const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

export function getMediaUrl(cidOrUrl: string | undefined | null): string {
    if (!cidOrUrl) return "";
    if (cidOrUrl.startsWith("http")) return cidOrUrl;
    return `${PINATA_GW}/${cidOrUrl}`;
}

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

export function formatCount(n: number | undefined | null): string {
    if (n == null || isNaN(n)) return "0";
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
}

export function formatTimeRemaining(endTime: string | Date | null | undefined): string {
    if (!endTime) return "Ended";
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
}

/**
 * Calculates sum of all reward pools for an event
 */
export function calculateTotalPool(event: any): number {
    const baseReward = event.baseReward || 0;
    const capacity = event.capacity || 0;
    const topReward = event.topReward || 0;
    const leaderboardPool = event.leaderboardPool || 0;
    return (baseReward * capacity) + topReward + leaderboardPool;
}

/**
 * Generates a URL-friendly slug from a brand name
 */
export function toBrandSlug(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
