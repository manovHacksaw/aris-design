"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import LandingVisual from "./LandingVisual";

export default function LandingHero() {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full relative z-10 pt-10 pb-0">

            {/* Text Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl mx-auto px-4 mb-12"
            >
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
                    Turn Attention <br />
                    Into Note <span className="text-primary">Real Money</span>
                </h1>

                <p className="text-lg md:text-xl text-foreground/60 max-w-lg mx-auto mb-8 font-medium leading-relaxed">
                    Watch ads, create posts, vote — and get paid for engagement.
                </p>

                <Link href="/register">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 bg-secondary text-white rounded-full text-lg font-semibold hover:bg-secondary/90 transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.25)] shadow-secondary/20"
                    >
                        Get Started
                    </motion.button>
                </Link>
            </motion.div>

            {/* Center Visual Component */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-[400px] flex justify-center perspective-1000"
            >
                <LandingVisual />
            </motion.div>

        </div>
    );
}
