"use client";

import { Wallet, ArrowDownLeft, ArrowUpRight, Copy, CreditCard, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useReadContract } from "wagmi";
import { USDC_ADDRESS } from "@/lib/blockchain/contracts";
import { formatUnits } from "viem";
import { useState } from "react";

// ERC20 ABI for balance mapping
const erc20Abi = [
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const;

// Mock Data
const transactions = [
    { id: 1, type: "deposit", amount: "+$5,000.00", date: "Oct 24, 2026", status: "Completed", description: "Top up via Credit Card" },
    { id: 2, type: "withdrawal", amount: "-$1,200.00", date: "Oct 22, 2026", status: "Completed", description: "Campaign 'Neon Dreams' Payout" },
    { id: 3, type: "withdrawal", amount: "-$450.00", date: "Oct 20, 2026", status: "Pending", description: "Campaign Boost" },
    { id: 4, type: "deposit", amount: "+$2,000.00", date: "Oct 15, 2026", status: "Completed", description: "Top up via Crypto (USDC)" },
];

export default function BrandFinancialsPage() {
    const { smartAccountAddress } = useAuth();
    const [copied, setCopied] = useState(false);

    const { data: usdcBalanceRaw } = useReadContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: smartAccountAddress ? [smartAccountAddress as `0x${string}`] : undefined,
        query: {
            enabled: !!smartAccountAddress,
            refetchInterval: 10000 // Refetch every 10 seconds
        }
    });

    const displayBalance = usdcBalanceRaw !== undefined
        ? Number(formatUnits(usdcBalanceRaw, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "0.00";

    const truncateAddress = (address: string) => {
        if (!address) return "Not Connected";
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleCopy = () => {
        if (smartAccountAddress) {
            navigator.clipboard.writeText(smartAccountAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-8 pb-20 md:pb-0">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Financials</h1>
                    <p className="text-muted-foreground">Manage your wallet and campaign budgets.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Top Up
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from-gray-900 to-black p-6 md:p-8 rounded-[24px] text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-1">Total Balance</p>
                                <h2 className="text-4xl md:text-5xl font-black tracking-tight">${displayBalance}</h2>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                                <Wallet className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Reserved</p>
                                <p className="text-xl font-bold">$0.00</p>
                            </div>
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Available</p>
                                <p className="text-xl font-bold text-green-400">${displayBalance}</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-white/60">
                                    {truncateAddress(smartAccountAddress || '')}
                                </span>
                                <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer" onClick={handleCopy}>
                                    <Copy className={cn("w-3.5 h-3.5 transition-colors", copied ? "text-green-400" : "text-white/60")} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
                                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                Polygon Amoy
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button className="bg-card border border-border p-6 rounded-[24px] hover:bg-secondary/50 transition-colors flex flex-col justify-center gap-4 group">
                        <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowDownLeft className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Deposit</h3>
                            <p className="text-xs text-muted-foreground mt-1">Add funds via card or crypto</p>
                        </div>
                    </button>
                    <button className="bg-card border border-border p-6 rounded-[24px] hover:bg-secondary/50 transition-colors flex flex-col justify-center gap-4 group">
                        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Withdraw</h3>
                            <p className="text-xs text-muted-foreground mt-1">Transfer to bank or wallet</p>
                        </div>
                    </button>
                    <button className="bg-card border border-border p-6 rounded-[24px] hover:bg-secondary/50 transition-colors flex flex-col justify-center gap-4 group">
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Cards</h3>
                            <p className="text-xs text-muted-foreground mt-1">Manage payment methods</p>
                        </div>
                    </button>
                    <button className="bg-card border border-border p-6 rounded-[24px] hover:bg-secondary/50 transition-colors flex flex-col justify-center gap-4 group">
                        <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <History className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Reports</h3>
                            <p className="text-xs text-muted-foreground mt-1">Download monthly PDFs</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-card border border-border rounded-[24px] p-6 lg:p-8">
                <h3 className="font-bold text-lg mb-6">Recent Transactions</h3>
                <div className="space-y-4">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/50">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    tx.type === "deposit" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                )}>
                                    {tx.type === "deposit" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-foreground">{tx.description}</p>
                                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={cn(
                                    "font-black text-sm",
                                    tx.type === "deposit" ? "text-green-500" : "text-foreground"
                                )}>{tx.amount}</p>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider",
                                    tx.status === "Pending" ? "text-yellow-500" : "text-muted-foreground"
                                )}>{tx.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
