"use client";

import { Wallet, ArrowDownLeft, ArrowUpRight, Copy, CreditCard, History } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data
const transactions = [
    { id: 1, type: "deposit", amount: "+$5,000.00", date: "Oct 24, 2026", status: "Completed", description: "Top up via Credit Card" },
    { id: 2, type: "withdrawal", amount: "-$1,200.00", date: "Oct 22, 2026", status: "Completed", description: "Campaign 'Neon Dreams' Payout" },
    { id: 3, type: "withdrawal", amount: "-$450.00", date: "Oct 20, 2026", status: "Pending", description: "Campaign Boost" },
    { id: 4, type: "deposit", amount: "+$2,000.00", date: "Oct 15, 2026", status: "Completed", description: "Top up via Crypto (USDC)" },
];

export default function BrandFinancialsPage() {
    return (
        <div className="space-y-8 pb-20 md:pb-0">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Financials</h1>
                    <p className="text-foreground/60">Manage your wallet and campaign budgets.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Top Up
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Balance Card — wallet style ── */}
                <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group shadow-lg shadow-black/20">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <div className="w-64 h-64 bg-primary rounded-full blur-[100px]" />
                    </div>

                    <div className="relative z-10 flex flex-col justify-between h-full space-y-8">

                        {/* Top: balance + network badge */}
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-foreground/40 font-bold mb-2 tracking-widest text-[10px] uppercase">Total Balance</p>
                                <h2 className="text-5xl md:text-6xl font-black text-foreground tracking-tight">$12,450.00</h2>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full w-fit border border-border">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm text-foreground/60 font-bold">Solana Network</span>
                            </div>
                        </div>

                        {/* Reserved / Available */}
                        <div className="flex gap-4">
                            <div className="flex-1 bg-secondary/50 border border-border rounded-xl p-4">
                                <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider mb-1">Reserved</p>
                                <p className="text-xl font-bold text-foreground">$4,250.00</p>
                            </div>
                            <div className="flex-1 bg-secondary/50 border border-border rounded-xl p-4">
                                <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider mb-1">Available</p>
                                <p className="text-xl font-bold text-green-400">$8,200.00</p>
                            </div>
                        </div>

                        {/* Bottom: address + copy */}
                        <div className="flex items-center pt-4 border-t border-border/50">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-foreground/40">0x71C...9A23</span>
                                <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                    <Copy className="w-3.5 h-3.5 text-foreground/40" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Quick Actions ── */}
                <div className="grid grid-cols-2 gap-4">
                    <button className="bg-card border border-border p-6 rounded-3xl hover:bg-secondary/50 transition-colors flex flex-col justify-center gap-4 group">
                        <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowDownLeft className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Deposit</h3>
                            <p className="text-xs text-foreground/60 mt-1">Add funds via card or crypto</p>
                        </div>
                    </button>
                    <button className="bg-card border border-border p-6 rounded-3xl hover:bg-secondary/50 transition-colors flex flex-col justify-center gap-4 group">
                        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Withdraw</h3>
                            <p className="text-xs text-foreground/60 mt-1">Transfer to bank or wallet</p>
                        </div>
                    </button>
                    <button className="bg-card border border-border p-6 rounded-3xl hover:bg-secondary/50 transition-colors flex flex-col justify-center gap-4 group">
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Cards</h3>
                            <p className="text-xs text-foreground/60 mt-1">Manage payment methods</p>
                        </div>
                    </button>
                    <button className="bg-card border border-border p-6 rounded-3xl hover:bg-secondary/50 transition-colors flex flex-col justify-center gap-4 group">
                        <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <History className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Reports</h3>
                            <p className="text-xs text-foreground/60 mt-1">Download monthly PDFs</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Recent Transactions — wallet Activity History style ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <History className="w-5 h-5 text-foreground/40" />
                        Recent Transactions
                    </h3>
                    <button className="text-sm text-primary hover:text-primary/80 font-bold flex items-center gap-1 group">
                        View Explorer <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>

                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                    {transactions.map((tx, index) => (
                        <div
                            key={tx.id}
                            className={cn(
                                "p-5 flex items-center justify-between hover:bg-secondary/50 transition-colors group cursor-default",
                                index !== transactions.length - 1 ? "border-b border-border" : ""
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border",
                                    tx.type === "deposit"
                                        ? "bg-green-500/10 border-green-500/20 text-green-500"
                                        : "bg-secondary border-border text-foreground/40"
                                )}>
                                    {tx.type === "deposit"
                                        ? <ArrowDownLeft className="w-5 h-5" />
                                        : <ArrowUpRight className="w-5 h-5" />
                                    }
                                </div>
                                <div>
                                    <p className="font-bold text-foreground group-hover:text-primary transition-colors">{tx.description}</p>
                                    <p className="text-sm text-foreground/60">{tx.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={cn(
                                    "font-black tabular-nums",
                                    tx.type === "deposit" ? "text-green-500" : "text-foreground/80"
                                )}>
                                    {tx.amount}
                                </p>
                                <p className={cn(
                                    "text-sm font-bold",
                                    tx.status === "Pending" ? "text-yellow-500" : "text-foreground/40"
                                )}>
                                    {tx.status}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
