"use client";

import Link from "next/link";
import { Users, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/eventUtils";

interface ExploreEvent {
    id: string;
    title: string;
    image?: string;
    imageUrl?: string;
    imageCid?: string;
    status: string; // raw: "posting" | "voting" | "scheduled" | "completed" | "draft"
    eventType: string;
    baseReward?: number;
    topReward?: number;
    leaderboardPool?: number;
    participationCount?: number;
    _count?: { submissions: number; votes: number };
    brand: { id?: string; name: string; logoUrl?: string; logoCid?: string } | null;
    timeRemaining?: string;
}

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function statusDot(status: string) {
    if (status === "posting") return { dot: "bg-lime-400 animate-pulse", label: "Live · Post", text: "text-lime-400" };
    if (status === "voting") return { dot: "bg-blue-400 animate-pulse", label: "Live · Vote", text: "text-blue-400" };
    if (status === "scheduled") return { dot: "bg-yellow-400", label: "Upcoming", text: "text-yellow-400" };
    if (status === "completed") return { dot: "bg-red-400/60", label: "Closed", text: "text-red-400/70" };
    return { dot: "bg-white/15", label: status, text: "text-white/25" };
}

export default function ExploreEventCard({ event }: { event: ExploreEvent | any }) {
    const sc = statusDot(event.status || "draft");
    const logoSrc = event.brand?.logoUrl || (event.brand?.logoCid ? `${PINATA_GW}/${event.brand.logoCid}` : null);
    const hasBase = (event.baseReward ?? 0) > 0;
    const hasTop = (event.topReward ?? 0) > 0 || (event.leaderboardPool ?? 0) > 0;
    const topVal = event.topReward ?? event.leaderboardPool ?? 0;

    const displayImage = event.image || event.imageUrl || (event.imageCid ? `${PINATA_GW}/${event.imageCid}` : "");
    const pCount = event.participationCount ?? (
        event.eventType === "vote_only"
            ? (event._count?.votes || 0)
            : ((event._count?.submissions || 0) + (event._count?.votes || 0))
    );

    return (
        <Link href={`/events/${event.id}`} className="block group">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] hover:border-white/[0.14] transition-all duration-200 bg-[#0d0d10]">
                {/* Image — 3:2 aspect */}
                <div className="relative w-full aspect-[3/2] overflow-hidden">
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                    ) : (
                        <div className="w-full h-full bg-white/[0.04]" />
                    )}

                    {/* Gradient — lighter than before */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {/* TOP LEFT — status */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.08]">
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", sc.text)}>
                            {sc.label}
                        </span>
                    </div>

                    {/* TOP RIGHT — reward pills */}
                    {(hasBase || hasTop) && (
                        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                            {hasTop && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/15 backdrop-blur-sm border border-yellow-400/40 text-[9px] font-black text-yellow-300">
                                    <Trophy className="w-2.5 h-2.5" />
                                    ${topVal.toLocaleString()}
                                </span>
                            )}
                            {hasBase && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-blue-400/20 text-[9px] font-black text-blue-300/70">
                                    <Zap className="w-2.5 h-2.5" />
                                    ${event.baseReward?.toFixed(2)} each
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* BOTTOM content */}
                <div className="p-3 space-y-2">
                    <h3 className="text-[13px] font-semibold text-white/90 leading-snug line-clamp-1 group-hover:text-white transition-colors">
                        {event.title}
                    </h3>

                    <div className="flex items-center justify-between">
                        {/* Brand */}
                        <Link
                            href={event.brand ? `/brand/${event.brand.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}` : "#"}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity"
                        >
                            <div className="w-4 h-4 rounded-full border border-white/10 bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {logoSrc ? (
                                    <img src={logoSrc} alt={event.brand?.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[7px] font-black text-white/30">
                                        {(event.brand?.name ?? "?")[0]}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-semibold text-white/40 truncate">
                                {event.brand?.name ?? "Unknown"}
                            </span>
                        </Link>

                        {/* Participants */}
                        <div className="flex items-center gap-1 text-white/25 flex-shrink-0">
                            <Users className="w-3 h-3" />
                            <span className="text-[10px] font-bold">
                                {formatCount(pCount)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
