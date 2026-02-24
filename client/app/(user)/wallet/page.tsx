"use client";

import { useState } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import { Copy, QrCode, ArrowUpRight, ArrowDownLeft, Clock, History, AlertCircle, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

// Mock Data
const MOCK_ADDRESS = "0x7a83...4b29";
const FULL_ADDRESS = "0x7a83d29a5839C12849b2848b1284b12384b29";
const MOCK_BALANCE = "1,240.50";
const MOCK_CHAIN = "Mantle Mainnet";

const MOCK_HISTORY = [
    { id: 1, type: "claim", amount: "+50.00", currency: "USDC", from: "Nike Challenge", date: "Today, 2:30 PM", status: "Completed" },
    { id: 2, type: "claim", amount: "+120.00", currency: "USDC", from: "Adidas Sprint", date: "Yesterday", status: "Completed" },
    { id: 3, type: "send", amount: "-500.00", currency: "USDC", to: "0x8b3...9a21", date: "Feb 14, 2026", status: "Completed" },
    { id: 4, type: "claim", amount: "+25.00", currency: "USDC", from: "Daily Login", date: "Feb 12, 2026", status: "Completed" },
];

export default function WalletPage() {
    const [withdrawAddress, setWithdrawAddress] = useState("");
    const [withdrawChain, setWithdrawChain] = useState("");
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"withdraw" | "deposit">("withdraw");

    const handleCopy = () => {
        navigator.clipboard.writeText(FULL_ADDRESS);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-8 pb-24 md:pb-8">

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-foreground">Wallet Activity</h1>
                        <p className="text-foreground/60">Manage your earnings, deposits, and withdrawals.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column: Wallet Card & Balance (Span 2) */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* 1. Balance Card */}
                            <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group shadow-lg shadow-black/20">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                    <div className="w-64 h-64 bg-primary rounded-full blur-[100px]"></div>
                                </div>

                                <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-foreground/40 font-bold mb-2 tracking-widest text-[10px] uppercase">Total Balance</p>
                                            <div className="flex items-baseline gap-2">
                                                <h2 className="text-5xl md:text-6xl font-black text-foreground tracking-tight">${MOCK_BALANCE}</h2>
                                                <span className="text-xl text-foreground/40 font-bold">USDC</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full w-fit border border-border">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                                <span className="text-sm text-foreground/60 font-bold">{MOCK_CHAIN}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            <span className="flex items-center gap-2">
                                                <ArrowUpRight className="w-4 h-4 text-green-500" />
                                                +12.5% this month
                                            </span>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setActiveTab("deposit")}
                                                className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                            >
                                                <ArrowDownLeft className="w-4 h-4" />
                                                Deposit
                                            </button>
                                            <button
                                                onClick={() => setActiveTab("withdraw")}
                                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-transparent"
                                            >
                                                <ArrowUpRight className="w-4 h-4" />
                                                Withdraw
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Transaction History */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                        <History className="w-5 h-5 text-foreground/40" />
                                        Activity History
                                    </h3>
                                    <button className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 group">
                                        View Explorer <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>

                                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                                    {MOCK_HISTORY.map((item, index) => (
                                        <div key={item.id} className={`p-5 flex items-center justify-between hover:bg-secondary/50 transition-colors group cursor-default ${index !== MOCK_HISTORY.length - 1 ? 'border-b border-border' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${item.type === 'claim' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-gray-700/20 border-gray-600/20 text-gray-400'}`}>
                                                    {item.type === 'claim' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground group-hover:text-primary transition-colors">{item.type === 'claim' ? 'Claimed Reward' : 'Sent Payment'}</p>
                                                    <p className="text-sm text-foreground/60">{item.type === 'claim' ? item.from : `To: ${item.to}`}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black tabular-nums ${item.type === 'claim' ? 'text-green-500' : 'text-foreground/80'}`}>{item.amount} {item.currency}</p>
                                                <p className="text-sm text-foreground/40 font-bold">{item.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Actions (Span 1) */}
                        <div className="space-y-6">

                            {/* 3. Action Panel (Tabs) */}
                            <div className="bg-card border border-border rounded-3xl p-6 space-y-6 sticky top-24 shadow-lg shadow-black/20">

                                {/* Tabs */}
                                <div className="grid grid-cols-2 p-1 bg-secondary rounded-xl border border-border">
                                    <button
                                        onClick={() => setActiveTab("withdraw")}
                                        className={cn(
                                            "py-2 text-sm font-bold rounded-lg transition-all",
                                            activeTab === "withdraw" ? "bg-card text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground"
                                        )}
                                    >
                                        Withdraw
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("deposit")}
                                        className={cn(
                                            "py-2 text-sm font-bold rounded-lg transition-all",
                                            activeTab === "deposit" ? "bg-card text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground"
                                        )}
                                    >
                                        Deposit
                                    </button>
                                </div>

                                {/* Content Area */}
                                <div className="min-h-[300px]">
                                    {activeTab === "withdraw" ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground mb-1">Send Funds</h3>
                                                <p className="text-sm text-foreground/60">Enter an EVM address and a chain to withdraw to.</p>
                                            </div>

                                            <div className="space-y-5">
                                                {/* Amount Input */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Amount</label>
                                                    <div className="relative group">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            className="w-full bg-background border border-border rounded-xl pl-8 pr-16 py-3.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-foreground/20 font-mono text-lg group-hover:border-border/80"
                                                        />
                                                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded hover:bg-primary/20 transition-colors">MAX</button>
                                                    </div>
                                                </div>

                                                {/* Address Input */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">EVM Address</label>
                                                    <input
                                                        type="text"
                                                        placeholder="0x..."
                                                        value={withdrawAddress}
                                                        onChange={(e) => setWithdrawAddress(e.target.value)}
                                                        className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-foreground/20 font-mono text-sm hover:border-border/80"
                                                    />
                                                </div>

                                                {/* Chain Select */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Network</label>
                                                    <div className="relative">
                                                        <select
                                                            className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer hover:border-border/80"
                                                            value={withdrawChain}
                                                            onChange={(e) => setWithdrawChain(e.target.value)}
                                                        >
                                                            <option value="">Select a network...</option>
                                                            <option value="mantle">Mantle Mainnet</option>
                                                            <option value="ethereum">Ethereum Mainnet</option>
                                                            <option value="base">Base</option>
                                                            <option value="optimism">Optimism</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <ArrowDownLeft className="w-4 h-4 text-gray-500 rotate-[-45deg]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2">
                                                Withdraw Funds
                                            </button>

                                            <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl mt-4">
                                                <AlertCircle className="w-4 h-4 text-yellow-500/60 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-yellow-500/60 leading-relaxed">
                                                    Only send assets to EVM-compatible wallets on the selected network.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground mb-1">Deposit USDC</h3>
                                                <p className="text-sm text-foreground/60">Scan or copy address to deposit funds.</p>
                                            </div>

                                            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-4 border-white shadow-xl">
                                                <QRCodeSVG value={FULL_ADDRESS} size={180} />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Your Address</label>
                                                <div
                                                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 flex items-center justify-between group/copy cursor-pointer hover:border-border/80 transition-colors"
                                                    onClick={handleCopy}
                                                >
                                                    <span className="font-mono text-foreground/80 text-sm truncate mr-2 select-all">{MOCK_ADDRESS}</span>
                                                    <div className="flex items-center gap-2">
                                                        {copied ? (
                                                            <span className="text-xs text-green-500 font-bold animate-in fade-in">Copied!</span>
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-foreground/40 group-hover/copy:text-foreground transition-colors" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 bg-secondary py-2 rounded-lg">
                                                <RefreshCw className="w-3 h-3 animate-spin duration-3000" />
                                                Waiting for deposit...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Coming Soon Card */}
                            <div className="bg-gradient-to-br from-card to-background border border-border rounded-3xl p-6 relative overflow-hidden group">
                                {/* Background decoration */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-500"></div>

                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                            <Clock className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">Coming Soon</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground">Advanced Trading</h3>
                                        <p className="text-sm text-foreground/60 mt-1">
                                            On-platform P2P trading and direct fiat off-ramps are currently in development.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <span className="px-2 py-1 bg-secondary border border-border rounded-lg text-[10px] uppercase font-bold text-foreground/40 tracking-widest">P2P Market</span>
                                        <span className="px-2 py-1 bg-secondary border border-border rounded-lg text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Fiat Off-ramp</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </main>
            </SidebarLayout>
        </div>
    );
}
