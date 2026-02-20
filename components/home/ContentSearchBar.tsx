"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ContentSearchBar({ className, value, onChange }: { className?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div
            className={cn(
                "w-full bg-secondary rounded-full flex items-center px-5 py-3.5 group transition-all duration-200 hover:bg-secondary/80 focus-within:bg-secondary/80",
                className
            )}
        >
            <Search className="w-5 h-5 text-foreground/50 mr-3 group-focus-within:text-foreground transition-colors" />
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder="Search creators, challenges, or tags..."
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-foreground/40 text-sm md:text-base font-bold"
            />
            <div className="hidden md:flex items-center gap-1.5 ml-2">
                <span className="text-[10px] bg-secondary text-foreground/40 px-1.5 py-0.5 rounded border border-border font-black">⌘</span>
                <span className="text-[10px] bg-secondary text-foreground/40 px-1.5 py-0.5 rounded border border-border font-black">K</span>
            </div>
        </div>
    );
}
