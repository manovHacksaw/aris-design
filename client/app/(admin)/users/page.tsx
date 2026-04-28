"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Filter, Shield, MoreVertical, Ban, PauseCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockAdminService, AdminUser } from "@/services/mockAdminService";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "banned">("all");
    const [roleFilter, setRoleFilter] = useState<"all" | "user" | "creator">("all");

    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await mockAdminService.getUsers();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: AdminUser['status']) => {
        setActionLoading(id);
        try {
            await mockAdminService.updateUserStatus(id, newStatus);
            setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
        } catch (err: any) {
            alert("Failed to update status: " + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter((u) => {
        const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.toLowerCase().includes(searchTerm.toLowerCase()) || u.walletAddress.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || u.status === statusFilter;
        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
    });

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/30 px-8 py-5">
                <div>
                    <h1 className="text-3xl font-display uppercase tracking-tight text-foreground leading-none">
                        User <span className="text-primary">Management</span>
                    </h1>
                    <p className="text-xs text-foreground/40 mt-1 font-medium">Manage accounts, moderation, and profiles.</p>
                </div>
            </div>

            <div className="px-8 py-8 space-y-6 max-w-7xl mx-auto">
                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card border border-border/40 p-4 rounded-2xl">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search by username, id, wallet..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-foreground/40" />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            className="bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                        >
                            <option value="all">All Roles</option>
                            <option value="user">Users</option>
                            <option value="creator">Creators</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 capitalize"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm">{error}</div>}

                {/* Users Table */}
                <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-foreground/5 text-xs uppercase text-foreground/50 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold">User</th>
                                    <th className="px-6 py-4 font-bold">Role</th>
                                    <th className="px-6 py-4 font-bold">Trust / XP</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Last Active</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-foreground/50">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-foreground/50">
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary uppercase">
                                                        {user.username.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-foreground">@{user.username}</div>
                                                        <div className="text-xs text-foreground/40 mt-0.5 truncate max-w-[150px]">{user.walletAddress}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                                                    user.role === 'creator' ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                                                )}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-foreground/70">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                                        <span className={cn("font-medium", user.trustScore < 50 && "text-red-400")}>{user.trustScore}/100</span>
                                                    </div>
                                                    <div className="text-[10px] text-foreground/40 font-mono uppercase">
                                                        {user.xp.toLocaleString()} XP
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                                                    user.status === 'active' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                                    user.status === 'suspended' && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                                                    user.status === 'banned' && "bg-red-500/10 text-red-500 border border-red-500/20",
                                                )}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-foreground/60 whitespace-nowrap">
                                                {new Date(user.lastActive).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {actionLoading === user.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                    ) : (
                                                        <>
                                                            {user.status !== "active" && (
                                                                <button
                                                                    onClick={() => handleStatusChange(user.id, "active")}
                                                                    title="Unban / Reactivate"
                                                                    className="p-1.5 text-foreground/30 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                                                >
                                                                    <PlayCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {user.status !== "suspended" && (
                                                                <button
                                                                    onClick={() => handleStatusChange(user.id, "suspended")}
                                                                    title="Suspend User"
                                                                    className="p-1.5 text-foreground/30 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                                                >
                                                                    <PauseCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {user.status !== "banned" && (
                                                                <button
                                                                    onClick={() => handleStatusChange(user.id, "banned")}
                                                                    title="Ban User"
                                                                    className="p-1.5 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                >
                                                                    <Ban className="w-4 h-4" />
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
