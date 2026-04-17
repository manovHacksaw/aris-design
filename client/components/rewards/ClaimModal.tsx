"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, XCircle, X, RefreshCw, Gift } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { encodeClaimRewards, REWARDS_VAULT_ADDRESS } from "@/lib/blockchain/contracts";
import { publicClient } from "@/lib/blockchain/client";
import { confirmAllClaims } from "@/services/reward.service";

const STEPS = [
  { label: "Preparing claim", desc: "Verifying your claimable balance on-chain" },
  { label: "Processing on-chain", desc: "Submitting gasless transaction via Pimlico" },
  { label: "Rewards credited", desc: "Your USDC has been transferred to your wallet" },
];

function StepRow({ index, currentStep, error }: { index: number; currentStep: number; error: boolean }) {
  const done = currentStep > index;
  const active = currentStep === index;
  const failed = active && error;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-8 h-8 shrink-0">
        <AnimatePresence mode="wait">
          {failed ? (
            <motion.div key="err" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <XCircle className="w-5 h-5" />
            </motion.div>
          ) : done ? (
            <motion.div key="done" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/20 text-primary">
              <CheckCircle2 className="w-5 h-5" />
            </motion.div>
          ) : active ? (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
            </motion.div>
          ) : (
            <motion.div key="idle" className="absolute inset-0 flex items-center justify-center rounded-full bg-white/5 text-foreground/20">
              <span className="text-xs font-bold">{index + 1}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold transition-colors ${done ? "text-primary" : active ? (failed ? "text-red-400" : "text-foreground") : "text-foreground/30"}`}>
          {STEPS[index].label}
        </p>
        {active && !done && (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-muted-foreground mt-0.5 truncate">
            {failed ? "Transaction failed — see error below" : STEPS[index].desc}
          </motion.p>
        )}
      </div>
    </div>
  );
}

interface ClaimModalProps {
  open: boolean;
  claimableUsdc: number;
  onClose: () => void;
  onSuccess: (claimedUsdc: number) => void;
}

export default function ClaimModal({ open, claimableUsdc, onClose, onSuccess }: ClaimModalProps) {
  const { sendTransaction, address: smartAccountAddress } = useWallet();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const launched = useRef(false);

  const reset = () => {
    setStep(0);
    setError(null);
    setTxHash(null);
    launched.current = false;
  };

  useEffect(() => {
    if (!open) { reset(); return; }
    if (launched.current) return;
    launched.current = true;
    runClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function runClaim() {
    try {
      // ── Step 0: Preparing ───────────────────────────────────
      setStep(0);

      if (!REWARDS_VAULT_ADDRESS) {
        throw new Error("Vault address not configured.");
      }
      if (!smartAccountAddress) {
        throw new Error("Wallet not connected. Please reload and try again.");
      }
      if (claimableUsdc <= 0) {
        throw new Error("No claimable rewards available.");
      }

      // ── Step 1: On-chain claimRewards() ────────────────────
      setStep(1);

      const hash = await sendTransaction({
        to: REWARDS_VAULT_ADDRESS,
        data: encodeClaimRewards(),
      });

      setTxHash(hash);

      // Wait for on-chain confirmation
      await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });

      // ── Step 2: Confirm in DB ───────────────────────────────
      setStep(2);

      await confirmAllClaims(hash);

      // Notify parent — triggers confetti + count-up
      onSuccess(claimableUsdc);

    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      setError(msg);
    }
  }

  const isSuccess = step === 2 && !error;
  const isFailed = !!error;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-card border border-border rounded-[24px] p-6 shadow-2xl"
      >
        {/* Close when done or errored */}
        {(isSuccess || isFailed) && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Gift className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-base font-black">Claiming Rewards</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            {isSuccess
              ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">${claimableUsdc.toFixed(2)}</span>
                  <img src="/usdc.png" alt="USDC" className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">is now in your wallet.</span>
                </div>
              )
              : (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Claiming</span>
                  <span className="text-sm font-bold">${claimableUsdc.toFixed(2)}</span>
                  <img src="/usdc.png" alt="USDC" className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">— no gas required.</span>
                </div>
              )}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-6">
          {STEPS.map((_, i) => (
            <StepRow key={i} index={i} currentStep={step} error={isFailed} />
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {isFailed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <p className="text-xs text-red-400 font-medium break-words">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tx hash */}
        {txHash && !isFailed && (
          <div className="mb-4 p-3 bg-secondary/40 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Transaction</p>
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary font-mono truncate block hover:underline"
            >
              {txHash.slice(0, 20)}...{txHash.slice(-8)}
            </a>
          </div>
        )}

        {/* Footer */}
        {isSuccess && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Done
          </motion.button>
        )}
        {isFailed && (
          <button
            onClick={() => { reset(); launched.current = false; runClaim(); }}
            className="w-full py-3 bg-secondary border border-border rounded-xl font-bold text-sm hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
        {!isSuccess && !isFailed && (
          <p className="text-center text-xs text-muted-foreground animate-pulse">
            Do not close this window…
          </p>
        )}
      </motion.div>
    </div>
  );
}
