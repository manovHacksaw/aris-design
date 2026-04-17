"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownProps {
    targetDate: string | Date;
    label?: string;
    className?: string;
    onEnd?: () => void;
}

export default function Countdown({ targetDate, label, className, onEnd }: CountdownProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const targetTime = useMemo(() => new Date(targetDate).getTime(), [targetDate]);

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            const diff = Math.max(0, targetTime - now);
            setTimeLeft(diff);
            if (diff === 0 && onEnd) {
                onEnd();
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [targetTime, onEnd]);

    if (timeLeft <= 0) {
        return (
            <div className={cn("bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2", className)}>
                <Clock className="text-foreground/40 w-3.5 h-3.5" />
                <span className="text-xs font-black text-foreground/40 uppercase tracking-wider">Ended</span>
            </div>
        );
    }

    const seconds = Math.floor((timeLeft / 1000) % 60);
    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

    // Show seconds only when less than 1 day remaining
    const parts = [
        days > 0 ? `${days}D` : null,
        hours > 0 || days > 0 ? `${hours}H` : null,
        `${minutes}M`,
        days === 0 ? `${seconds}s` : null,
    ].filter(Boolean);

    return (
        <div className={cn("bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2", className)}>
            <Clock className="text-primary w-3.5 h-3.5 animate-pulse" />
            <div className="flex flex-col">
                {label && <span className="text-[8px] font-black text-foreground/50 uppercase tracking-[0.1em] leading-none mb-0.5">{label}</span>}
                <span className="text-xs font-black text-foreground font-mono leading-none">
                    {parts.join(" ")}
                </span>
            </div>
        </div>
    );
}
