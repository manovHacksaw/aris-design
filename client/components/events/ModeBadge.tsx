import { cn } from "@/lib/utils";
import { ThumbsUp, PenTool } from "lucide-react";
import { EventMode } from "@/types/events";

interface ModeBadgeProps {
    mode: EventMode;
    className?: string;
}

export default function ModeBadge({ mode, className }: ModeBadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em]",
                mode === "vote"
                    ? "bg-primary/15 text-primary"
                    : "bg-accent/15 text-accent",
                className
            )}
        >
            {mode === "vote" ? (
                <ThumbsUp className="w-2.5 h-2.5" />
            ) : (
                <PenTool className="w-2.5 h-2.5" />
            )}
            {mode}
        </div>
    );
}
