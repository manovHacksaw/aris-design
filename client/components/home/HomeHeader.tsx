"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
   Sparkle Particle System  (Aceternity-inspired)
───────────────────────────────────────────────────────── */
interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
}

function SparkleCanvas() {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const p: Particle[] = Array.from({ length: 28 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 4,
            opacity: Math.random() * 0.5 + 0.1,
        }));
        setParticles(p);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-lime-400"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
                    animate={{ y: [0, -30, 0], opacity: [0, p.opacity, 0], scale: [0.5, 1, 0.5] }}
                    transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
                />
            ))}
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-lime-500/[0.08] rounded-full blur-3xl" />
            <div className="absolute -top-8 right-1/3 w-48 h-48 bg-lime-400/[0.05] rounded-full blur-3xl" />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
   Shimmer Gradient Word
───────────────────────────────────────────────────────── */
function ShimmerWord({ children }: { children: string }) {
    return (
        <span className="bg-gradient-to-r from-lime-300 via-green-300 to-lime-400 bg-clip-text text-transparent">
            {children}
        </span>
    );
}

/* ─────────────────────────────────────────────────────────
   Animated Headline — word-by-word blur-fade reveal
───────────────────────────────────────────────────────── */
const HEADLINE_LINES = ["PARTICIPATE IN", "EVENTS. EARN", "DOLLARS."];

function AnimatedHeadline() {
    const container = {
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
    };
    const word = {
        hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
        show: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
    };

    return (
        <motion.h1
            variants={container}
            initial="hidden"
            animate="show"
            className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] leading-[0.92] tracking-tight text-white uppercase"
        >
            {HEADLINE_LINES.map((line, li) => (
                <span key={li} className="block">
                    {line.split(" ").map((w, wi) => (
                        <motion.span key={wi} variants={word} className="inline-block mr-[0.22em]">
                            {li === 2 && wi === 0 ? <ShimmerWord>{w}</ShimmerWord> : w}
                        </motion.span>
                    ))}
                </span>
            ))}
        </motion.h1>
    );
}

/* ─────────────────────────────────────────────────────────
   Main Export
───────────────────────────────────────────────────────── */
export default function HomeHeader() {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="space-y-8 mb-8">

            {/* ── HERO BLOCK ── */}
            <div className="relative rounded-3xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
                <SparkleCanvas />

                {/* Dot grid */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.025]"
                    style={{
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                    }}
                />

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/70 to-transparent pointer-events-none" />

                <div className="relative z-10 px-6 pt-8 pb-8 sm:px-8">
                    <div className="mb-3">
                        <AnimatedHeadline />
                    </div>

                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.5 }}
                        className="text-sm text-white/40 font-medium max-w-xs leading-relaxed"
                    >
                        Earn{" "}
                        <span className="text-white font-bold">3 cents</span>{" "}
                        for every vote you cast. Vote mindfully — higher rewards go to those who align with the crowd.
                    </motion.p>
                </div>
            </div>

            {/* ── SEARCH BAR ── */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.35 }}
                className="relative group max-w-3xl"
            >
                <div className="absolute -inset-px bg-gradient-to-r from-lime-400/20 via-green-400/15 to-lime-400/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm pointer-events-none" />
                <div className="relative flex items-center bg-white/[0.03] border border-white/[0.08] group-focus-within:border-lime-400/35 rounded-2xl transition-all duration-300">
                    <Search className="absolute left-5 w-4 h-4 text-white/20 group-focus-within:text-lime-400 transition-colors duration-300 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search events, brands, or categories..."
                        className="w-full bg-transparent py-4 pl-12 pr-6 text-sm font-medium text-white placeholder:text-white/20 outline-none"
                    />
                </div>
            </motion.div>

        </div>
    );
}
