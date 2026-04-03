"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PremiumEventCard from "@/components/events/PremiumEventCard";
import { cn } from "@/lib/utils";

interface EventRowProps {
    title: string;
    events: any[];
}

export default function EventRow({ title, events }: EventRowProps) {
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

    if (!events || events.length === 0) return null;

    return (
        <div className="space-y-4 group/row relative">
            <h3 className="text-xl font-black text-foreground uppercase tracking-widest pl-4 sm:pl-0">
                {title}
            </h3>

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
                    className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pl-4 sm:pl-0 pr-4 sm:pr-0 pb-4"
                    onScroll={(e) => setIsMoved(e.currentTarget.scrollLeft > 0)}
                >
                    {events.map((ev, i) => (
                        <div key={ev.id || i} className="shrink-0 w-[320px] sm:w-[380px] transition-transform duration-300 hover:z-10 relative object-center group-hover/row:hover:scale-105">
                            <PremiumEventCard event={ev} />
                        </div>
                    ))}
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
