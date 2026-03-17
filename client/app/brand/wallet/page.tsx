"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
    Wallet, CheckCircle2, ChevronDown, ChevronUp,
    Loader2, AlertCircle, AlertTriangle, DollarSign, RefreshCw, Clock, Plus,
    ExternalLink, ArrowUpRight, ArrowDownLeft, Copy,
    Gift, History, Info, Shield, Zap, KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/context/WalletContext";
import {
    REWARDS_VAULT_ADDRESS,
    encodeWithdrawRefund,
    readBrandRefundBalance,
} from "@/lib/blockchain/contracts";
import {
    getBrandRefunds,
    saveRefundCredit,
    type BrandRefundsResponse,
    type RefundPool,
    type RefundHistoryItem,
} from "@/services/brand-refunds.service";

const EXPLORER_BASE = "https://amoy.polygonscan.com";
const CHAIN_NAME = "Polygon Amoy";
const CHAIN_ID = 80002;

function fmt$(n?: number | string) {
    if (!n) return "0.00";
    const num = typeof n === "string" ? parseFloat(n) : n;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function truncateAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function BrandWalletPage() {
    const router = useRouter();
    const { address, isConnected, balance, sendTransaction, publicClient, refreshBalance } = useWallet();

    const [activeTab, setActiveTab] = useState<"wallet" | "refunds">("wallet");
    const [actionTab, setActionTab] = useState<"withdraw" | "deposit">("withdraw");
    const [copied, setCopied] = useState(false);

    // Refunds State
    const [data, setData] = useState<BrandRefundsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [onChainBalance, setOnChainBalance] = useState<number>(0);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [sendAmount, setSendAmount] = useState("");
    const [sendAddress, setSendAddress] = useState("");

    async function loadDbData() {
        try {
            setLoading(true);
            setError(null);
            const res = await getBrandRefunds();
            setData(res);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load refund data");
        } finally {
            setLoading(false);
        }
    }

    const loadOnChainBalance = useCallback(async () => {
        if (!address || !REWARDS_VAULT_ADDRESS) return;
        setBalanceLoading(true);
        try {
            const raw = await readBrandRefundBalance(address);
            setOnChainBalance(Number(raw) / 1_000_000);
        } catch (e) {
            console.warn("Failed to read on-chain refund balance:", e);
        } finally {
            setBalanceLoading(false);
        }
    }, [address]);

    useEffect(() => { loadDbData(); }, []);

    useEffect(() => {
        if (isConnected) {
            loadOnChainBalance();
            refreshBalance();
        }
    }, [isConnected, loadOnChainBalance, refreshBalance]);

    const handleRefresh = async () => {
        await Promise.all([loadDbData(), loadOnChainBalance(), refreshBalance()]);
    };

    async function handleWithdrawRefund() {
        if (!isConnected || !address) { toast.error("Connect your wallet first."); return; }
        if (onChainBalance <= 0) { toast.error("No on-chain refund balance to withdraw."); return; }

        setIsWithdrawing(true);
        const toastId = "withdraw-refund";
        toast.loading(`Withdrawing $${fmt$(onChainBalance)} USDC…`, { id: toastId });

        try {
            const txData = encodeWithdrawRefund();
            const txHash = await sendTransaction({
                to: REWARDS_VAULT_ADDRESS as `0x${string}`,
                data: txData,
            });
            setWithdrawTxHash(txHash);
            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}`, timeout: 120_000 });
            }
            toast.success(`$${fmt$(onChainBalance)} USDC withdrawn to your wallet!`, { id: toastId });
            setOnChainBalance(0);
            await loadOnChainBalance();
            await refreshBalance();
        } catch (e: any) {
            toast.error(e?.message?.split("\n")[0] ?? "Withdrawal failed", { id: toastId });
        } finally {
            setIsWithdrawing(false);
        }
    }

    function handleUseCredit(pool: RefundPool) {
        const amount = pool.refundBreakdown?.totalRefund ?? 0;
        if (amount <= 0) { toast.error("No refund available for this event."); return; }
        saveRefundCredit(amount, [pool.eventId]);
        toast.success(`$${fmt$(amount)} credit saved — apply it when creating your next event.`);
        router.push("/brand/create-event");
    }

    function handleUseAllCredit() {
        const pools = data?.pools ?? [];
        const refundable = pools.filter((p) => (p.refundBreakdown?.totalRefund ?? 0) > 0);
        const total = refundable.reduce((s, p) => s + (p.refundBreakdown?.totalRefund ?? 0), 0);
        if (total <= 0) return;
        saveRefundCredit(total, refundable.map((p) => p.eventId));
        toast.success(`$${fmt$(total)} credit saved for your next event.`);
        router.push("/brand/create-event");
    }

    const handleCopy = (val: string) => {
        navigator.clipboard.writeText(val);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const refundablePools = (data?.pools ?? []).filter(
        (p) => (p.refundBreakdown?.totalRefund ?? 0) > 0
    );
    const dbTotal = refundablePools.reduce((s, p) => s + (p.refundBreakdown?.totalRefund ?? 0), 0);

    const renderWalletTab = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Wallet Balance Card */}
            <div className="bg-gradient-to-br from-card to-card/50 border border-border/40 rounded-[28px] p-6 lg:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40">Total Balance</p>
                            <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-primary/20">
                                Mantle Mainnet
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="font-display text-5xl lg:text-6xl tracking-tight text-foreground">
                                {fmt$(balance)}
                            </h2>
                            <span className="text-xl font-bold text-foreground/40">USDC</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-500">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>+0.0% this month</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border/40 bg-secondary text-sm font-black text-foreground hover:border-border transition-all">
                            <ArrowDownLeft className="w-4 h-4" />
                            Deposit
                        </button>
                        <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-black hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                            <ArrowUpRight className="w-4 h-4" />
                            Withdraw
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity History */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-white/40" />
                            <h3 className="font-display text-xl text-white uppercase tracking-tight pt-1">Activity History</h3>
                        </div>
                        <button className="text-xs font-black text-primary hover:underline flex items-center gap-1">
                            View Explorer <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                    
                    <div className="bg-card border border-border/40 rounded-[20px] divide-y divide-border/30 overflow-hidden">
                        {(data?.refundHistory && data.refundHistory.length > 0) ? (
                            (data.refundHistory as RefundHistoryItem[]).slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors">
                                    <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                                        <ArrowDownLeft className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-foreground truncate">Refund: {item.eventTitle}</p>
                                        <p className="text-xs text-foreground/40 font-medium">{fmtDate(item.timestamp)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-black text-green-500">+{fmt$(item.amount)}</p>
                                        <p className="text-[11px] text-foreground/40 font-medium">USDC</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-sm font-medium text-foreground/40">No recent activity.</p>
                            </div>
                        )}
                        
                        {/* Mock transactions to make it look like the requested layout if no history */}
                        {(!data?.refundHistory || data.refundHistory.length === 0) && (
                            <div className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors">
                                <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                                    <Wallet className="w-5 h-5 text-foreground/40" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-foreground truncate">Wallet Connected</p>
                                    <p className="text-xs text-foreground/40 font-medium">System</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-foreground">—</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Send Funds / Withdraw Panel */}
                <div className="space-y-4">
                    <div className="bg-card border border-border/40 rounded-[24px] overflow-hidden">
                        <div className="flex mx-2 mt-2 gap-1 p-1 bg-secondary rounded-xl">
                            <button className="flex-1 py-2 text-xs font-black rounded-lg bg-background shadow-sm text-foreground">
                                Withdraw
                            </button>
                            <button className="flex-1 py-2 text-xs font-black rounded-lg text-foreground/50 hover:text-foreground transition-colors">
                                Deposit
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div>
                                <h3 className="font-display text-2xl text-white uppercase tracking-tight mb-1">Send Funds</h3>
                                <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">Enter an EVM address and a chain to withdraw to.</p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1.5 block">
                                        Amount
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <span className="text-foreground/40 font-bold">$</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="0.00"
                                            value={sendAmount}
                                            onChange={(e) => setSendAmount(e.target.value)}
                                            className="w-full h-12 bg-secondary border border-border/40 rounded-xl pl-8 pr-16 text-sm font-bold placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                                        />
                                        <button className="absolute inset-y-2 right-2 px-3 bg-primary/10 text-primary text-xs font-black rounded-lg hover:bg-primary/20 transition-colors">
                                            MAX
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1.5 block">
                                        EVM Address
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        value={sendAddress}
                                        onChange={(e) => setSendAddress(e.target.value)}
                                        className="w-full h-12 bg-secondary border border-border/40 rounded-xl px-4 text-sm font-medium placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                                    />
                                </div>
                                
                                <button className="w-full h-12 bg-primary text-white text-sm font-black rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20 mt-2">
                                    Withdraw Funds
                                </button>
                                
                                <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                                    <p className="text-[11px] font-medium text-yellow-600/80 leading-relaxed">
                                        Only send assets to EVM-compatible wallets on the Polygon Amoy network.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderRefundsTab = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* On-chain balance card */}
            <div className={cn(
                "rounded-[28px] p-6 border",
                onChainBalance > 0 ? "bg-primary/5 border-primary/20" : "bg-card border-border/40"
            )}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                            onChainBalance > 0 ? "bg-primary/10" : "bg-secondary"
                        )}>
                            {balanceLoading
                                ? <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
                                : <DollarSign className={cn("w-6 h-6", onChainBalance > 0 ? "text-primary" : "text-foreground/30")} />
                            }
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-0.5">On-Chain Refund Balance</p>
                            <p className="font-display text-4xl text-white uppercase tracking-tight mt-1">
                                {fmt$(onChainBalance)}
                            </p>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">
                                Live from RewardsVault contract
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        {onChainBalance > 0 && (
                            <button
                                onClick={handleWithdrawRefund}
                                disabled={isWithdrawing || !isConnected}
                                className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {isWithdrawing
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Withdrawing…</>
                                    : <><Wallet className="w-3.5 h-3.5" /> Withdraw to wallet</>
                                }
                            </button>
                        )}
                        <button
                            onClick={() => loadOnChainBalance()}
                            disabled={balanceLoading}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/40 bg-secondary text-xs font-black uppercase tracking-widest text-foreground/50 hover:text-foreground hover:border-border transition-all disabled:opacity-40"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", balanceLoading && "animate-spin")} />
                            Refresh
                        </button>
                    </div>
                </div>

                {!isConnected && (
                    <div className="mt-4 flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-400 font-medium">
                            Connect your brand wallet to check on-chain balance and withdraw.
                        </p>
                    </div>
                )}

                {withdrawTxHash && (
                    <div className="mt-4 flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        <p className="text-xs text-green-400 font-medium flex-1">Withdrawal confirmed.</p>
                        <a
                            href={`${EXPLORER_BASE}/tx/${withdrawTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-black text-primary flex items-center gap-1 hover:underline"
                        >
                            View tx <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}
            </div>

            {/* Per-event breakdown */}
            {refundablePools.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40">
                            By Event ({fmt$(dbTotal)} projected)
                        </h2>
                        <button
                            onClick={handleUseAllCredit}
                            className="text-xs font-black text-primary hover:underline flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Use all as credit
                        </button>
                    </div>

                    {refundablePools.map((pool) => {
                        const refund = pool.refundBreakdown?.totalRefund ?? 0;
                        const isExpanded = expandedId === pool.eventId;
                        const unusedSlots = Math.max(0, pool.maxParticipants - pool.participantCount);

                        return (
                            <div key={pool.eventId} className="bg-card border border-border/40 rounded-[20px] overflow-hidden">
                                <div className="p-5 flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                        pool.status === "CANCELLED" ? "bg-red-500/10" : "bg-green-500/10"
                                    )}>
                                        <DollarSign className={cn("w-5 h-5", pool.status === "CANCELLED" ? "text-red-400" : "text-green-400")} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-black text-foreground truncate">
                                                {(pool as any).eventTitle ?? pool.eventId.slice(0, 12) + "…"}
                                            </p>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                                                pool.status === "CANCELLED"
                                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                    : "bg-muted text-muted-foreground border-border"
                                            )}>
                                                {pool.status === "CANCELLED" ? "Cancelled" : "Completed"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-foreground/40 font-medium mt-0.5">
                                            {unusedSlots} unused slot{unusedSlots !== 1 ? "s" : ""} · {pool.participantCount}/{pool.maxParticipants} participated
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <p className="text-lg font-black text-foreground">{fmt$(refund)}</p>
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : pool.eventId)}
                                            className="text-[10px] font-black text-foreground/30 hover:text-foreground/60 uppercase tracking-widest flex items-center gap-0.5 ml-auto transition-colors"
                                        >
                                            Breakdown {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && pool.refundBreakdown && (
                                    <div className="px-5 pb-4 border-t border-border/30">
                                        <div className="pt-4 space-y-2">
                                            {([
                                                ["Base pool (unused)", pool.refundBreakdown.unusedBase],
                                                ["Creator pool (unused)", pool.refundBreakdown.unusedCreator],
                                                ["Platform fee (refunded)", pool.refundBreakdown.platformFee],
                                                ["Top voter pool", pool.refundBreakdown.unusedTop],
                                                ["Leaderboard pool", pool.refundBreakdown.unusedLeaderboard],
                                            ] as [string, number][])
                                                .filter(([, v]) => v > 0)
                                                .map(([label, value]) => (
                                                    <div key={label} className="flex items-center justify-between text-xs">
                                                        <span className="text-foreground/50 font-medium">{label}</span>
                                                        <span className="font-black text-foreground">{fmt$(value)}</span>
                                                    </div>
                                                ))}
                                            <div className="flex items-center justify-between text-sm pt-2 border-t border-border/30">
                                                <span className="font-black text-foreground/70">Total refund</span>
                                                <span className="font-black text-foreground">{fmt$(refund)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="px-5 pb-5">
                                    <button
                                        onClick={() => handleUseCredit(pool)}
                                        className="w-full flex items-center justify-center gap-2 bg-secondary border border-border/40 text-foreground py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:border-primary/30 hover:text-primary active:scale-[0.98] transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Use {fmt$(refund)} as event credit
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    <p className="text-xs text-foreground/30 font-medium text-center pt-1">
                        These amounts are credited to the on-chain balance after event finalization. Withdraw the total above, or apply as credit when creating a new event.
                    </p>
                </div>
            )}

            {refundablePools.length === 0 && onChainBalance === 0 && (
                <div className="bg-card border border-border/40 rounded-[24px] p-10 flex flex-col items-center gap-3 text-center">
                    <Wallet className="w-8 h-8 text-foreground/20" />
                    <p className="text-sm font-black text-foreground">No refunds available</p>
                    <p className="text-xs text-foreground/40 font-medium max-w-sm">
                        Refunds appear when an event ends with fewer participants than the maximum capacity.
                    </p>
                </div>
            )}

            {/* History */}
            {(data?.refundHistory ?? []).length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40">History</h2>
                    <div className="bg-card border border-border/40 rounded-[20px] divide-y divide-border/30 overflow-hidden">
                        {(data!.refundHistory as RefundHistoryItem[]).map((item, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-4">
                                <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                                    <Clock className="w-4 h-4 text-foreground/30" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-foreground truncate">{item.eventTitle}</p>
                                    <p className="text-[11px] text-foreground/40 font-medium">{fmtDate(item.timestamp)}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-foreground">{fmt$(item.amount)}</p>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                                        item.status === "CANCELLED"
                                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                                            : "bg-muted text-muted-foreground border-border"
                                    )}>
                                        {item.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <main className="w-full pt-6 lg:pt-10 pb-24 space-y-8 animate-pulse">
                {/* Header skeleton */}
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="h-16 w-72 bg-white/[0.06] rounded-2xl" />
                        <div className="h-3 w-48 bg-white/[0.04] rounded-lg" />
                    </div>
                    <div className="h-9 w-24 bg-white/[0.04] border border-white/[0.06] rounded-2xl" />
                </div>

                {/* Tabs skeleton */}
                <div className="h-10 w-48 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />

                {/* Hero balance card skeleton */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-[28px] p-6 lg:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <div className="h-3 w-24 bg-white/[0.06] rounded-lg" />
                        <div className="h-14 w-56 bg-white/[0.06] rounded-2xl" />
                        <div className="h-3 w-36 bg-white/[0.04] rounded-lg" />
                    </div>
                    <div className="flex gap-3">
                        <div className="h-11 w-32 bg-white/[0.06] rounded-xl" />
                        <div className="h-11 w-32 bg-white/[0.06] rounded-xl" />
                    </div>
                </div>

                {/* Content grid skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-3">
                        <div className="flex justify-between">
                            <div className="h-4 w-28 bg-white/[0.06] rounded-lg" />
                            <div className="h-3 w-20 bg-white/[0.04] rounded-lg" />
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] divide-y divide-white/[0.04]">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-4 px-5 py-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white/[0.06] shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-44 bg-white/[0.06] rounded-lg" />
                                        <div className="h-3 w-24 bg-white/[0.04] rounded-lg" />
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <div className="h-4 w-16 bg-white/[0.06] rounded-lg ml-auto" />
                                        <div className="h-3 w-10 bg-white/[0.04] rounded-lg ml-auto" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[24px] p-6 space-y-5 h-[360px]">
                        <div className="space-y-2">
                            <div className="h-4 w-20 bg-white/[0.06] rounded-lg" />
                            <div className="h-3 w-full bg-white/[0.04] rounded-lg" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-3 w-16 bg-white/[0.04] rounded-lg" />
                            <div className="h-11 w-full bg-white/[0.06] rounded-xl" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-3 w-24 bg-white/[0.04] rounded-lg" />
                            <div className="h-11 w-full bg-white/[0.06] rounded-xl" />
                        </div>
                        <div className="h-11 w-full bg-white/[0.06] rounded-xl mt-2" />
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                <p className="text-sm font-black text-white/40">{error}</p>
                <button onClick={loadDbData} className="text-xs font-black text-primary hover:text-primary/80 flex items-center gap-1.5 mx-auto uppercase tracking-widest">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
            </div>
        );
    }

    return (
        <main className="w-full pt-6 lg:pt-10 pb-24 md:pb-12 space-y-8 font-sans">

                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-white uppercase leading-[0.92] tracking-tight">
                            Brand Wallet
                        </h1>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                            Manage your USDC balance and campaign refunds
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-black text-white/40 hover:text-white bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] rounded-2xl transition-all"
                    >
                        <RefreshCw className={cn("w-4 h-4", balanceLoading && "animate-spin")} />
                        Refresh
                    </button>
                </div>

                {/* ── Top-level Tabs ── */}
                <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab("wallet")}
                        className={cn(
                            "px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                            activeTab === "wallet" ? "bg-white text-black" : "text-white/30 hover:text-white/60"
                        )}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("refunds")}
                        className={cn(
                            "px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                            activeTab === "refunds" ? "bg-white text-black" : "text-white/30 hover:text-white/60"
                        )}
                    >
                        Refunds
                        {refundablePools.length > 0 && (
                            <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                                activeTab === "refunds" ? "bg-primary text-white" : "bg-primary/20 text-primary"
                            )}>
                                {refundablePools.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Overview Tab ── */}
                {activeTab === "wallet" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Balance Card */}
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-[24px] p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                    <div className="w-64 h-64 bg-blue-500 rounded-full blur-[100px]" />
                                </div>

                                <div className="relative z-10 space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-4">
                                            {/* USDC Balance */}
                                            <div>
                                                <p className="text-[9px] font-black text-white/30 mb-1 tracking-[0.2em] uppercase">USDC Balance</p>
                                                <div className="flex items-baseline gap-3">
                                                    <h2 className="font-display text-5xl md:text-6xl text-white uppercase tracking-tight leading-none">
                                                        {fmt$(balance)}
                                                    </h2>
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.05] rounded-full border border-white/[0.08]">
                                                        <img src="/usdc.png" alt="USDC" className="w-3 h-3" />
                                                        <span className="text-[9px] font-black text-white/30 tracking-wider uppercase">USDC</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* On-chain Refund Balance */}
                                            {onChainBalance > 0 && (
                                                <div>
                                                    <p className="text-[9px] font-black text-white/30 mb-1 tracking-[0.2em] uppercase">Pending Refunds</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-display text-3xl text-primary/80 tracking-tight leading-none">
                                                            {fmt$(onChainBalance)}
                                                        </span>
                                                        <span className="text-sm text-white/30 font-black">USDC</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <a
                                                href={address ? `${EXPLORER_BASE}/address/${address}` : EXPLORER_BASE}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] rounded-full w-fit border border-white/[0.08] hover:border-white/[0.15] transition-colors group/badge"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover/badge:text-white/70 transition-colors">{CHAIN_NAME}</span>
                                                <ExternalLink className="w-3 h-3 text-white/20 group-hover/badge:text-white/40 transition-colors" />
                                            </a>
                                            <span className="text-[9px] text-white/20 font-mono">Chain ID: {CHAIN_ID}</span>
                                        </div>
                                    </div>

                                    {/* Address Row */}
                                    {address && (
                                        <div className="pt-4 border-t border-white/[0.05] space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Brand Wallet</span>
                                                <div className="flex items-center gap-3">
                                                    <a
                                                        href={`${EXPLORER_BASE}/address/${address}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-mono text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1"
                                                    >
                                                        {truncateAddress(address)}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button onClick={() => handleCopy(address)} className="text-white/20 hover:text-white transition-colors">
                                                        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={() => setActionTab("deposit")}
                                                    className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-sm font-black text-white/60 hover:text-white transition-all flex items-center gap-2"
                                                >
                                                    <ArrowDownLeft className="w-4 h-4" />
                                                    Deposit
                                                </button>
                                                <button
                                                    onClick={() => setActionTab("withdraw")}
                                                    className="px-4 py-2 bg-white hover:bg-white/90 text-black rounded-xl text-sm font-black transition-all flex items-center gap-2"
                                                >
                                                    <ArrowUpRight className="w-4 h-4" />
                                                    Withdraw
                                                </button>
                                                {onChainBalance > 0 && (
                                                    <motion.button
                                                        whileTap={{ scale: 0.97 }}
                                                        onClick={handleWithdrawRefund}
                                                        disabled={isWithdrawing}
                                                        className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-xl text-sm font-black text-primary transition-all flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        {isWithdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                                        Claim Refunds
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Withdraw confirmed banner */}
                            {withdrawTxHash && (
                                <div className="flex items-center gap-3 p-4 bg-green-500/[0.06] border border-green-500/20 rounded-2xl">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                                    <p className="text-sm font-black text-green-400 flex-1">Withdrawal confirmed on-chain.</p>
                                    <a
                                        href={`${EXPLORER_BASE}/tx/${withdrawTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:text-primary/80 transition-colors"
                                    >
                                        View tx <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}

                            {/* Activity History */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <History className="w-3.5 h-3.5" />
                                        Activity History
                                    </h3>
                                    {address && (
                                        <a
                                            href={`${EXPLORER_BASE}/address/${address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-black text-primary/70 hover:text-primary uppercase tracking-widest flex items-center gap-1 group transition-colors"
                                        >
                                            Explorer <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </a>
                                    )}
                                </div>

                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
                                    {(data?.refundHistory && data.refundHistory.length > 0) ? (
                                        <div className="divide-y divide-white/[0.04]">
                                            {(data.refundHistory as RefundHistoryItem[]).map((item, i) => (
                                                <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                                    <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                                                        <ArrowDownLeft className="w-4 h-4 text-green-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black text-white truncate">Refund: {item.eventTitle}</p>
                                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">{fmtDate(item.timestamp)}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="text-sm font-black text-lime-400">+${fmt$(item.amount)}</span>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                                                            item.status === "CANCELLED"
                                                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                                : "bg-white/[0.04] text-white/30 border-white/[0.08]"
                                                        )}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
                                            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                                <History className="w-6 h-6 text-white/20" />
                                            </div>
                                            <div>
                                                <p className="font-black text-white/40 text-sm uppercase tracking-wide">No activity yet</p>
                                                <p className="text-[10px] font-black text-white/20 mt-1 uppercase tracking-wide">Refunds and transactions will appear here.</p>
                                            </div>
                                            {address && (
                                                <a
                                                    href={`${EXPLORER_BASE}/address/${address}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] font-black text-primary/70 hover:text-primary uppercase tracking-widest flex items-center gap-1 transition-colors"
                                                >
                                                    View on PolygonScan <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">

                            {/* Action Panel */}
                            <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 space-y-6">
                                {/* Tabs */}
                                <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.06]">
                                    <button
                                        onClick={() => setActionTab("withdraw")}
                                        className={cn(
                                            "py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                                            actionTab === "withdraw" ? "bg-white text-black" : "text-white/30 hover:text-white/60"
                                        )}
                                    >
                                        Withdraw
                                    </button>
                                    <button
                                        onClick={() => setActionTab("deposit")}
                                        className={cn(
                                            "py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                                            actionTab === "deposit" ? "bg-white text-black" : "text-white/30 hover:text-white/60"
                                        )}
                                    >
                                        Deposit
                                    </button>
                                </div>

                                <div className="min-h-[300px]">
                                    {actionTab === "withdraw" ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div>
                                                <h3 className="font-display text-2xl text-white uppercase tracking-tight">Send Funds</h3>
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-wide mt-1">Enter an EVM address to withdraw to.</p>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Amount</label>
                                                    <div className="relative group">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-black">$</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={sendAmount}
                                                            onChange={(e) => setSendAmount(e.target.value)}
                                                            className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] rounded-xl pl-8 pr-16 py-3.5 text-white focus:ring-1 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder-white/20 font-mono text-lg"
                                                        />
                                                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded hover:bg-primary/20 transition-colors uppercase tracking-widest">
                                                            MAX
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">EVM Address</label>
                                                    <input
                                                        type="text"
                                                        placeholder="0x..."
                                                        value={sendAddress}
                                                        onChange={(e) => setSendAddress(e.target.value)}
                                                        className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] rounded-xl px-4 py-3.5 text-white focus:ring-1 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder-white/20 font-mono text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Network</label>
                                                    <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                                        <span className="text-white/60 text-sm font-black">{CHAIN_NAME}</span>
                                                        <span className="ml-auto text-[9px] text-white/20 font-mono">ID: {CHAIN_ID}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                disabled
                                                className="w-full bg-white/[0.05] cursor-not-allowed text-white/20 font-black text-[11px] uppercase tracking-[0.2em] py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                Withdraw Funds
                                                <span className="text-[9px] font-black text-white/20 normal-case tracking-normal">(coming soon)</span>
                                            </button>

                                            <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                                                <AlertCircle className="w-4 h-4 text-yellow-500/50 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-black text-yellow-500/50 leading-relaxed uppercase tracking-wide">
                                                    Only send assets to EVM-compatible wallets on Polygon Amoy.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div>
                                                <h3 className="font-display text-2xl text-white uppercase tracking-tight">Deposit USDC</h3>
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-wide mt-1">Scan or copy your address to deposit.</p>
                                            </div>

                                            {address ? (
                                                <>
                                                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-4 border-white/90 shadow-xl">
                                                        <QRCodeSVG value={address} size={180} />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Your Address</label>
                                                        <div
                                                            className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] rounded-xl px-4 py-3.5 flex items-center justify-between group/copy cursor-pointer transition-colors"
                                                            onClick={() => handleCopy(address)}
                                                        >
                                                            <span className="font-mono text-white/60 text-sm truncate mr-2 select-all">
                                                                {truncateAddress(address)}
                                                            </span>
                                                            {copied ? (
                                                                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest animate-in fade-in">Copied!</span>
                                                            ) : (
                                                                <Copy className="w-4 h-4 text-white/20 group-hover/copy:text-white/50 transition-colors" />
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-mono text-white/15 break-all px-1">{address}</p>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[9px] font-black text-white/30 bg-white/[0.04] py-2 px-3 rounded-xl border border-white/[0.06] uppercase tracking-widest">
                                                        <span className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                            {CHAIN_NAME}
                                                        </span>
                                                        <a
                                                            href={`${EXPLORER_BASE}/address/${address}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 hover:text-white transition-colors"
                                                        >
                                                            Explorer <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                                                    <Wallet className="w-8 h-8 text-white/15" />
                                                    <p className="text-[10px] font-black text-white/25 uppercase tracking-widest">Wallet not connected</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* How it works */}
                            <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 space-y-5">
                                <div className="flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5 text-white/30" />
                                    <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
                                        How brand wallet works
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <Shield className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white/70">Privy Embedded Wallet</p>
                                            <p className="text-[10px] font-black text-white/30 mt-0.5 leading-relaxed">
                                                Your brand wallet is a non-custodial smart account secured by Privy MPC. You hold the keys.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white/70">Gasless Transactions</p>
                                            <p className="text-[10px] font-black text-white/30 mt-0.5 leading-relaxed">
                                                Campaign deposits and refund withdrawals are sponsored — no POL required to interact.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <KeyRound className="w-4 h-4 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white/70">Full Self-Custody</p>
                                            <p className="text-[10px] font-black text-white/30 mt-0.5 leading-relaxed">
                                                Export your private key anytime and import into any EVM wallet — you always have full control.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
                                    <span className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-black">Network</span>
                                    <a
                                        href="https://amoy.polygonscan.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] text-primary/60 hover:text-primary font-mono flex items-center gap-1 transition-colors"
                                    >
                                        Polygon Amoy Testnet <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Refunds Tab ── */}
                {activeTab === "refunds" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* On-chain balance card */}
                        <div className={cn(
                            "bg-white/[0.03] border rounded-[24px] p-8 relative overflow-hidden group",
                            onChainBalance > 0 ? "border-primary/30" : "border-white/[0.06]"
                        )}>
                            {onChainBalance > 0 && (
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                    <div className="w-64 h-64 bg-primary rounded-full blur-[100px]" />
                                </div>
                            )}

                            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
                                <div className="flex items-center gap-5 flex-1">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border",
                                        onChainBalance > 0 ? "bg-primary/10 border-primary/20" : "bg-white/[0.04] border-white/[0.06]"
                                    )}>
                                        {balanceLoading
                                            ? <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                                            : <DollarSign className={cn("w-7 h-7", onChainBalance > 0 ? "text-primary" : "text-white/20")} />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-white/30 mb-1 tracking-[0.2em] uppercase">On-Chain Refund Balance</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-display text-4xl text-white uppercase tracking-tight leading-none">
                                                ${fmt$(onChainBalance)}
                                            </span>
                                            <span className="text-sm text-white/30 font-black">USDC</span>
                                        </div>
                                        <p className="text-[9px] font-black text-white/20 mt-1 uppercase tracking-widest">
                                            Live from RewardsVault contract
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                    {onChainBalance > 0 && (
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleWithdrawRefund}
                                            disabled={isWithdrawing || !isConnected}
                                            className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                                        >
                                            {isWithdrawing
                                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Withdrawing…</>
                                                : <><Wallet className="w-3.5 h-3.5" /> Withdraw</>
                                            }
                                        </motion.button>
                                    )}
                                    <button
                                        onClick={loadOnChainBalance}
                                        disabled={balanceLoading}
                                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all disabled:opacity-40"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", balanceLoading && "animate-spin")} />
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            {!isConnected && (
                                <div className="mt-5 flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                                    <AlertCircle className="w-4 h-4 text-yellow-500/50 shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-black text-yellow-500/50 uppercase tracking-wide">
                                        Connect your brand wallet to check on-chain balance and withdraw.
                                    </p>
                                </div>
                            )}

                            {withdrawTxHash && (
                                <div className="mt-5 flex items-center gap-3 p-3 bg-green-500/[0.06] border border-green-500/20 rounded-xl">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                    <p className="text-[10px] font-black text-green-400 flex-1 uppercase tracking-wide">Withdrawal confirmed.</p>
                                    <a
                                        href={`${EXPLORER_BASE}/tx/${withdrawTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-black text-primary flex items-center gap-1 hover:text-primary/80 transition-colors uppercase tracking-widest"
                                    >
                                        View tx <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Per-event breakdown */}
                        {refundablePools.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Gift className="w-3.5 h-3.5" />
                                        By Event
                                        <span className="text-primary font-black">(${fmt$(dbTotal)} projected)</span>
                                    </h3>
                                    <button
                                        onClick={handleUseAllCredit}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20 rounded-xl uppercase tracking-widest transition-all"
                                    >
                                        <Plus className="w-3 h-3" /> Use all as credit
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {refundablePools.map((pool) => {
                                        const refund = pool.refundBreakdown?.totalRefund ?? 0;
                                        const isExpanded = expandedId === pool.eventId;
                                        const unusedSlots = Math.max(0, pool.maxParticipants - pool.participantCount);

                                        return (
                                            <div key={pool.eventId} className="bg-white/[0.02] border border-white/[0.05] rounded-[20px] overflow-hidden">
                                                <div className="p-5 flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                                                        pool.status === "CANCELLED"
                                                            ? "bg-red-500/10 border-red-500/20"
                                                            : "bg-green-500/10 border-green-500/20"
                                                    )}>
                                                        <DollarSign className={cn("w-5 h-5", pool.status === "CANCELLED" ? "text-red-400" : "text-green-400")} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-black text-white truncate">
                                                                {(pool as any).eventTitle ?? pool.eventId.slice(0, 12) + "…"}
                                                            </p>
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                                                                pool.status === "CANCELLED"
                                                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                                    : "bg-white/[0.04] text-white/30 border-white/[0.08]"
                                                            )}>
                                                                {pool.status === "CANCELLED" ? "Cancelled" : "Completed"}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">
                                                            {unusedSlots} unused slot{unusedSlots !== 1 ? "s" : ""} · {pool.participantCount}/{pool.maxParticipants} participated
                                                        </p>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <p className="font-display text-2xl text-white tracking-tight uppercase">${fmt$(refund)}</p>
                                                        <button
                                                            onClick={() => setExpandedId(isExpanded ? null : pool.eventId)}
                                                            className="text-[9px] font-black text-white/30 hover:text-white/60 uppercase tracking-widest flex items-center gap-0.5 ml-auto transition-colors"
                                                        >
                                                            Breakdown {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && pool.refundBreakdown && (
                                                    <div className="px-5 pb-4 border-t border-white/[0.04]">
                                                        <div className="pt-4 space-y-2">
                                                            {([
                                                                ["Base pool (unused)", pool.refundBreakdown.unusedBase],
                                                                ["Creator pool (unused)", pool.refundBreakdown.unusedCreator],
                                                                ["Platform fee (refunded)", pool.refundBreakdown.platformFee],
                                                                ["Top voter pool", pool.refundBreakdown.unusedTop],
                                                                ["Leaderboard pool", pool.refundBreakdown.unusedLeaderboard],
                                                            ] as [string, number][])
                                                                .filter(([, v]) => v > 0)
                                                                .map(([label, value]) => (
                                                                    <div key={label} className="flex items-center justify-between">
                                                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-wide">{label}</span>
                                                                        <span className="text-[10px] font-black text-white">${fmt$(value)}</span>
                                                                    </div>
                                                                ))}
                                                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                                                                <span className="text-[10px] font-black text-white/50 uppercase tracking-wide">Total refund</span>
                                                                <span className="text-sm font-black text-white">${fmt$(refund)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="px-5 pb-5">
                                                    <button
                                                        onClick={() => handleUseCredit(pool)}
                                                        className="w-full flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-primary/30 text-white/50 hover:text-primary py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-[0.98] transition-all"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Use ${fmt$(refund)} as event credit
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <p className="text-[9px] font-black text-white/20 text-center pt-1 uppercase tracking-wide">
                                    Amounts credited to on-chain balance after event finalization. Withdraw above or apply as credit when creating a new event.
                                </p>
                            </div>
                        )}

                        {/* Empty state */}
                        {refundablePools.length === 0 && onChainBalance === 0 && (
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] py-16 px-6 flex flex-col items-center gap-4 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                    <Wallet className="w-6 h-6 text-white/20" />
                                </div>
                                <div>
                                    <p className="font-black text-white/40 text-sm uppercase tracking-wide">No refunds available</p>
                                    <p className="text-[10px] font-black text-white/20 mt-1 uppercase tracking-wide max-w-sm">
                                        Refunds appear when an event ends with fewer participants than its maximum capacity.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Refund History */}
                        {(data?.refundHistory ?? []).length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <History className="w-3.5 h-3.5" />
                                    Refund History
                                </h3>
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden divide-y divide-white/[0.04]">
                                    {(data!.refundHistory as RefundHistoryItem[]).map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                                                <Clock className="w-4 h-4 text-white/30" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-white truncate">{item.eventTitle}</p>
                                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">{fmtDate(item.timestamp)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-sm font-black text-lime-400">+${fmt$(item.amount)}</span>
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                                                    item.status === "CANCELLED"
                                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                        : "bg-white/[0.04] text-white/30 border-white/[0.08]"
                                                )}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
        </main>
    );
}
