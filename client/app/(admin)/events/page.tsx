"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Filter, Ticket, PauseCircle, PlayCircle, XCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockAdminService, AdminEvent } from "@/services/mockAdminService";

export default function AdminEventsPage() {
    const [events, setEvents] = useState<AdminEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "completed" | "cancelled">("all");

    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await mockAdminService.getEvents();
            setEvents(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: AdminEvent['status']) => {
        setActionLoading(id);
        try {
            await mockAdminService.updateEventStatus(id, newStatus);
            setEvents(events.map(e => e.id === id ? { ...e, status: newStatus } : e));
        } catch (err: any) {
            alert("Failed to update status: " + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const filteredEvents = useMemo(() => events.filter((e) => {
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || e.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [events, searchTerm, statusFilter]);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/30 px-8 py-5">
                <div>
                    <h1 className="text-3xl font-display uppercase tracking-tight text-foreground leading-none">
                        Event <span className="text-primary">Management</span>
                    </h1>
                    <p className="text-xs text-foreground/40 mt-1 font-medium">Monitor active campaigns, submissions, and reward pools.</p>
                </div>
            </div>

            <div className="px-8 py-8 space-y-6 max-w-7xl mx-auto">
                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card border border-border/40 p-4 rounded-2xl">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search by title or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-foreground/40" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 capitalize"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm">{error}</div>}

                {/* Events Table */}
                <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-foreground/5 text-xs uppercase text-foreground/50 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Event Details</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Reward Pool</th>
                                    <th className="px-6 py-4 font-bold">Engagement</th>
                                    <th className="px-6 py-4 font-bold">Ends At</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-foreground/50">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            Loading events...
                                        </td>
                                    </tr>
                                ) : filteredEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-foreground/50">
                                            No events found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEvents.map((event) => (
                                        <tr key={event.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                                                        <Ticket className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-foreground truncate max-w-[200px]">{event.title}</div>
                                                        <div className="text-[10px] text-foreground/40 mt-0.5 font-mono uppercase">ID: {event.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                                                    event.status === 'active' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                                    event.status === 'completed' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                                    event.status === 'paused' && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                                                    event.status === 'cancelled' && "bg-red-500/10 text-red-500 border border-red-500/20",
                                                )}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-emerald-400">
                                                    {formatCurrency(event.rewardPool)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs text-foreground/70">
                                                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                                    <span className="font-medium">{event.submissionsCount.toLocaleString()} <span className="text-foreground/40 text-[10px] uppercase">entries</span></span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-foreground/60">
                                                {new Date(event.endTime).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {actionLoading === event.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                    ) : (
                                                        <>
                                                            {event.status === "active" && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleStatusChange(event.id, "paused")}
                                                                        title="Pause Event"
                                                                        className="p-1.5 text-foreground/30 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                                                    >
                                                                        <PauseCircle className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusChange(event.id, "cancelled")}
                                                                        title="Cancel Event"
                                                                        className="p-1.5 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {event.status === "paused" && (
                                                                <button
                                                                    onClick={() => handleStatusChange(event.id, "active")}
                                                                    title="Resume Event"
                                                                    className="p-1.5 text-foreground/30 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                                                >
                                                                    <PlayCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {(event.status === "completed" || event.status === "cancelled") && (
                                                                <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest px-2">
                                                                    Archived
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
