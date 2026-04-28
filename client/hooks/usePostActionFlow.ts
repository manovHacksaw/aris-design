"use client";

import { useMemo } from "react";

export type PostActionType = "vote" | "submit";

export interface PostActionState {
    type: PostActionType;
    eventName: string;
    eventMeta?: { endTime?: string; postingEnd?: string; status?: string } | null;
    nextEvent?: any | null;
}

function formatCountdown(targetDate: string | undefined | null): string {
    if (!targetDate) return "";
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return "soon";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function usePostActionFlow(state: PostActionState | null) {
    return useMemo(() => {
        if (!state) return { timeLabel: "", subtitle: "" };

        if (state.type === "vote") {
            const t = formatCountdown(state.eventMeta?.endTime);
            return {
                timeLabel: t ? `Results in ${t}` : "Results coming soon",
                subtitle: "Keep an eye on notifications.",
            };
        }

        // submit
        // If postingEnd exists, voting starts after that; otherwise use endTime
        const votingStart = state.eventMeta?.postingEnd ?? state.eventMeta?.endTime;
        const t = formatCountdown(votingStart);
        return {
            timeLabel: t ? `Voting starts in ${t}` : "Voting starting soon",
            subtitle: "Share the event and ask your friends to vote for you. All the best.",
        };
    }, [state]);
}
