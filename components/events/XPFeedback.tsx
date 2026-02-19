"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface XPFeedbackProps {
    xp: number;
    reward?: string;
    streak?: number;
    show: boolean;
    onComplete?: () => void;
}

export default function XPFeedback({ xp, reward, streak, show, onComplete }: XPFeedbackProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                onComplete?.();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex flex-col items-center gap-1 pointer-events-none"
                >
                    <span className="text-lg font-black text-primary tracking-tight">
                        +{xp} XP
                    </span>
                    {reward && (
                        <span className="text-xs font-bold text-foreground/60">
                            Earned {reward}
                        </span>
                    )}
                    {streak && streak > 1 && (
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                            {streak} day streak
                        </span>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
