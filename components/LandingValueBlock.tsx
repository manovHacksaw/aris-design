"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function LandingValueBlock() {
    const benefits = [
        "Real engagement",
        "Fair rewards",
        "Creative freedom",
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative w-full h-full min-h-[400px] flex flex-col justify-between p-8 md:p-10 rounded-[2.5rem] bg-[#1A1B1F] border border-primary/20 shadow-[0_10px_30px_rgba(0,0,0,0.25)] overflow-hidden"
        >
            {/* Background Gradient/Ambience */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full w-fit mb-6 border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-medium text-primary-light tracking-wide uppercase">
                    Trusted by creators
                </span>
            </div>

            {/* Main Content */}
            <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">
                    From Views <br />
                    <span className="text-primary">to Value</span>
                </h2>

                <ul className="space-y-4">
                    {benefits.map((benefit, index) => (
                        <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className="flex items-center gap-3 text-lg text-gray-300 font-medium"
                        >
                            <CheckCircle2 className="w-5 h-5 text-accent" />
                            {benefit}
                        </motion.li>
                    ))}
                </ul>
            </div>

            {/* Bottom Visual Element or Illustration could go here, keeping it minimal for now per reference */}
            <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-sm text-gray-500">
                    Join the ecosystem where attention pays off.
                </p>
            </div>
        </motion.div>
    );
}
