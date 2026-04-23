"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import {
  Copy, ArrowUpRight, ArrowDownLeft, Clock,
  History, AlertCircle, RefreshCw, ExternalLink, Wallet,
  CheckCircle2, Shield, KeyRound, Zap, Info, Gift, Trophy, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/context/WalletContext";
import { useUser } from "@/context/UserContext";
import { formatUnits } from "@/lib/blockchain/client";
import {
  getClaimableRewards,
  getRewardHistory,
  claimPendingRewards,
  ClaimableRewardsResponse,
  ClaimHistoryEntry,
  CLAIM_TYPE_LABEL,
} from "@/services/reward.service";
import ClaimModal from "@/components/rewards/ClaimModal";

const EXPLORER_BASE = "https://amoy.polygonscan.com";
const CHAIN_NAME = "Polygon Amoy";
const CHAIN_ID = 80002;

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatPOL(raw: bigint): string {
  const val = parseFloat(formatUnits(raw, 18));
  if (val === 0) return "0.0000";
  if (val < 0.0001) return "< 0.0001";
  return val.toFixed(4);
}

export default function WalletPage() {
  const {
    address,
    eoaAddress,
    balance: usdcBalance,
    publicClient,
    isConnected,
    isLoading: walletLoading,
    refreshBalance,
  } = useWallet();
  const {
    user,
    isAuthenticated: userAuthenticated,
    isLoading: userLoading,
  } = useUser();
  const userId = user?.id ?? null;

  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"withdraw" | "deposit">("withdraw");
  const [polBalance, setPolBalance] = useState<string>("0.0000");
  const [isFetchingMatic, setIsFetchingMatic] = useState(false);

  // Rewards state
  const [rewards, setRewards] = useState<ClaimableRewardsResponse | null>(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [allClaimed, setAllClaimed] = useState(false);
  const [displayUsdc, setDisplayUsdc] = useState<string>("0.00");
  const countUpRef = useRef<number | null>(null);
  const [claimHistory, setClaimHistory] = useState<ClaimHistoryEntry[]>([]);

  const [claimingPending, setClaimingPending] = useState(false);
  const [pendingClaimError, setPendingClaimError] = useState<string | null>(null);
  const [pendingClaimSuccess, setPendingClaimSuccess] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const recentNonClaimableRewards = claimHistory.slice(0, 3);

  // Mobile sheet state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  const fetchMaticBalance = useCallback(async () => {
    if (!address || !publicClient) return;
    setIsFetchingMatic(true);
    try {
      const raw = await publicClient.getBalance({ address });
      setPolBalance(formatPOL(raw));
    } catch {
      setPolBalance("—");
    } finally {
      setIsFetchingMatic(false);
    }
  }, [address, publicClient]);

  const fetchRewards = useCallback(async () => {
    if (!userAuthenticated || !userId) {
      setRewards(null);
      setRewardsLoading(false);
      return;
    }
    setRewardsLoading(true);
    try {
      const data = await getClaimableRewards();
      setRewards(data);
      if (data.totalClaimableUsdc > 0) setAllClaimed(false);
    } catch (error) {
      console.warn("WalletPage: failed to fetch claimable rewards", error);
      setRewards(null);
    } finally {
      setRewardsLoading(false);
    }
  }, [userAuthenticated, userId]);

  const fetchHistory = useCallback(async () => {
    if (!userAuthenticated || !userId) {
      setClaimHistory([]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await getRewardHistory();
      setClaimHistory(data);
    } catch (error) {
      console.warn("WalletPage: failed to fetch reward history", error);
      setClaimHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userAuthenticated, userId]);

  const hasSmartAccount = !!(address && eoaAddress && address.toLowerCase() !== eoaAddress.toLowerCase());
  const pendingEvents = rewards?.events.filter(ev => ev.claims.some(c => c.status === 'PENDING')) ?? [];
  const hasPendingRewards = pendingEvents.length > 0;
  const totalPendingUsdc = pendingEvents.reduce((sum, ev) => sum + ev.claims.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.finalAmount, 0), 0);

  const handleClaimPending = async () => {
    setPendingClaimError(null);
    setPendingClaimSuccess(false);
    setClaimingPending(true);
    try {
      const result = await claimPendingRewards();
      if (result.claimsCredited > 0) {
        setPendingClaimSuccess(true);
        await fetchRewards();
        await fetchHistory();
        refreshBalance?.();
      } else {
        setPendingClaimError(result.errors[0] ?? 'No rewards were claimed.');
      }
    } catch (err: any) {
      setPendingClaimError(err.message ?? 'Failed to claim pending rewards.');
    } finally {
      setClaimingPending(false);
    }
  };

  function animateCountUp(from: number, to: number) {
    const duration = 1200;
    const start = performance.now();
    if (countUpRef.current) cancelAnimationFrame(countUpRef.current);
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayUsdc((from + (to - from) * eased).toFixed(2));
      if (progress < 1) countUpRef.current = requestAnimationFrame(tick);
    };
    countUpRef.current = requestAnimationFrame(tick);
  }

  const handleClaimSuccess = useCallback(
    async (claimedUsdc: number) => {
      setClaimModalOpen(false);
      setAllClaimed(true);
      const prev = parseFloat(usdcBalance) || 0;
      animateCountUp(prev, prev + claimedUsdc);
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ["#3B82F6", "#10B981", "#F59E0B"] });
      } catch { }
      setTimeout(() => { refreshBalance(); fetchHistory(); }, 1400);
    },
    [usdcBalance, refreshBalance, fetchHistory]
  );

  useEffect(() => {
    if (!isConnected || !address) {
      setRewards(null);
      setClaimHistory([]);
      setAllClaimed(false);
      return;
    }
    fetchMaticBalance();
    refreshBalance();
    if (!userLoading && userAuthenticated && userId) {
      fetchRewards();
      fetchHistory();
    }
  }, [address, fetchHistory, fetchMaticBalance, fetchRewards, isConnected, refreshBalance, userId, userAuthenticated, userLoading]);

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    await Promise.all([fetchMaticBalance(), refreshBalance(), fetchRewards(), fetchHistory()]);
  };

  const isSmartAccount = !!(address && eoaAddress && address !== eoaAddress);

  const openMobileSheet = (tab: "withdraw" | "deposit") => {
    setActiveTab(tab);
    setMobileSheetOpen(true);
  };

  const usdcDisplayValue = allClaimed && displayUsdc !== "0.00"
    ? displayUsdc
    : parseFloat(usdcBalance) > 0 ? usdcBalance : "0.00";

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background text-white font-sans">
        <SidebarLayout>
          <main className="w-full pt-5 sm:pt-6 lg:pt-10 pb-20 md:pb-12 space-y-5 sm:space-y-8 max-w-2xl">
            <div className="space-y-2">
              <div className="h-14 w-36 rounded-xl bg-white/[0.07] animate-pulse" />
              <div className="h-3 w-48 rounded-lg bg-white/[0.04] animate-pulse" />
            </div>
            <div className="rounded-[28px] bg-white/[0.03] border border-white/[0.06] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded-md bg-white/[0.06] animate-pulse" />
                  <div className="h-10 w-32 rounded-xl bg-white/[0.07] animate-pulse" />
                </div>
                <div className="h-8 w-8 rounded-full bg-white/[0.05] animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-28 rounded-md bg-white/[0.05] animate-pulse" />
                <div className="h-3 w-16 rounded-md bg-white/[0.04] animate-pulse" />
              </div>
              <div className="flex gap-3 pt-2">
                <div className="h-10 flex-1 rounded-xl bg-white/[0.05] animate-pulse" />
                <div className="h-10 flex-1 rounded-xl bg-white/[0.05] animate-pulse" />
              </div>
            </div>
            <div className="rounded-[28px] bg-white/[0.03] border border-white/[0.06] p-6 space-y-4">
              <div className="h-3 w-32 rounded-md bg-white/[0.05] animate-pulse" />
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded-md bg-white/[0.06] animate-pulse" />
                    <div className="h-2.5 w-1/3 rounded-md bg-white/[0.04] animate-pulse" />
                  </div>
                  <div className="h-4 w-10 rounded-md bg-white/[0.06] animate-pulse" />
                </div>
              ))}
            </div>
          </main>
        </SidebarLayout>
      </div>
    );
  }

  // ─── Shared form content ──────────────────────────────────────────────────

  const WithdrawContent = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", compact ? "" : "sm:space-y-6")}>
      {!compact && (
        <div>
          <h3 className="font-display text-xl sm:text-2xl text-white uppercase tracking-tight">Send Funds</h3>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-wide mt-1">Enter an EVM address to withdraw to.</p>
        </div>
      )}
      <div className="space-y-3">
        {/* Amount */}
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-black text-sm">$</span>
          <input
            type="number"
            placeholder="0.00"
            className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] rounded-xl pl-8 pr-16 py-3 text-white focus:ring-1 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder-white/20 font-mono text-lg"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded hover:bg-primary/20 transition-colors uppercase tracking-widest">
            MAX
          </button>
        </div>
        {/* Address */}
        <input
          type="text"
          placeholder="0x... destination address"
          value={withdrawAddress}
          onChange={(e) => setWithdrawAddress(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder-white/20 font-mono text-sm"
        />
        {/* Network */}
        <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-white/50 text-xs font-black">{CHAIN_NAME}</span>
          <span className="ml-auto text-[9px] text-white/20 font-mono">ID: {CHAIN_ID}</span>
        </div>
      </div>
      <button
        disabled
        className="w-full bg-white/[0.05] cursor-not-allowed text-white/20 font-black text-[11px] uppercase tracking-[0.2em] py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        Withdraw Funds
        <span className="text-[9px] font-black text-white/20 normal-case tracking-normal">(coming soon)</span>
      </button>
      <div className="flex items-center gap-2 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
        <AlertCircle className="w-3.5 h-3.5 text-yellow-500/50 shrink-0" />
        <p className="text-[10px] font-black text-yellow-500/50 uppercase tracking-wide leading-snug">
          Only send to EVM wallets on Polygon Amoy.
        </p>
      </div>
    </div>
  );

  const DepositContent = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", compact ? "" : "sm:space-y-6")}>
      {!compact && (
        <div>
          <h3 className="font-display text-xl sm:text-2xl text-white uppercase tracking-tight">Deposit POL</h3>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-wide mt-1">Scan or copy your address to deposit.</p>
        </div>
      )}
      {address ? (
        <>
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-4 border-white/90 shadow-xl">
            <QRCodeSVG value={address} size={compact ? 140 : 160} />
          </div>
          <div
            className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] rounded-xl px-4 py-3 flex items-center justify-between group/copy cursor-pointer transition-colors"
            onClick={() => handleCopy(address)}
          >
            <span className="font-mono text-white/60 text-sm truncate mr-2 select-all">
              {truncateAddress(address)}
            </span>
            <div className="flex items-center gap-2">
              {copied ? (
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest animate-in fade-in">Copied!</span>
              ) : (
                <Copy className="w-4 h-4 text-white/20 group-hover/copy:text-white/50 transition-colors" />
              )}
            </div>
          </div>
          <p className="text-[9px] font-mono text-white/15 break-all px-1">{address}</p>
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
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <SidebarLayout>
        <main className="w-full pt-5 sm:pt-6 lg:pt-10 pb-32 md:pb-12 space-y-4 sm:space-y-8">

          {/* ── Header ── */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="font-display text-[2.5rem] sm:text-[3rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight flex items-center gap-4">
                Wallet
                {rewards && rewards.totalClaimableUsdc > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  />
                )}
              </h1>
              <p className="mt-1 text-[9px] sm:text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">
                Manage your digital assets
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-white/40 hover:text-white bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] rounded-2xl transition-all"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isFetchingMatic && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* ── Testnet Disclaimer ── */}
          {/* Mobile: compact strip */}
          <div className="lg:hidden flex items-center gap-3 bg-primary/[0.08] border border-primary/20 rounded-2xl px-4 py-3">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-primary uppercase tracking-wider">Testnet Phase</p>
              <p className="text-[10px] font-medium text-primary/60 leading-tight mt-0.5">
                Test USDC only — mainnet rewards coming at launch.
              </p>
            </div>
          </div>
          {/* Desktop: full card */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:flex bg-primary/10 border border-primary/20 rounded-[24px] p-6 items-start gap-4"
          >
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary">Testnet Rewards</h3>
              <p className="text-xs font-medium text-primary/70 leading-relaxed max-w-2xl">
                Aris is currently in <strong>Testnet Phase</strong>. The USDC shown in your wallet is test currency on the Polygon Amoy network.
                All rewards earned during this phase are tracking your participation and will be <strong>redeemable for mainnet rewards</strong> or carry over as platform benefits when we launch.
              </p>
            </div>
          </motion.div>

          {/* ── Mobile balance hero ── */}
          <div className="lg:hidden bg-white/[0.03] border border-white/[0.06] rounded-[20px] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <div className="w-48 h-48 bg-purple-500 rounded-full blur-[80px]" />
            </div>
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">USDC Balance</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-display text-4xl text-white uppercase tracking-tight leading-none">
                    {usdcDisplayValue}
                  </span>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-white/[0.05] rounded-full border border-white/[0.08]">
                    <img src="/usdc.png" alt="USDC" className="w-3 h-3" />
                    <span className="text-[9px] font-black text-white/30 tracking-wider uppercase">USDC</span>
                  </div>
                </div>
                {address && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleCopy(address)}
                      className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1 transition-colors hover:bg-white/[0.08]"
                    >
                      <span className="font-mono text-[11px] text-white/40">{truncateAddress(address)}</span>
                      {copied
                        ? <CheckCircle2 className="w-3 h-3 text-green-400" />
                        : <Copy className="w-3 h-3 text-white/20" />}
                    </button>
                    <a
                      href={`${EXPLORER_BASE}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:border-white/20 transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <ExternalLink className="w-3 h-3 text-white/20" />
                    </a>
                  </div>
                )}
              </div>
              {/* Claim rewards CTA on mobile if available */}
              {rewards && rewards.totalClaimableUsdc > 0 && !allClaimed && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setClaimModalOpen(true)}
                  className="shrink-0 flex flex-col items-center gap-1 bg-primary/15 border border-primary/30 rounded-2xl px-3 py-2.5 hover:bg-primary/25 transition-colors"
                >
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-wider leading-none">
                    ${rewards.totalClaimableUsdc.toFixed(2)}
                  </span>
                  <span className="text-[8px] font-black text-primary/60 uppercase tracking-wider leading-none">Claim</span>
                </motion.button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* ── Left Column ── */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">

              {/* Balance Card — desktop only (mobile has the hero above) */}
              <div className="hidden lg:block bg-white/[0.03] border border-white/[0.06] rounded-[24px] p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <div className="w-64 h-64 bg-purple-500 rounded-full blur-[100px]" />
                </div>
                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-4 min-w-0">
                      <div>
                        <p className="text-[9px] font-black text-white/30 mb-1 tracking-[0.2em] uppercase">USDC Balance</p>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h2 className="font-display text-5xl md:text-6xl text-white uppercase tracking-tight leading-none">
                            {usdcDisplayValue}
                          </h2>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.05] rounded-full border border-white/[0.08]">
                            <img src="/usdc.png" alt="USDC" className="w-3 h-3" />
                            <span className="text-[9px] font-black text-white/30 tracking-wider uppercase">USDC</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <a
                        href={`${EXPLORER_BASE}/address/${address}`}
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
                  <div className="pt-4 border-t border-white/[0.05] space-y-3">
                    {address && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
                            {isSmartAccount ? "Smart Acct" : "Wallet"}
                          </span>
                          {isSmartAccount && (
                            <span className="text-[9px] font-black text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">AA</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <a href={`${EXPLORER_BASE}/address/${address}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1">
                            {truncateAddress(address)}<ExternalLink className="w-3 h-3" />
                          </a>
                          <button onClick={() => handleCopy(address)} className="text-white/20 hover:text-white transition-colors">
                            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {isSmartAccount && eoaAddress && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] shrink-0">Signer (EOA)</span>
                        <a href={`${EXPLORER_BASE}/address/${eoaAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
                          {truncateAddress(eoaAddress)}<ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <div className="relative group/action">
                        <button disabled className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm font-black text-white/20 cursor-not-allowed flex items-center gap-2">
                          <ArrowDownLeft className="w-4 h-4" />Deposit
                        </button>
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-purple-500 text-[8px] font-black text-white rounded uppercase tracking-tighter shadow-lg">Soon</span>
                      </div>
                      <div className="relative group/action">
                        <button disabled className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm font-black text-white/20 cursor-not-allowed flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4" />Withdraw
                        </button>
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-purple-500 text-[8px] font-black text-white rounded uppercase tracking-tighter shadow-lg">Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Rewards */}
              {!rewardsLoading && hasPendingRewards && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />Pending Rewards
                  </h3>
                  <div className="bg-yellow-500/[0.06] border border-yellow-500/20 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3 sm:space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm">${totalPendingUsdc.toFixed(2)} USDC waiting</p>
                        <p className="text-[10px] font-black text-white/30 mt-0.5 uppercase tracking-wide">
                          {hasSmartAccount
                            ? "Your Smart Account is ready — click below to claim"
                            : "Initialize your Smart Account to unlock these rewards"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20 shrink-0">
                        <span className="text-sm font-black text-yellow-400">${totalPendingUsdc.toFixed(2)}</span>
                      </div>
                    </div>
                    {pendingClaimSuccess ? (
                      <div className="flex items-center gap-2 text-primary text-[11px] font-black">
                        <CheckCircle2 className="w-4 h-4" />Rewards claimed successfully!
                      </div>
                    ) : hasSmartAccount ? (
                      <>
                        {pendingClaimError && <p className="text-[10px] font-black text-red-400">{pendingClaimError}</p>}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleClaimPending}
                          disabled={claimingPending}
                          className="w-full py-3 bg-yellow-400 text-black rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {claimingPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                          {claimingPending ? "Claiming…" : `Claim $${totalPendingUsdc.toFixed(2)} USDC`}
                        </motion.button>
                      </>
                    ) : (
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-wide">
                        Use the wallet above to activate your Smart Account, then return here.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Claimable Rewards */}
              {(rewardsLoading || (rewards && rewards.totalClaimableUsdc > 0) || allClaimed || recentNonClaimableRewards.length > 0) && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Gift className="w-3.5 h-3.5" />
                      {rewards && rewards.totalClaimableUsdc > 0 ? "Claimable Rewards" : "Rewards"}
                    </h3>
                    {rewards && rewards.totalClaimableUsdc > 0 && !allClaimed && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full border border-primary/20">
                        <img src="/usdc.png" alt="USDC" className="w-3.5 h-3.5" />
                        <span className="text-sm font-black text-primary">${rewards.totalClaimableUsdc.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-[20px] sm:rounded-[24px] overflow-hidden">
                    {rewardsLoading ? (
                      <div className="p-5 space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 w-2/3 rounded-md bg-white/[0.06] animate-pulse" />
                              <div className="h-2.5 w-1/3 rounded-md bg-white/[0.04] animate-pulse" />
                            </div>
                            <div className="h-4 w-10 rounded-md bg-white/[0.06] animate-pulse shrink-0" />
                          </div>
                        ))}
                        <div className="h-11 w-full rounded-xl bg-white/[0.04] animate-pulse mt-2" />
                      </div>
                    ) : allClaimed ? (
                      <div className="flex items-center gap-4 p-6">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-black text-white text-sm">All rewards claimed</p>
                          <p className="text-[10px] font-black text-white/30 mt-0.5 uppercase tracking-wide">Your USDC has been credited to your wallet.</p>
                        </div>
                      </div>
                    ) : rewards && rewards.events.length > 0 ? (
                      <div className="divide-y divide-white/[0.04]">
                        {rewards.events.map((ev) => (
                          <div key={ev.eventId} className="p-5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.04] shrink-0 flex items-center justify-center">
                                {ev.eventImageUrl ? (
                                  <img src={ev.eventImageUrl} alt="" className="w-full h-full object-cover" />
                                ) : ev.userContentImageUrl ? (
                                  <img src={ev.userContentImageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Trophy className="w-4 h-4 text-white/20" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-white truncate leading-tight">{ev.eventTitle}</p>
                                {ev.brandName && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {ev.brandLogoUrl && <img src={ev.brandLogoUrl} alt="" className="w-3 h-3 rounded-full object-cover shrink-0" />}
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest truncate">{ev.brandName}</p>
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-black text-primary shrink-0">${ev.totalClaimableUsdc.toFixed(2)}</span>
                            </div>
                            <div className="space-y-1.5 pl-14">
                              {ev.claims.map((claim) => (
                                <div key={claim.id} className="flex items-center justify-between">
                                  <span className="text-[10px] text-white/40 font-black uppercase tracking-wide">
                                    {CLAIM_TYPE_LABEL[claim.claimType]}
                                    {claim.multiplier > 1 && <span className="ml-1 text-[10px] text-primary font-black">×{claim.multiplier}</span>}
                                  </span>
                                  <span className="text-xs font-black text-white/70">${claim.finalAmount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="p-5 pt-4 border-t border-white/[0.04]">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setClaimModalOpen(true)}
                            className="w-full py-3.5 bg-primary text-black rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                          >
                            <Gift className="w-4 h-4" />
                            Claim ${rewards.totalClaimableUsdc.toFixed(2)}
                            <img src="/usdc.png" alt="USDC" className="w-4 h-4" />
                            USDC
                          </motion.button>
                        </div>
                      </div>
                    ) : recentNonClaimableRewards.length > 0 ? (
                      <div className="p-5 space-y-4">
                        <div className="flex items-start gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-lime-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-white text-sm">No claimable rewards right now</p>
                            <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">Your recent non-claimable rewards are shown below.</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {recentNonClaimableRewards.map((entry) => {
                            const rewardDate = entry.claimedAt
                              ? new Date(entry.claimedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : null;
                            return (
                              <div key={entry.id} className="flex items-center gap-3 rounded-[20px] border border-white/[0.05] bg-white/[0.015] px-4 py-3">
                                <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.04] shrink-0 flex items-center justify-center">
                                  {entry.eventImageUrl ? <img src={entry.eventImageUrl} alt="" className="w-full h-full object-cover" />
                                    : entry.contentImageUrl ? <img src={entry.contentImageUrl} alt="" className="w-full h-full object-cover" />
                                    : entry.brandLogoUrl ? <img src={entry.brandLogoUrl} alt={entry.brandName ?? ""} className="w-full h-full object-cover" />
                                    : <Gift className="w-4 h-4 text-white/20" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-black text-white truncate leading-tight">{entry.event?.title ?? "Reward Claim"}</p>
                                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5 truncate">{CLAIM_TYPE_LABEL[entry.claimType]}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-lime-400">+${entry.finalAmount.toFixed(2)}</p>
                                  {rewardDate && <p className="text-[9px] font-black text-white/20 uppercase tracking-wide mt-0.5">{rewardDate}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Transaction History */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History className="w-3.5 h-3.5" />Activity History
                  </h3>
                  {address && (
                    <a href={`${EXPLORER_BASE}/address/${address}`} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-black text-primary/70 hover:text-primary uppercase tracking-widest flex items-center gap-1 group transition-colors">
                      Explorer <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  )}
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[20px] sm:rounded-[24px] overflow-hidden">
                  {historyLoading ? (
                    <div className="p-5 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/5 rounded-md bg-white/[0.06] animate-pulse" />
                            <div className="h-2.5 w-2/5 rounded-md bg-white/[0.04] animate-pulse" />
                          </div>
                          <div className="space-y-1.5 items-end flex flex-col shrink-0">
                            <div className="h-3 w-12 rounded-md bg-white/[0.06] animate-pulse" />
                            <div className="h-2.5 w-8 rounded-md bg-white/[0.04] animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : claimHistory.length > 0 ? (() => {
                    const groups = claimHistory.reduce<Record<string, typeof claimHistory>>((acc, entry) => {
                      const key = entry.event?.id ?? "unknown";
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(entry);
                      return acc;
                    }, {});
                    return (
                      <div className="divide-y divide-white/[0.04]">
                        {Object.entries(groups).map(([eventId, entries]) => {
                          const first = entries[0];
                          const eventTotal = entries.reduce((s, e) => s + e.finalAmount, 0);
                          const txHash = entries.find(e => e.transactionHash)?.transactionHash;
                          const claimedDate = first.claimedAt
                            ? new Date(first.claimedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : null;
                          return (
                            <div key={eventId} className="p-5 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.04] shrink-0 flex items-center justify-center">
                                  {first.eventImageUrl ? <img src={first.eventImageUrl} alt="" className="w-full h-full object-cover" />
                                    : first.contentImageUrl ? <img src={first.contentImageUrl} alt="" className="w-full h-full object-cover" />
                                    : first.brandLogoUrl ? <img src={first.brandLogoUrl} alt={first.brandName ?? ""} className="w-full h-full object-cover" />
                                    : <Gift className="w-5 h-5 text-purple-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-black text-white truncate leading-tight">{first.event?.title ?? "Reward Claim"}</p>
                                  {first.brandName && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {first.brandLogoUrl && <img src={first.brandLogoUrl} alt="" className="w-3 h-3 rounded-full object-cover" />}
                                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest truncate">{first.brandName}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-0.5 shrink-0">
                                  <span className="text-sm font-black text-lime-400">+${eventTotal.toFixed(2)}</span>
                                  {claimedDate && <span className="text-[9px] font-black text-white/20 uppercase tracking-wide">{claimedDate}</span>}
                                </div>
                              </div>
                              <div className="space-y-1.5 pl-[60px]">
                                {entries.map((entry) => (
                                  <div key={entry.id} className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/35 uppercase tracking-wide">{CLAIM_TYPE_LABEL[entry.claimType]}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black text-white/70">+${entry.finalAmount.toFixed(2)}</span>
                                      {entry.transactionHash && (
                                        <a href={`${EXPLORER_BASE}/tx/${entry.transactionHash}`} target="_blank" rel="noopener noreferrer"
                                          className="text-[9px] font-black text-white/20 hover:text-primary flex items-center gap-0.5 transition-colors">
                                          Tx <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {txHash && !entries.every(e => e.transactionHash) && (
                                  <a href={`${EXPLORER_BASE}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                                    className="text-[9px] font-black text-white/20 hover:text-primary flex items-center gap-0.5 transition-colors">
                                    View Tx <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white/20" />
                      </div>
                      <div>
                        <p className="font-black text-white/40 text-sm uppercase tracking-wide">No claims yet</p>
                        <p className="text-[10px] font-black text-white/20 mt-1 uppercase tracking-wide">Your reward claims will appear here.</p>
                      </div>
                      {address && (
                        <a href={`${EXPLORER_BASE}/address/${address}`} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] font-black text-primary/70 hover:text-primary uppercase tracking-widest flex items-center gap-1 transition-colors">
                          View on PolygonScan <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile: collapsible wallet info */}
              <div className="lg:hidden">
                <button
                  onClick={() => setShowMobileInfo(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-white/30 hover:text-white/50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Info className="w-3.5 h-3.5" />How your wallet works
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showMobileInfo && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {showMobileInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 bg-white/[0.02] border border-white/[0.06] rounded-[20px] p-4 space-y-4">
                        {[
                          { icon: <Shield className="w-4 h-4 text-blue-400" />, bg: "bg-blue-500/10 border-blue-500/20", title: "Privy Embedded Wallet", desc: "Non-custodial wallet created at sign-in. Private key secured by Privy MPC — you own it fully." },
                          { icon: <Zap className="w-4 h-4 text-purple-400" />, bg: "bg-purple-500/10 border-purple-500/20", title: "Smart Account (ERC-4337)", desc: "Gasless transactions — fees sponsored by Pimlico paymaster. No POL needed to interact." },
                          { icon: <KeyRound className="w-4 h-4 text-green-400" />, bg: "bg-green-500/10 border-green-500/20", title: "Full self-custody", desc: "Export your private key anytime and import into MetaMask or any EVM wallet." },
                        ].map(({ icon, bg, title, desc }) => (
                          <div key={title} className="flex gap-3">
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border", bg)}>{icon}</div>
                            <div>
                              <p className="text-xs font-black text-white/70">{title}</p>
                              <p className="text-[10px] font-black text-white/30 mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
                          <span className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-black">Network</span>
                          <a href="https://amoy.polygonscan.com" target="_blank" rel="noopener noreferrer"
                            className="text-[9px] text-primary/60 hover:text-primary font-mono flex items-center gap-1 transition-colors">
                            Polygon Amoy Testnet <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>{/* end left column */}

            {/* ── Right Column — desktop only ── */}
            <div className="hidden lg:block space-y-6">

              {/* Action Panel */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 space-y-6">
                <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.06]">
                  <button
                    onClick={() => setActiveTab("withdraw")}
                    className={cn("py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                      activeTab === "withdraw" ? "bg-white text-black" : "text-white/30 hover:text-white/60")}
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => setActiveTab("deposit")}
                    className={cn("py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                      activeTab === "deposit" ? "bg-white text-black" : "text-white/30 hover:text-white/60")}
                  >
                    Deposit
                  </button>
                </div>
                <div className="min-h-[300px]">
                  {activeTab === "withdraw"
                    ? <WithdrawContent />
                    : <DepositContent />
                  }
                </div>
              </div>

              {/* How your wallet works */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-white/30" />
                  <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">How your wallet works</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white/70">Privy Embedded Wallet</p>
                      <p className="text-[10px] font-black text-white/30 mt-0.5 leading-relaxed">
                        Aris creates a non-custodial embedded wallet for you automatically at sign-in. The private key is secured by Privy using MPC — you own it, nobody else does.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white/70">Smart Account (ERC-4337)</p>
                      <p className="text-[10px] font-black text-white/30 mt-0.5 leading-relaxed">
                        Your embedded wallet signs for a Smart Account. This enables gasless transactions — fees are sponsored by Pimlico paymaster so you never need POL to interact.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <KeyRound className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white/70">Full self-custody</p>
                      <p className="text-[10px] font-black text-white/30 mt-0.5 leading-relaxed">
                        Export your private key anytime from your account settings and import it into MetaMask or any EVM wallet — you always have full control.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
                  <span className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-black">Network</span>
                  <a href="https://amoy.polygonscan.com" target="_blank" rel="noopener noreferrer"
                    className="text-[9px] text-primary/60 hover:text-primary font-mono flex items-center gap-1 transition-colors">
                    Polygon Amoy Testnet <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Coming Soon */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-500" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                      <Clock className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Coming Soon
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl text-white uppercase tracking-tight">Advanced Trading</h3>
                    <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide leading-relaxed">
                      On-platform P2P trading and direct fiat off-ramps are currently in development.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <span className="px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[9px] uppercase font-black text-white/30 tracking-[0.2em]">P2P Market</span>
                    <span className="px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[9px] uppercase font-black text-white/30 tracking-[0.2em]">Fiat Off-ramp</span>
                  </div>
                </div>
              </div>

            </div>{/* end right column */}
          </div>
        </main>
      </SidebarLayout>

      {/* ── Mobile bottom action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="bg-background/95 backdrop-blur-xl border-t border-white/[0.08] px-4 pt-3 pb-5">
          <div className="flex gap-3 max-w-md mx-auto">
            <button
              onClick={() => openMobileSheet("deposit")}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/[0.06] border border-white/[0.10] rounded-2xl text-[11px] font-black text-white/60 uppercase tracking-widest hover:bg-white/[0.10] hover:text-white active:scale-95 transition-all"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Receive
            </button>
            <button
              onClick={() => openMobileSheet("withdraw")}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/[0.08] border border-white/[0.12] rounded-2xl text-[11px] font-black text-white/80 uppercase tracking-widest hover:bg-white/[0.12] hover:text-white active:scale-95 transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom sheet ── */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileSheetOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border border-white/[0.08] border-b-0 rounded-t-[28px] max-h-[90vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Sheet header */}
              <div className="px-5 pt-2 pb-3 shrink-0 space-y-3">
                {/* Balance context */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Available</p>
                    <p className="text-xl font-display text-white uppercase leading-none mt-0.5">
                      {usdcDisplayValue} <span className="text-sm text-white/30">USDC</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setMobileSheetOpen(false)}
                    className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Tab switcher */}
                <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.06]">
                  <button
                    onClick={() => setActiveTab("withdraw")}
                    className={cn("py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                      activeTab === "withdraw" ? "bg-white text-black" : "text-white/30 hover:text-white/60")}
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setActiveTab("deposit")}
                    className={cn("py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                      activeTab === "deposit" ? "bg-white text-black" : "text-white/30 hover:text-white/60")}
                  >
                    Receive
                  </button>
                </div>
              </div>

              {/* Scrollable form */}
              <div className="flex-1 overflow-y-auto px-5 pb-8">
                {activeTab === "withdraw"
                  ? <WithdrawContent compact />
                  : <DepositContent compact />
                }
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Claim Modal */}
      <ClaimModal
        open={claimModalOpen}
        claimableUsdc={rewards?.totalClaimableUsdc ?? 0}
        onClose={() => setClaimModalOpen(false)}
        onSuccess={handleClaimSuccess}
      />
    </div>
  );
}
