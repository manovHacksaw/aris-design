"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Filter, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockAdminService, AdminTransaction } from "@/services/mockAdminService";

export default function AdminFinancePage() {
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "reward_payout" | "deposit" | "withdrawal">("all");

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await mockAdminService.getTransactions();
            setTransactions(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount).replace('$', '') + ' ' + currency;
    };

    const filteredTransactions = useMemo(() => transactions.filter((t) => {
        const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) || t.toAddress.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "all" || t.type === typeFilter;
        return matchesSearch && matchesType;
    }), [transactions, searchTerm, typeFilter]);

    const totalDistributed = transactions
        .filter(t => t.type === 'reward_payout' && t.status === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalDeposits = transactions
        .filter(t => t.type === 'deposit' && t.status === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/30 px-8 py-5 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display uppercase tracking-tight text-foreground leading-none">
                        Finance & <span className="text-primary">Rewards</span>
                    </h1>
                    <p className="text-xs text-foreground/40 mt-1 font-medium">Monitor reward pools, payouts, and platform treasury.</p>
                </div>
                <button
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border/50 rounded-[12px] text-xs font-bold text-foreground/50 hover:text-foreground transition-colors disabled:opacity-40"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Refresh
                </button>
            </div>

            <div className="px-8 py-8 space-y-6 max-w-7xl mx-auto">

                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                        <h3 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">Total Distributed</h3>
                        <p className="text-3xl font-display text-emerald-400">{formatCurrency(totalDistributed, 'USDC')}</p>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
                        <h3 className="text-blue-400 text-xs font-black uppercase tracking-widest mb-1">Total Deposits</h3>
                        <p className="text-3xl font-display text-blue-400">{formatCurrency(totalDeposits, 'USDC')}</p>
                    </div>
                    <div className="bg-card border border-border/40 rounded-2xl p-6">
                        <h3 className="text-foreground/40 text-xs font-black uppercase tracking-widest mb-1">Current Balance</h3>
                        <p className="text-3xl font-display text-foreground">{formatCurrency(totalDeposits - totalDistributed, 'USDC')}</p>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card border border-border/40 p-4 rounded-2xl">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search by ID or destination address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-foreground/40" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            className="bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 capitalize"
                        >
                            <option value="all">All Types</option>
                            <option value="reward_payout">Payouts</option>
                            <option value="deposit">Deposits</option>
                            <option value="withdrawal">Withdrawals</option>
                        </select>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm">{error}</div>}

                {/* Transactions Table */}
                <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-foreground/5 text-xs uppercase text-foreground/50 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Transaction</th>
                                    <th className="px-6 py-4 font-bold">Type</th>
                                    <th className="px-6 py-4 font-bold">Amount</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Date</th>
                                    <th className="px-6 py-4 font-bold text-right">Destination</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-foreground/50">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            Loading transactions...
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-foreground/50">
                                            <Wallet className="w-8 h-8 opacity-20 mx-auto mb-3" />
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-foreground/60">{tx.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                        tx.type === 'deposit' ? "bg-blue-500/10 text-blue-400" :
                                                            tx.type === 'reward_payout' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                                                    )}>
                                                        {tx.type === 'deposit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">
                                                        {tx.type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={cn(
                                                    "font-mono font-bold",
                                                    tx.type === 'deposit' ? "text-blue-400" : tx.type === 'reward_payout' ? "text-emerald-400" : "text-amber-400"
                                                )}>
                                                    {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                                                    tx.status === 'completed' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                                    tx.status === 'pending' && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                                                    tx.status === 'failed' && "bg-red-500/10 text-red-500 border border-red-500/20",
                                                )}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-foreground/60">
                                                {new Date(tx.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-mono text-[10px] bg-foreground/5 px-2 py-1 rounded border border-border/50 text-foreground/60">
                                                    {tx.toAddress}
                                                </span>
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
