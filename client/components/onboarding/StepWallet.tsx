"use client";

import { motion } from "framer-motion";
import { Wallet, Shield, ArrowRight, SkipForward, Loader2, ExternalLink } from "lucide-react";
import { useWallet } from "@/context/WalletContext";

interface StepWalletProps {
  walletAddress: string | null;
  onConnect: () => void;
  onSkip: () => void;
}

export default function StepWallet({ walletAddress: _walletAddress, onConnect, onSkip }: StepWalletProps) {
  const { address, eoaAddress, isConnected, isLoading, connect } = useWallet();

  // Use real wallet address from Privy
  const activeAddress = address || eoaAddress;
  const isWalletReady = isConnected && !!activeAddress;

  const handleConnect = () => {
    if (!isConnected) {
      connect();
    }
    onConnect();
  };

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-foreground tracking-tighter"
        >
          {isWalletReady ? "Wallet Ready" : "Connect Your Wallet"}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xs text-foreground/40 font-bold max-w-sm mx-auto"
        >
          {isWalletReady
            ? "Your embedded wallet has been automatically created and secured."
            : "Rewards are distributed on-chain. Your embedded wallet is auto-provisioned via Privy."}
        </motion.p>
      </div>

      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-4"
      >
        {isLoading ? (
          <div className="w-full flex items-center justify-center gap-3 p-5 rounded-[18px] bg-card border border-border/40">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground/50">Initializing wallet...</p>
          </div>
        ) : isWalletReady ? (
          <>
            {/* Smart Account Card */}
            {address && (
              <div className="w-full p-5 rounded-[18px] bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-foreground/40 uppercase tracking-widest mb-0.5">Smart Account</p>
                    <p className="text-sm font-black text-foreground tracking-tight">Gasless Wallet</p>
                    <p className="text-[11px] text-primary font-mono truncate">{formatAddress(address)}</p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>
            )}

            {/* EOA Card */}
            {eoaAddress && eoaAddress !== address && (
              <div className="w-full p-4 rounded-[18px] bg-card border border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-0.5">Embedded Wallet (EOA)</p>
                    <p className="text-[11px] text-foreground/60 font-mono truncate">{formatAddress(eoaAddress)}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => onConnect()}
              className="w-full flex items-center justify-center gap-2 py-3 text-primary hover:text-primary/80 transition-colors text-xs font-bold"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleConnect}
              className="w-full flex items-center gap-4 p-5 rounded-[18px] bg-card border border-border/40 hover:border-primary/30 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-foreground tracking-tight">Auto-Provision Wallet</p>
                <p className="text-[11px] text-foreground/40 font-medium mt-0.5">Privy creates a secure embedded wallet for you</p>
              </div>
              <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-primary transition-colors" />
            </button>

            <button
              onClick={onSkip}
              className="w-full flex items-center justify-center gap-2 py-3 text-foreground/30 hover:text-foreground/50 transition-colors text-xs font-bold"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip for now
            </button>
          </>
        )}
      </motion.div>

      {/* Benefits */}
      {!isWalletReady && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border/40 rounded-[18px] p-5 space-y-3"
        >
          <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Why connect?</p>
          {[
            "Receive reward payouts directly",
            "Track on-chain earnings history",
            "Unlock premium event access",
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
              <p className="text-xs text-foreground/50 font-medium">{benefit}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
