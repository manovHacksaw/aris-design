"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Award } from "lucide-react";
import Link from "next/link";
import { toBrandSlug } from "@/lib/eventUtils";
import type { Event } from "@/services/event.service";
import PremiumEventCard from "@/components/events/PremiumEventCard";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

type BrandEvent = Event & {
    brand?: Event["brand"] & {
        categories?: string[];
    };
};

interface BrandRowProps {
    brand: {
        id?: string;
        name: string;
        tagline?: string;
        logoUrl?: string;
        logoCid?: string;
        liveRewardSize?: number;
        categories?: string[];
        events: BrandEvent[];
    };
}

export default function BrandRow({ brand }: BrandRowProps) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [isMoved, setIsMoved] = useState(false);

    const handleScroll = (direction: "left" | "right") => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current;
            const scrollTo = direction === "left" ? scrollLeft - clientWidth + 40 : scrollLeft + clientWidth - 40;
            rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
            setIsMoved(scrollTo > 0);
        }
    };

    if (!brand.events || brand.events.length === 0) return null;

    const logo = brand.logoUrl || (brand.logoCid ? `${PINATA_GW}/${brand.logoCid}` : "");

    return (
        <div className="space-y-4 group/row relative pt-4 border-t border-border/50 first:border-0 first:pt-0">
            <div className="flex items-center justify-between pl-4 sm:pl-0 pr-4 sm:pr-0">
                <Link 
                    href={`/brand/${toBrandSlug(brand.name)}`}
                    className="flex items-center gap-3 group/brand-link"
                >
                    <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-border flex items-center justify-center overflow-hidden transition-all group-hover/brand-link:border-primary/40 group-hover/brand-link:bg-foreground/[0.08]">
                        {logo ? (
                            <img src={logo} alt={brand.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-black text-foreground/30">{brand.name[0]}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-foreground capitalize tracking-wider leading-none transition-colors group-hover/brand-link:text-primary">
                            {brand.name}
                        </h3>
                        {brand.tagline && (
                            <p className="text-[10px] text-foreground/40 font-semibold capitalize tracking-wider mt-1">
                                {brand.tagline}
                            </p>
                        )}
                    </div>
                </Link>

                <div className="shrink-0 flex items-center gap-1.5 bg-lime-400/10 text-lime-400 border border-lime-400/20 px-3 py-1.5 rounded-full text-[10px] font-black capitalize tracking-wider">
                    <Award className="w-3.5 h-3.5" />
                    <span>Total Rewards: ${brand.liveRewardSize?.toFixed(2) || 0}</span>
                </div>
            </div>

            <div className="relative">
                {/* Left control */}
                {isMoved && (
                    <button
                        onClick={() => handleScroll("left")}
                        className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-gradient-to-r from-background to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
                    >
                        <div className="bg-background/80 p-1.5 rounded-full border border-border backdrop-blur-sm text-foreground hover:bg-white hover:text-black transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </div>
                    </button>
                )}

                {/* Container */}
                <div
                    ref={rowRef}
                    className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pl-4 sm:pl-0 pr-4 sm:pr-0 pb-4 pt-2"
                    onScroll={(e) => setIsMoved(e.currentTarget.scrollLeft > 0)}
                >
                    {brand.events.map((ev, i) => {
                        const evtWithBrand = { ...ev, brand: { name: brand.name, logoUrl: brand.logoUrl, logoCid: brand.logoCid, categories: brand.categories } };
                        return (
                            <div key={ev.id || i} className="shrink-0 w-[260px] sm:w-[320px] lg:w-[420px] transition-transform duration-300 hover:z-10 relative object-center group-hover/row:hover:scale-105">
                                <PremiumEventCard event={evtWithBrand} />
                            </div>
                        );
                    })}
                </div>

                {/* Right control */}
                <button
                    onClick={() => handleScroll("right")}
                    className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-gradient-to-l from-background to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity hidden sm:flex"
                >
                    <div className="bg-background/80 p-1.5 rounded-full border border-border backdrop-blur-sm text-foreground hover:bg-white hover:text-black transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </button>
            </div>
        </div>
    );
}
