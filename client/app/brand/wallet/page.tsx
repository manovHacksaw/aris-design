"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ChevronLeft, Wallet, CheckCircle2, ChevronDown, ChevronUp,
    Loader2, AlertCircle, DollarSign, RefreshCw, Clock, Plus,
    ExternalLink, AlertTriangle, ArrowUpRight, ArrowDownLeft
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

// Helpers
function fmt$(n?: number | string) {
    if (!n) return "$0.00";
    const num = typeof n === "string" ? parseFloat(n) : n;
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const POLYGONSCAN = "https://amoy.polygonscan.com/tx/";

export default function BrandWalletPage() {
    const router = useRouter();
    const { address, isConnected, balance, sendTransaction, publicClient, refreshBalance } = useWallet();

    const [activeTab, setActiveTab] = useState<"wallet" | "refunds">("wallet");

    // Refunds State
    const [data, setData] = useState<BrandRefundsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [onChainBalance, setOnChainBalance] = useState<number>(0);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Send Funds State
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

    useEffect(() => {
        loadDbData();
    }, []);

    useEffect(() => {
        if (isConnected) {
            loadOnChainBalance();
            refreshBalance();
        }
    }, [isConnected, loadOnChainBalance, refreshBalance]);

    async function handleWithdrawRefund() {
        if (!isConnected || !address) {
            toast.error("Connect your wallet first.");
            return;
        }
        if (onChainBalance <= 0) {
            toast.error("No on-chain refund balance to withdraw.");
            return;
        }

        setIsWithdrawing(true);
        const toastId = "withdraw-refund";
        toast.loading(`Withdrawing ${fmt$(onChainBalance)} USDC…`, { id: toastId });

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

            toast.success(`${fmt$(onChainBalance)} USDC withdrawn to your wallet!`, { id: toastId });
            setOnChainBalance(0);
            await loadOnChainBalance();
            await refreshBalance();
        } catch (e: any) {
            console.error("Withdraw failed:", e);
            toast.error(e?.message?.split("\n")[0] ?? "Withdrawal failed", { id: toastId });
        } finally {
            setIsWithdrawing(false);
        }
    }

    function handleUseCredit(pool: RefundPool) {
        const amount = pool.refundBreakdown?.totalRefund ?? 0;
        if (amount <= 0) { toast.error("No refund available for this event."); return; }
        saveRefundCredit(amount, [pool.eventId]);
        toast.success(`${fmt$(amount)} credit saved — apply it when creating your next event.`);
        router.push("/brand/create-event");
    }

    function handleUseAllCredit() {
        const pools = data?.pools ?? [];
        const refundable = pools.filter((p) => (p.refundBreakdown?.totalRefund ?? 0) > 0);
        const total = refundable.reduce((s, p) => s + (p.refundBreakdown?.totalRefund ?? 0), 0);
        if (total <= 0) return;
        saveRefundCredit(total, refundable.map((p) => p.eventId));
        toast.success(`${fmt$(total)} credit saved for your next event.`);
        router.push("/brand/create-event");
    }

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
                        <h2 className="font-display text-5xl lg:text-6xl text-white uppercase tracking-tight">
                            {fmt$(balance)}
                        </h2>
                        <span className="font-display text-2xl text-white/40 uppercase tracking-tight">USDC</span>
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
                            href={`${POLYGONSCAN}${withdrawTxHash}`}
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
            <main className="w-full pb-24 pt-2 space-y-6 animate-pulse">
                {/* Header Skeleton */}
                <div className="mb-4 space-y-3">
                    <div className="h-9 bg-secondary border border-border/40 rounded-xl w-64" />
                    <div className="h-5 bg-secondary border border-border/40 rounded-lg w-full max-w-md" />
                </div>

                {/* Tabs Skeleton */}
                <div className="flex items-center gap-4 border-b border-border/40 pb-2 pt-2">
                    <div className="h-8 bg-secondary border border-border/40 rounded-lg w-24" />
                    <div className="h-8 bg-secondary border border-border/40 rounded-lg w-32" />
                </div>

                {/* Content Skeleton */}
                <div className="pt-4 space-y-6">
                    {/* Hero Card Skeleton */}
                    <div className="bg-card border border-border/40 rounded-[28px] p-6 lg:p-8 h-48 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4 w-full">
                            <div className="h-4 bg-secondary border border-border/40 rounded-lg w-32" />
                            <div className="h-16 bg-secondary border border-border/40 rounded-2xl w-64" />
                            <div className="h-4 bg-secondary border border-border/40 rounded-lg w-40" />
                        </div>
                        <div className="flex gap-3">
                            <div className="h-12 w-32 bg-secondary border border-border/40 rounded-xl" />
                            <div className="h-12 w-32 bg-secondary border border-border/40 rounded-xl" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Col Skeleton */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="h-5 bg-secondary border border-border/40 rounded-lg w-32" />
                                <div className="h-4 bg-secondary border border-border/40 rounded-lg w-24" />
                            </div>
                            <div className="bg-card border border-border/40 rounded-[20px] divide-y divide-border/30">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                                        <div className="w-10 h-10 rounded-2xl bg-secondary border border-border/40 shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-secondary border border-border/40 rounded-lg w-48" />
                                            <div className="h-3 bg-secondary border border-border/40 rounded-lg w-24" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-4 bg-secondary border border-border/40 rounded-lg w-16" />
                                            <div className="h-3 bg-secondary border border-border/40 rounded-lg w-10 ml-auto" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Col Skeleton */}
                        <div className="space-y-4">
                            <div className="bg-card border border-border/40 rounded-[24px] p-6 space-y-6 h-[400px]">
                                <div className="space-y-2">
                                    <div className="h-5 bg-secondary border border-border/40 rounded-lg w-24" />
                                    <div className="h-4 bg-secondary border border-border/40 rounded-lg w-full" />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="h-3 bg-secondary border border-border/40 rounded-lg w-16" />
                                        <div className="h-12 bg-secondary border border-border/40 rounded-xl w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 bg-secondary border border-border/40 rounded-lg w-24" />
                                        <div className="h-12 bg-secondary border border-border/40 rounded-xl w-full" />
                                    </div>
                                    <div className="h-12 bg-secondary border border-border/40 rounded-xl w-full mt-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                <p className="text-sm font-bold text-foreground/60">{error}</p>
                <button onClick={loadDbData} className="text-xs font-black text-primary hover:underline flex items-center gap-1.5 mx-auto">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
            </div>
        );
    }

    return (
        <main className="w-full pb-24 pt-2 space-y-6">
            {/* Header */}
            <div className="mb-4">
            <h1 className="font-display text-4xl text-white uppercase tracking-tight mb-2">Brand Wallet</h1>
            <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">
                Manage your earnings, deposits, and refunds from past campaigns.
            </p>
        </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-border/40 pb-px">
                <button
                    onClick={() => setActiveTab("wallet")}
                    className={cn(
                        "px-4 py-3 text-sm font-black border-b-2 transition-colors",
                        activeTab === "wallet"
                            ? "border-primary text-foreground"
                            : "border-transparent text-foreground/40 hover:text-foreground/70"
                    )}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab("refunds")}
                    className={cn(
                        "px-4 py-3 text-sm font-black border-b-2 transition-colors",
                        activeTab === "refunds"
                            ? "border-primary text-foreground"
                            : "border-transparent text-foreground/40 hover:text-foreground/70"
                    )}
                >
                    Refunds Center
                </button>
            </div>

            {/* Content */}
            <div className="pt-4">
                {activeTab === "wallet" ? renderWalletTab() : renderRefundsTab()}
            </div>
        </main>
    );
}
