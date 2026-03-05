import { cn } from "@/lib/utils";
import { EventStatus, UserEventState } from "@/types/events";

interface StatusBadgeProps {
    status: EventStatus;
    userState?: UserEventState;
    className?: string;
}

export default function StatusBadge({ status, userState, className }: StatusBadgeProps) {
    if (userState === "won") {
        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] bg-primary/15 text-primary", className)}>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Won
            </div>
        );
    }

    if (userState === "participated") {
        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] bg-primary/10 text-primary/80", className)}>
                <span className="w-1.5 h-1.5 rounded-full bg-primary/80" />
                Voted
            </div>
        );
    }

    const config: Record<EventStatus, { label: string; dotClass: string; textClass: string; bgClass: string }> = {
        live: {
            label: "Live",
            dotClass: "bg-emerald-400 animate-pulse",
            textClass: "text-emerald-400",
            bgClass: "bg-emerald-400/10",
        },
        ending_soon: {
            label: "Ending Soon",
            dotClass: "bg-amber-400 animate-pulse",
            textClass: "text-amber-400",
            bgClass: "bg-amber-400/10",
        },
        ended: {
            label: "Ended",
            dotClass: "bg-foreground/30",
            textClass: "text-foreground/40",
            bgClass: "bg-foreground/5",
        },
        upcoming: {
            label: "Upcoming",
            dotClass: "bg-primary/60",
            textClass: "text-primary/60",
            bgClass: "bg-primary/5",
        },
    };

    const { label, dotClass, textClass, bgClass } = config[status];

    return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em]", bgClass, textClass, className)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
            {label}
        </div>
    );
}
