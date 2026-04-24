"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ArisSelectProps {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder: string;
    minWidth?: string;
}

export function ArisSelect({ value, onChange, options, placeholder, minWidth = "150px" }: ArisSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
            });
        }
    }, [isOpen]);

    return (
        <div className="relative shrink-0" style={{ minWidth }}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:border-white/20 rounded-md pl-3 pr-2.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer backdrop-blur-md",
                    isOpen && "border-primary/40 bg-white/[0.05] text-white"
                )}
            >
                <span className="truncate mr-1.5">{value === "ALL" || value === "TRENDING" ? placeholder : value}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform duration-300 text-white/20 shrink-0", isOpen ? "rotate-180 text-white" : "")}><path d="m6 9 6 6 6-6" /></svg>
            </button>

            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-[998]" onClick={() => setIsOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                style={{ top: dropdownStyle.top, left: dropdownStyle.left, minWidth: dropdownStyle.width }}
                                className="fixed bg-[#0a0a0c] border border-white/20 rounded-xl overflow-hidden z-[999] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                            >
                                <div className="max-h-[300px] overflow-y-auto no-scrollbar py-2">
                                    {options.map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                onChange(opt);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-all border-l-2",
                                                (value === opt)
                                                    ? "bg-white/10 border-primary text-white"
                                                    : "border-transparent text-white/40 hover:bg-white/5 hover:text-white hover:border-white/20"
                                            )}
                                        >
                                            {opt === "ALL" || opt === "TRENDING" ? placeholder : opt}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
