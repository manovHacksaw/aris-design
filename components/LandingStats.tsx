"use client";

import { motion } from "framer-motion";

export default function LandingStats() {
    const stats = [
        { value: "500+", label: "Brands on Aris" },
        { value: "10,000+", label: "Active Creators" },
        { value: "$2.4M+", label: "Paid to Users" },
    ];

    return (
        <div className="flex flex-col gap-12 py-8 px-6 lg:px-0">
            {stats.map((stat, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center lg:items-end text-center lg:text-right"
                >
                    <div className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                        {stat.value}
                    </div>
                    <div className="text-sm md:text-base text-foreground/60 font-medium uppercase tracking-wide mt-1">
                        {stat.label}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
