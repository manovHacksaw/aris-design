"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ChevronLeft, Wallet, CheckCircle2, ChevronDown, ChevronUp,
    Loader2, AlertCircle, DollarSign, RefreshCw, Clock, Plus,
    ExternalLink, AlertTriangle,
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt$(n?: number) {
    if (!n) return "$0.00";
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const POLYGONSCAN = "https://amoy.polygonscan.com/tx/";

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BrandRefundsPage() {
    const router = useRouter();
    const { address, isConnected, sendTransaction, publicClient } = useWallet();

    const [data, setData] = useState<BrandRefundsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // On-chain refund balance (from contract)
    const [onChainBalance, setOnChainBalance] = useState<number>(0);
    const [balanceLoading, setBalanceLoading] = useState(false);

    // Withdrawal state
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);

    // Per-pool UI
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // ── Load DB refund data ──────────────────────────────────────────────────
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

    // ── Load on-chain balance ────────────────────────────────────────────────
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
        if (isConnected) loadOnChainBalance();
    }, [isConnected, loadOnChainBalance]);

    // ── On-chain withdraw ────────────────────────────────────────────────────
    async function handleWithdraw() {
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
            const data = encodeWithdrawRefund();
            const txHash = await sendTransaction({
                to: REWARDS_VAULT_ADDRESS,
                data,
            });

            setWithdrawTxHash(txHash);

            // Wait for confirmation
            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}`, timeout: 120_000 });
            }

            toast.success(`${fmt$(onChainBalance)} USDC withdrawn to your wallet!`, { id: toastId });
            setOnChainBalance(0);
            await loadOnChainBalance(); // refresh
        } catch (e: any) {
            console.error("Withdraw failed:", e);
            toast.error(e?.message?.split("\n")[0] ?? "Withdrawal failed", { id: toastId });
        } finally {
            setIsWithdrawing(false);
        }
    }

    // ── Use as event credit ──────────────────────────────────────────────────
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

    // ── Derived values ───────────────────────────────────────────────────────
    const refundablePools = (data?.pools ?? []).filter(
        (p) => (p.refundBreakdown?.totalRefund ?? 0) > 0
    );
    const dbTotal = refundablePools.reduce((s, p) => s + (p.refundBreakdown?.totalRefund ?? 0), 0);

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-7 h-7 animate-spin text-primary/50" />
            </div>
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
        <div className="max-w-3xl mx-auto px-4 md:px-0 pb-24 space-y-8">
            {/* Header */}
            <div className="pt-8">
                <Link href="/brand/dashboard" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors mb-6">
                    <ChevronLeft className="w-4 h-4" /> Back
                </Link>
                <h1 className="text-3xl font-black tracking-tighter text-foreground mb-1">Refunds</h1>
                <p className="text-sm text-foreground/50 font-medium">
                    Unused USDC from ended events — withdraw to your wallet or apply as event credit.
                </p>
            </div>

            {/* On-chain balance card (primary action) */}
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
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-0.5">On-Chain Refund Balance</p>
                            <p className="text-3xl font-black tracking-tighter text-foreground">
                                {fmt$(onChainBalance)}
                            </p>
                            <p className="text-xs text-foreground/40 font-medium mt-0.5">
                                Live from RewardsVault contract
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        {onChainBalance > 0 && (
                            <button
                                onClick={handleWithdraw}
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

                {/* Wallet not connected warning */}
                {!isConnected && (
                    <div className="mt-4 flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-400 font-medium">
                            Connect your brand wallet to check on-chain balance and withdraw.
                        </p>
                    </div>
                )}

                {/* Tx confirmation */}
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

            {/* Per-event breakdown + "Use as credit" */}
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

                                {/* Breakdown */}
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

                                {/* Use as credit action */}
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
}
