"use client";

import { useState, useEffect, useCallback } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import {
  Copy, ArrowUpRight, ArrowDownLeft, Clock,
  History, AlertCircle, RefreshCw, ExternalLink, Wallet,
  CheckCircle2, Shield, KeyRound, Zap, Info,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/context/WalletContext";
import { formatUnits } from "viem";

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

  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"withdraw" | "deposit">("withdraw");
  const [polBalance, setPolBalance] = useState<string>("0.0000");
  const [isFetchingMatic, setIsFetchingMatic] = useState(false);

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

  useEffect(() => {
    if (isConnected && address) {
      fetchMaticBalance();
      refreshBalance();
    }
  }, [address, isConnected]);

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    await Promise.all([fetchMaticBalance(), refreshBalance()]);
  };

  const isSmartAccount = !!(address && eoaAddress && address !== eoaAddress);

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <SidebarLayout>
          <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto">
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-6 h-6 animate-spin text-foreground/40" />
            </div>
          </main>
        </SidebarLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <SidebarLayout>
        <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-8 pb-24 md:pb-8">

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
              <p className="text-foreground/60">Your on-chain assets on Polygon Amoy.</p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground/60 hover:text-foreground bg-secondary border border-border rounded-xl transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", isFetchingMatic && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Balance Card */}
              <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group shadow-lg shadow-black/20">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <div className="w-64 h-64 bg-primary rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-4">
                      {/* POL Balance */}
                      <div>
                        <p className="text-foreground/40 font-bold mb-1 tracking-widest text-[10px] uppercase">Native Balance</p>
                        <div className="flex items-baseline gap-2">
                          <h2 className="text-5xl md:text-6xl font-black text-foreground tracking-tight">
                            {isFetchingMatic ? (
                              <span className="text-foreground/30 animate-pulse">...</span>
                            ) : polBalance}
                          </h2>
                          <span className="text-xl text-foreground/40 font-bold">POL</span>
                        </div>
                      </div>

                      {/* USDC Balance */}
                      <div>
                        <p className="text-foreground/40 font-bold mb-1 tracking-widest text-[10px] uppercase">USDC Balance</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-foreground/80">
                            {parseFloat(usdcBalance) > 0 ? usdcBalance : "0.00"}
                          </span>
                          <span className="text-sm text-foreground/40 font-bold">USDC</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* Chain Badge */}
                      <a
                        href={`${EXPLORER_BASE}/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full w-fit border border-border hover:border-primary/30 transition-colors group/badge"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <span className="text-sm text-foreground/60 font-bold group-hover/badge:text-foreground transition-colors">{CHAIN_NAME}</span>
                        <ExternalLink className="w-3 h-3 text-foreground/30 group-hover/badge:text-foreground/60 transition-colors" />
                      </a>
                      <span className="text-[10px] text-foreground/30 font-mono">Chain ID: {CHAIN_ID}</span>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    {/* Smart Account (primary) */}
                    {address && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                            {isSmartAccount ? "Smart Account" : "Wallet"}
                          </span>
                          {isSmartAccount && (
                            <span className="text-[9px] font-bold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                              AA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={`${EXPLORER_BASE}/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            {truncateAddress(address)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => handleCopy(address)}
                            className="text-foreground/30 hover:text-foreground transition-colors"
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* EOA Address (signer) */}
                    {isSmartAccount && eoaAddress && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                          Signer (EOA)
                        </span>
                        <a
                          href={`${EXPLORER_BASE}/address/${eoaAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-foreground/40 hover:text-foreground/70 transition-colors flex items-center gap-1"
                        >
                          {truncateAddress(eoaAddress)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex gap-3 pt-2">
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

              {/* Transaction History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <History className="w-5 h-5 text-foreground/40" />
                    Activity History
                  </h3>
                  {address && (
                    <a
                      href={`${EXPLORER_BASE}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 group"
                    >
                      View on Explorer <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  )}
                </div>

                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  {/* Empty state - no on-chain indexer yet */}
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-secondary border border-border flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-foreground/30" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground/60">No transactions yet</p>
                      <p className="text-sm text-foreground/30 mt-1">Your on-chain activity will appear here.</p>
                    </div>
                    {address && (
                      <a
                        href={`${EXPLORER_BASE}/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        View full history on PolygonScan
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">

              {/* Action Panel */}
              <div className="bg-card border border-border rounded-3xl p-6 space-y-6 sticky top-24 shadow-lg shadow-black/20">

                {/* Tabs */}
                <div className="grid grid-cols-2 p-1 bg-secondary rounded-xl border border-border">
                  <button
                    onClick={() => setActiveTab("withdraw")}
                    className={cn(
                      "py-2 text-sm font-bold rounded-lg transition-all",
                      activeTab === "withdraw"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-foreground/40 hover:text-foreground"
                    )}
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => setActiveTab("deposit")}
                    className={cn(
                      "py-2 text-sm font-bold rounded-lg transition-all",
                      activeTab === "deposit"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-foreground/40 hover:text-foreground"
                    )}
                  >
                    Deposit
                  </button>
                </div>

                {/* Content */}
                <div className="min-h-[300px]">
                  {activeTab === "withdraw" ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Send Funds</h3>
                        <p className="text-sm text-foreground/60">Enter an EVM address to withdraw to.</p>
                      </div>

                      <div className="space-y-5">
                        {/* Amount */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Amount</label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 font-bold">$</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              className="w-full bg-background border border-border rounded-xl pl-8 pr-16 py-3.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-foreground/20 font-mono text-lg group-hover:border-border/80"
                            />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded hover:bg-primary/20 transition-colors">
                              MAX
                            </button>
                          </div>
                        </div>

                        {/* Address */}
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

                        {/* Network (fixed to Polygon Amoy) */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Network</label>
                          <div className="w-full bg-background border border-border rounded-xl px-4 py-3.5 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-foreground/80 text-sm font-medium">{CHAIN_NAME}</span>
                            <span className="ml-auto text-[10px] text-foreground/30 font-mono">ID: {CHAIN_ID}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        disabled
                        className="w-full bg-primary/50 cursor-not-allowed text-white/50 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                      >
                        Withdraw Funds
                        <span className="text-xs font-normal opacity-60">(coming soon)</span>
                      </button>

                      <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-yellow-500/60 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-500/60 leading-relaxed">
                          Only send assets to EVM-compatible wallets on Polygon Amoy.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Deposit POL</h3>
                        <p className="text-sm text-foreground/60">Scan or copy your address to deposit.</p>
                      </div>

                      {address ? (
                        <>
                          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-4 border-white shadow-xl">
                            <QRCodeSVG value={address} size={180} />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Your Address</label>
                            <div
                              className="w-full bg-background border border-border rounded-xl px-4 py-3.5 flex items-center justify-between group/copy cursor-pointer hover:border-border/80 transition-colors"
                              onClick={() => handleCopy(address)}
                            >
                              <span className="font-mono text-foreground/80 text-sm truncate mr-2 select-all">
                                {truncateAddress(address)}
                              </span>
                              <div className="flex items-center gap-2">
                                {copied ? (
                                  <span className="text-xs text-green-500 font-bold animate-in fade-in">Copied!</span>
                                ) : (
                                  <Copy className="w-4 h-4 text-foreground/40 group-hover/copy:text-foreground transition-colors" />
                                )}
                              </div>
                            </div>
                            {/* Full address */}
                            <p className="text-[10px] font-mono text-foreground/20 break-all px-1">{address}</p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-foreground/40 bg-secondary py-2 px-3 rounded-lg">
                            <span className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              {CHAIN_NAME}
                            </span>
                            <a
                              href={`${EXPLORER_BASE}/address/${address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Explorer <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                          <Wallet className="w-8 h-8 text-foreground/20" />
                          <p className="text-sm text-foreground/40">Wallet not connected</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Coming Soon */}
              <div className="bg-gradient-to-br from-card to-background border border-border rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-500" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                      <Clock className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Coming Soon
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Advanced Trading</h3>
                    <p className="text-sm text-foreground/60 mt-1">
                      On-platform P2P trading and direct fiat off-ramps are currently in development.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <span className="px-2 py-1 bg-secondary border border-border rounded-lg text-[10px] uppercase font-bold text-foreground/40 tracking-widest">
                      P2P Market
                    </span>
                    <span className="px-2 py-1 bg-secondary border border-border rounded-lg text-[10px] uppercase font-bold text-foreground/40 tracking-widest">
                      Fiat Off-ramp
                    </span>
                  </div>
                </div>
              </div>

              {/* How your wallet works */}
              <div className="bg-card border border-border rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-foreground/40" />
                  <h3 className="text-[11px] font-bold text-foreground/60 uppercase tracking-widest">
                    How your wallet works
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground/80">Privy Embedded Wallet</p>
                      <p className="text-xs text-foreground/40 mt-0.5 leading-relaxed">
                        Aris creates a non-custodial embedded wallet for you automatically at sign-in. The private key is secured by Privy using MPC — you own it, nobody else does.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground/80">Smart Account (ERC-4337)</p>
                      <p className="text-xs text-foreground/40 mt-0.5 leading-relaxed">
                        Your embedded wallet signs for a Smart Account. This enables gasless transactions — fees are sponsored by Pimlico paymaster so you never need POL to interact.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <KeyRound className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground/80">Full self-custody</p>
                      <p className="text-xs text-foreground/40 mt-0.5 leading-relaxed">
                        Export your private key anytime from your account settings and import it into MetaMask or any EVM wallet — you always have full control.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-foreground/30 uppercase tracking-widest font-bold">Network</span>
                  <a
                    href="https://amoy.polygonscan.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary/70 hover:text-primary font-mono flex items-center gap-1 transition-colors"
                  >
                    Polygon Amoy Testnet <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

            </div>
          </div>
        </main>
      </SidebarLayout>
    </div>
  );
}
