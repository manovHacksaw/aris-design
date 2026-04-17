"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface HeroPreviewPanelProps {
    events: any[];
}

function getEventImage(event: any): string | null {
    if (event.sampleUrls?.length) {
        return event.sampleUrls[0].urls?.medium || event.sampleUrls[0].urls?.thumbnail || null;
    }
    if (event.imageCid) return `${PINATA_GW}/${event.imageCid}`;
    if (event.imageUrl) return event.imageUrl;
    return null;
}

export default function HeroPreviewPanel({ events }: HeroPreviewPanelProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const images = events
        .map(getEventImage)
        .filter((img): img is string => img !== null)
        .slice(0, 8);

    const [current, setCurrent] = useState(0);

    const advance = useCallback(() => {
        setCurrent((prev) => (prev + 1) % Math.max(images.length, 1));
    }, [images.length]);

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(advance, 4000);
        return () => clearInterval(timer);
    }, [advance, images.length]);

    if (images.length === 0) {
        return (
            <div
                className="w-full h-full rounded-2xl flex items-center justify-center border overflow-hidden relative"
                style={isDark
                    ? { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
                    : { background: "linear-gradient(135deg, #E4EDE0 0%, #E6EBF7 50%, #EDE6F9 100%)", borderColor: "rgba(0,0,0,0.07)" }
                }
            >
                {!isDark && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
                            backgroundSize: "18px 18px",
                        }}
                    />
                )}
                <p className={`text-[10px] font-medium uppercase tracking-wider relative z-10 ${isDark ? "text-white/20" : "text-black/25"}`}>
                    No previews yet
                </p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-[240px] rounded-2xl overflow-hidden bg-surface border border-surface-border">
            <AnimatePresence mode="wait">
                <motion.img
                    key={images[current]}
                    src={images[current]}
                    alt="Recent creation"
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                />
            </AnimatePresence>

            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {/* Progress dots */}
            {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === current
                                    ? "bg-white/80 w-4"
                                    : "bg-white/25 hover:bg-white/40"
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
