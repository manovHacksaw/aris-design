"use client";

import { useEffect, useState } from "react";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { getBrandEvents } from "@/services/mockBrandService";
import type { BrandEvent } from "@/types/api";

const STATUS_STYLES: Record<string, string> = {
    live:         "bg-green-500/10 text-green-500 border-green-500/20",
    ending_soon:  "bg-orange-500/10 text-orange-500 border-orange-500/20",
    scheduled:    "bg-blue-500/10 text-blue-500 border-blue-500/20",
    draft:        "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    ended:        "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
    live: "Active", ending_soon: "Ending Soon",
    scheduled: "Scheduled", draft: "Draft", ended: "Ended",
};

export default function EventsTable() {
    const [events, setEvents] = useState<BrandEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBrandEvents()
            .then((res) => { setEvents(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-bold">Recent Events</h3>
                <button className="text-sm text-primary font-medium hover:underline">View All</button>
            </div>

            {loading ? (
                <div className="p-6 space-y-3 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 bg-secondary/50 rounded-lg" />
                    ))}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-secondary/50 text-muted-foreground font-medium">
                            <tr>
                                <th className="px-4 py-3">Event Name</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3 text-right">Submissions</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {events.map((event) => (
                                <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 font-medium">{event.title}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_STYLES[event.status] ?? STATUS_STYLES.ended}`}>
                                            {STATUS_LABELS[event.status] ?? event.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground capitalize">{event.eventType}</td>
                                    <td className="px-4 py-3 text-right">
                                        {event.totalSubmissions > 0 ? event.totalSubmissions.toLocaleString() : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button className="p-1 hover:bg-secondary rounded-md transition-colors">
                                            <IoEllipsisHorizontal />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && events.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t border-border">
                    No events yet.
                </div>
            )}
        </div>
    );
}
