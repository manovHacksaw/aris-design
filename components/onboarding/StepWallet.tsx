"use client";

import { motion } from "framer-motion";
import { Wallet, Shield, ArrowRight, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepWalletProps {
    walletAddress: string | null;
    onConnect: () => void;
    onSkip: () => void;
}

export default function StepWallet({ walletAddress, onConnect, onSkip }: StepWalletProps) {
    const isConnected = !!walletAddress;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-foreground tracking-tighter"
                >
                    Connect Your Wallet
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs text-foreground/40 font-bold max-w-sm mx-auto"
                >
                    Rewards are distributed on-chain. Connect a wallet to start earning, or skip and explore first.
                </motion.p>
            </div>

            {/* Wallet Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-4"
            >
                {!isConnected ? (
                    <>
                        {/* Connect button */}
                        <button
                            onClick={onConnect}
                            className="w-full flex items-center gap-4 p-5 rounded-[18px] bg-card border border-border/40 hover:border-primary/30 transition-all group text-left"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                                <Wallet className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-foreground tracking-tight">Connect Wallet</p>
                                <p className="text-[11px] text-foreground/40 font-medium mt-0.5">Phantom, MetaMask, or any Web3 wallet</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-primary transition-colors" />
                        </button>

                        {/* Skip option */}
                        <button
                            onClick={onSkip}
                            className="w-full flex items-center justify-center gap-2 py-3 text-foreground/30 hover:text-foreground/50 transition-colors text-xs font-bold"
                        >
                            <SkipForward className="w-3.5 h-3.5" />
                            Skip for now
                        </button>
                    </>
                ) : (
                    <div className="w-full p-5 rounded-[18px] bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-foreground tracking-tight">Wallet Connected</p>
                                <p className="text-[11px] text-primary font-mono truncate">{walletAddress}</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-emerald-400/15 flex items-center justify-center">
                                <Shield className="w-3 h-3 text-emerald-400" />
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Benefits */}
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
        </div>
    );
}
