"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface RoleCardProps {
    title: string;
    description: string;
    isSelected: boolean;
    onClick: () => void;
    delay?: number;
}

export function RoleCard({
    title,
    description,
    isSelected,
    onClick,
    delay = 0
}: RoleCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{
                opacity: 1,
                y: 0,
                backgroundColor: isSelected ? "#ffffff" : "#0E0F13",
                borderColor: isSelected ? "#ffffff" : "#1E2128",
                boxShadow: isSelected ? "0px 10px 40px -10px rgba(0,0,0,0.15)" : "0px 0px 0px rgba(0,0,0,0)",
            }}
            whileHover={{
                backgroundColor: isSelected ? "#ffffff" : "#111217",
                scale: 1.005, // Subtle lift
                transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
            transition={{
                type: "spring",
                stiffness: 350,
                damping: 25
            }}
            onClick={onClick}
            className={clsx(
                "relative p-6 rounded-[22px] border cursor-pointer select-none flex items-start gap-4 overflow-hidden"
            )}
        >
            <div className="flex-1 space-y-1 relative z-10">
                <motion.h3
                    animate={{ color: isSelected ? "#000000" : "#ffffff" }}
                    className="text-lg font-bold tracking-tight"
                >
                    {title}
                </motion.h3>

                <motion.p
                    animate={{ color: isSelected ? "#4B5563" : "rgba(255,255,255,0.5)" }}
                    className="text-sm leading-relaxed font-normal"
                >
                    {description}
                </motion.p>
            </div>

            {/* Indicator: Radio Button Style */}
            <div className="flex-shrink-0 pt-0.5 relative z-10">
                <motion.div
                    animate={{
                        borderColor: isSelected ? "#7A83FF" : "rgba(255,255,255,0.2)"
                    }}
                    className="w-6 h-6 rounded-full border-[2.5px] flex items-center justify-center bg-transparent"
                >
                    {isSelected && (
                        <motion.div
                            layoutId="radio-indicator"
                            className="w-3 h-3 rounded-full bg-[#7A83FF]"
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30
                            }}
                        />
                    )}
                </motion.div>
            </div>

        </motion.div>
    );
}
