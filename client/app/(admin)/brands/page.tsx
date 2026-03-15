"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Filter, Building2, CheckCircle2, XCircle, MoreVertical, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockAdminService, AdminBrand } from "@/services/mockAdminService";

export default function AdminBrandsPage() {
    const [brands, setBrands] = useState<AdminBrand[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended">("all");

    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await mockAdminService.getBrands();
            setBrands(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: AdminBrand['status']) => {
        setActionLoading(id);
        try {
            await mockAdminService.updateBrandStatus(id, newStatus);
            setBrands(brands.map(b => b.id === id ? { ...b, status: newStatus } : b));
        } catch (err: any) {
            alert("Failed to update status: " + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleGenerateClaimLink = (brandId: string) => {
        alert(`Generated claim link for brand: https://aris.com/claim/${brandId}-token-xyz`);
    };

    const filteredBrands = useMemo(() => brands.filter((b) => {
        const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || b.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [brands, searchTerm, statusFilter]);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/30 px-8 py-5">
                <div>
                    <h1 className="text-3xl font-display uppercase tracking-tight text-foreground leading-none">
                        Brand <span className="text-primary">Management</span>
                    </h1>
                    <p className="text-xs text-foreground/40 mt-1 font-medium">Review applications, issue claim links, and manage partners.</p>
                </div>
            </div>

            <div className="px-8 py-8 space-y-6 max-w-7xl mx-auto">
                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card border border-border/40 p-4 rounded-2xl">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
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
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm">{error}</div>}

                {/* Brands Table */}
                <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-foreground/5 text-xs uppercase text-foreground/50 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Brand Info</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Credibility</th>
                                    <th className="px-6 py-4 font-bold">Created At</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            Loading brands...
                                        </td>
                                    </tr>
                                ) : filteredBrands.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                                            No brands found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBrands.map((brand) => (
                                        <tr key={brand.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                                        <Building2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-foreground">{brand.name}</div>
                                                        <div className="text-xs text-foreground/40 mt-0.5">{brand.contactEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                                                    brand.status === 'approved' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                                    brand.status === 'pending' && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                                                    brand.status === 'suspended' && "bg-orange-500/10 text-orange-400 border border-orange-500/20",
                                                    brand.status === 'rejected' && "bg-red-500/10 text-red-500 border border-red-500/20",
                                                )}>
                                                    {brand.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-16 bg-foreground/10 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                brand.credibilityScore > 70 ? "bg-emerald-400" : brand.credibilityScore > 40 ? "bg-amber-400" : "bg-red-400"
                                                            )}
                                                            style={{ width: `${brand.credibilityScore}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-foreground/60 font-bold">{brand.credibilityScore}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-foreground/60">
                                                {new Date(brand.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {actionLoading === brand.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                    ) : (
                                                        <>
                                                            {brand.status === "pending" && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleStatusChange(brand.id, "approved")}
                                                                        title="Approve Brand"
                                                                        className="p-1.5 text-foreground/30 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusChange(brand.id, "rejected")}
                                                                        title="Reject Brand"
                                                                        className="p-1.5 text-foreground/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {brand.status === "approved" && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleGenerateClaimLink(brand.id)}
                                                                        title="Generate Claim Link"
                                                                        className="p-1.5 text-foreground/30 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                                    >
                                                                        <LinkIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusChange(brand.id, "suspended")}
                                                                        title="Suspend Brand"
                                                                        className="p-1.5 text-foreground/30 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
                                                                    >
                                                                        <AlertTriangle className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(brand.status === "suspended" || brand.status === "rejected") && (
                                                                <button
                                                                    onClick={() => handleStatusChange(brand.id, "pending")}
                                                                    title="Move to Pending"
                                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors border border-border/50"
                                                                >
                                                                    Re-evaluate
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
