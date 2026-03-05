"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Filter, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, User, MessageSquare, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockAdminService, AdminModerationQueueItem } from "@/services/mockAdminService";

export default function AdminModerationPage() {
    const [queue, setQueue] = useState<AdminModerationQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "resolved" | "dismissed">("pending");

    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await mockAdminService.getModerationQueue();
            setQueue(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: AdminModerationQueueItem['status']) => {
        setActionLoading(id);
        try {
            await mockAdminService.updateModerationStatus(id, newStatus);
            setQueue(queue.map(q => q.id === id ? { ...q, status: newStatus } : q));
        } catch (err: any) {
            alert("Failed to update status: " + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredQueue = useMemo(() => queue.filter((q) => {
        const matchesSearch = q.reason.toLowerCase().includes(searchTerm.toLowerCase()) || q.targetId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || q.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [queue, searchTerm, statusFilter]);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'user': return <User className="w-5 h-5 text-blue-400" />;
            case 'submission': return <ImageIcon className="w-5 h-5 text-purple-400" />;
            case 'comment': return <MessageSquare className="w-5 h-5 text-amber-400" />;
            default: return <ShieldAlert className="w-5 h-5 text-foreground/40" />;
        }
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/30 px-8 py-5">
                <div>
                    <h1 className="text-3xl font-display uppercase tracking-tight text-foreground leading-none">
                        Content <span className="text-primary">Moderation</span>
                    </h1>
                    <p className="text-xs text-foreground/40 mt-1 font-medium">Review reported content, resolve disputes, and maintain platform safety.</p>
                </div>
            </div>

            <div className="px-8 py-8 space-y-6 max-w-7xl mx-auto">
                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card border border-border/40 p-4 rounded-2xl">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search by reason or ID..."
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
                            <option value="pending">Needs Review (Pending)</option>
                            <option value="resolved">Action Taken (Resolved)</option>
                            <option value="dismissed">Safe (Dismissed)</option>
                        </select>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm">{error}</div>}

                {/* Moderation Table */}
                <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-foreground/5 text-xs uppercase text-foreground/50 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Report Details</th>
                                    <th className="px-6 py-4 font-bold">Severity</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Reported At</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            Loading queue...
                                        </td>
                                    </tr>
                                ) : filteredQueue.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                                            <ShieldAlert className="w-8 h-8 opacity-20 mx-auto mb-3" />
                                            No items in moderation queue.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQueue.map((item) => (
                                        <tr key={item.id} className={cn(
                                            "transition-colors group",
                                            item.status === 'pending' ? "hover:bg-rose-500/[0.02]" : "hover:bg-foreground/[0.02]"
                                        )}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                        item.type === 'user' ? "bg-blue-500/10" :
                                                            item.type === 'submission' ? "bg-purple-500/10" : "bg-amber-500/10"
                                                    )}>
                                                        {getTypeIcon(item.type)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-foreground text-sm flex items-center gap-2">
                                                            {item.reason}
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-foreground/10 text-foreground/50">
                                                                {item.type}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-foreground/40 mt-1 flex gap-2">
                                                            <span>Target: <span className="font-mono text-foreground/60">{item.targetId}</span></span>
                                                            <span>•</span>
                                                            <span>By: <span className="font-mono text-foreground/60">{item.reportedBy}</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest",
                                                    item.severity === 'high' ? "text-red-500" :
                                                        item.severity === 'medium' ? "text-amber-500" : "text-emerald-500"
                                                )}>
                                                    {item.severity === 'high' && <AlertTriangle className="w-3.5 h-3.5" />}
                                                    {item.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                                                    item.status === 'pending' && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                                                    item.status === 'resolved' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                                    item.status === 'dismissed' && "bg-foreground/5 text-foreground/40 border border-border/50",
                                                )}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-foreground/60">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {actionLoading === item.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                    ) : (
                                                        <>
                                                            {item.status === "pending" && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleStatusChange(item.id, "resolved")}
                                                                        title="Take Action (Remove Content / Ban)"
                                                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors border border-red-500/20"
                                                                    >
                                                                        Take Action
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusChange(item.id, "dismissed")}
                                                                        title="Dismiss Report (Content is safe)"
                                                                        className="p-1.5 text-foreground/30 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                                                    >
                                                                        <CheckCircle2 className="w-5 h-5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {item.status !== "pending" && (
                                                                <button
                                                                    onClick={() => handleStatusChange(item.id, "pending")}
                                                                    title="Re-open Report"
                                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors border border-border/50"
                                                                >
                                                                    Re-open
                                                                </button>
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
