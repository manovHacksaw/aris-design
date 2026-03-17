"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, XCircle, X, RefreshCw, Rocket } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import {
  parseUsdc,
  encodeUsdcApprove,
  encodeCreateEvent,
  computeRequiredUsdc,
  readUsdcBalance,
  minTopPoolUsdc,
  USDC_ADDRESS,
  REWARDS_VAULT_ADDRESS,
} from "@/lib/blockchain/contracts";
import type { Address } from "viem";
import { publicClient } from "@/lib/blockchain/client";
import { keccak256, stringToHex } from "viem";
import { createEvent, updateBlockchainStatus } from "@/services/event.service";
import { uploadToPinata } from "@/lib/pinata-upload";
import { clearRefundCredit } from "@/services/brand-refunds.service";

export interface LaunchFormData {
  title: string;
  tagline?: string;
  type: "post" | "vote";
  description: string;
  startImmediately: boolean;
  startDate: string;
  endDate: string;
  postingEndDate: string;  // post_and_vote only: when posting ends / voting begins
  timezone: string;
  rules: string;
  hashtags: string[];
  regions?: string[];
  contentType: string[];
  maxParticipants: string;
  baseReward: string;
  leaderboardPool: string;
  topPrize: string;
  coverImage: File | string | null;
  participantInstructions?: string;
  submissionGuidelines?: string;
  moderationRules?: string;
  proposals?: Array<{ type?: string; title: string; imageUrl?: string; order: number; media?: File; mediaPreview?: string }>;
  useRefundCredit?: boolean;
  refundCreditAmount?: number;
}

interface LaunchStepModalProps {
  open: boolean;
  form: LaunchFormData;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { label: "Preparing event", desc: "Uploading cover image and checking USDC balance" },
  { label: "Approving USDC", desc: "Bundling USDC approval into a gasless transaction" },
  { label: "Locking reward pool", desc: "Confirming reward pool on Polygon Amoy" },
  { label: "Event Activated", desc: "Campaign is live and ready for creators" },
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
            <motion.div key="idle" className="absolute inset-0 flex items-center justify-center rounded-full bg-white/5 text-white/20">
              <span className="text-xs font-bold">{index + 1}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold transition-colors ${done ? "text-primary" : active ? (failed ? "text-red-400" : "text-foreground") : "text-white/30"}`}>
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

export default function LaunchStepModal({ open, form, onClose, onSuccess }: LaunchStepModalProps) {
  const { sendBatchTransaction, address: smartAccountAddress } = useWallet();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const launched = useRef(false);

  const reset = () => {
    setStep(0);
    setError(null);
    setTxHash(null);
    setUsdcBalance(null);
    launched.current = false;
  };

  useEffect(() => {
    if (!open) { reset(); return; }
    if (launched.current) return;
    launched.current = true;
    runLaunch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function runLaunch() {
    try {
      // ── Step 0: Preparing — validate form data BEFORE any blockchain work ──
      setStep(0);

      // Pre-flight client-side validation so we never waste a transaction
      const preflightErrors: string[] = [];
      if (!form.title.trim()) preflightErrors.push("Title is required.");
      if (!form.description.trim()) preflightErrors.push("Description is required.");
      if (!form.startImmediately && !form.startDate) preflightErrors.push("Start date is required (or enable Start Immediately).");
      if (!form.endDate) preflightErrors.push("End date is required.");
      if (form.type === "post" && !form.postingEndDate) preflightErrors.push("Posting end / voting start date is required.");
      const cap = parseInt(form.maxParticipants);
      if (!cap || cap < 5) preflightErrors.push("Capacity must be at least 5 participants.");
      const resolvedStartMs = form.startImmediately ? Date.now() : new Date(form.startDate).getTime();
      const endMs = new Date(form.endDate).getTime();
      if (endMs - resolvedStartMs < 10 * 60 * 1000) preflightErrors.push("Event must run for at least 10 minutes.");
      if (form.type === "post" && form.postingEndDate) {
        const pEndMs = new Date(form.postingEndDate).getTime();
        if (pEndMs <= resolvedStartMs) preflightErrors.push("Posting end must be after start.");
        if (pEndMs >= endMs) preflightErrors.push("Voting end must be after posting end.");
      }
      if (!form.topPrize || parseFloat(form.topPrize) <= 0) preflightErrors.push("Top prize is required.");
      if (preflightErrors.length > 0) {
        throw new Error(preflightErrors.join(" "));
      }
      const startMs = resolvedStartMs;

      let imageUrl: string | undefined;
      if (form.coverImage && form.coverImage instanceof File) {
        const uploadResult = await uploadToPinata(form.coverImage);
        imageUrl = uploadResult.imageUrl;
      } else if (typeof form.coverImage === "string") {
        imageUrl = form.coverImage;
      }

      const uploadedProposals: Array<{ type: "TEXT"; title: string; imageUrl?: string; order: number }> = [];
      if (form.type === "vote" && form.proposals && form.proposals.length > 0) {
        for (let i = 0; i < form.proposals.length; i++) {
          const p = form.proposals[i];
          let pImageUrl = p.imageUrl;
          if (p.media && p.media instanceof File) {
            const pUploadResult = await uploadToPinata(p.media);
            pImageUrl = pUploadResult.imageUrl;
          }
          uploadedProposals.push({
            type: "TEXT" as const, // currently all proposals are TEXT typed, but can contain images
            title: p.title || `Option ${i + 1}`,
            imageUrl: pImageUrl,
            order: p.order ?? i
          });
        }
      }

      if (!USDC_ADDRESS || !REWARDS_VAULT_ADDRESS) {
        throw new Error("Smart contract addresses not configured. Check NEXT_PUBLIC_REWARDS_VAULT_ADDRESS and NEXT_PUBLIC_TEST_USDC_ADDRESS.");
      }
      if (!smartAccountAddress) {
        throw new Error("Wallet not connected. Please reload and try again.");
      }

      if (!smartAccountAddress) {
        throw new Error("Wallet not connected. Please reload and try again.");
      }

      // VoteOnly = 0, PostAndVote = 1  (must match on-chain enum)
      const eventTypeInt = form.type === "post" ? 1 : 0;
      const topPoolRaw = parseUsdc(parseFloat(form.topPrize) || 0);
      const leaderboardAlloc = parseUsdc(parseFloat(form.leaderboardPool) || 0);
      // Minimum 5 participants for backend validation
      const maxParticipants = BigInt(Math.max(parseInt(form.maxParticipants) || 0, 5));

      // Enforce topPool >= 1× base pool minimum for all event types
      const topPoolAlloc = topPoolRaw < minTopPoolUsdc(maxParticipants)
        ? minTopPoolUsdc(maxParticipants)
        : topPoolRaw;

      // Compute required deposit client-side (on-chain view reverts on testnet)
      const requiredDeposit = computeRequiredUsdc(eventTypeInt, maxParticipants, topPoolAlloc, leaderboardAlloc);

      // Refund credit amount (in USDC units)
      const creditToUse = form.useRefundCredit && form.refundCreditAmount
        ? parseUsdc(form.refundCreditAmount)
        : BigInt(0);

      // Final net deposit needed from wallet
      const netDepositFromWallet = requiredDeposit > creditToUse ? requiredDeposit - creditToUse : BigInt(0);

      console.log("[LaunchStepModal] Computed required USDC deposit:", {
        eventTypeInt,
        maxParticipants: maxParticipants.toString(),
        topPoolAlloc: topPoolAlloc.toString(),
        leaderboardAlloc: leaderboardAlloc.toString(),
        requiredDeposit: requiredDeposit.toString(),
        requiredUsd: (Number(requiredDeposit) / 1_000_000).toFixed(6),
      });

      // ── Balance check: ensure smart account has enough test USDC ───────────
      const balance = await readUsdcBalance(smartAccountAddress as Address);
      setUsdcBalance(balance);
      console.log("[LaunchStepModal] Smart account USDC balance:", {
        account: smartAccountAddress,
        balance: balance.toString(),
        balanceUsd: (Number(balance) / 1_000_000).toFixed(6),
        required: netDepositFromWallet.toString(),
        sufficient: balance >= netDepositFromWallet,
      });

      if (balance < netDepositFromWallet) {
        const have = (Number(balance) / 1_000_000).toFixed(2);
        const need = (Number(netDepositFromWallet) / 1_000_000).toFixed(2);
        throw new Error(
          `Insufficient USDC. Your smart account (${smartAccountAddress.slice(0, 8)}…) ` +
          `needs $${need} but only has $${have} on Polygon Amoy. ` +
          `Please fund your account before launching.`
        );
      }

      // ── Step 0.5: Pre-Create Event in DB (Validates before Wallet) ─────────
      console.log("[LaunchStepModal] Pre-creating event in DB to run validations...");

      // Resolve final timestamps
      const resolvedStart = form.startImmediately ? new Date() : new Date(form.startDate);
      const postingStart = resolvedStart.toISOString();
      // For post_and_vote: posting end is explicitly set; voting runs from there to endDate.
      // For vote_only: startTime/endTime map directly from the resolved form dates.
      const postingEnd = form.type === "post" && form.postingEndDate
        ? new Date(form.postingEndDate).toISOString()
        : undefined;
      const eventStartTime = form.type === "post" && postingEnd ? postingEnd : resolvedStart.toISOString();
      const eventEndTime = new Date(form.endDate).toISOString();

      const dbEvent = await createEvent({
        title: form.title,
        tagline: form.tagline,
        description: form.description,
        eventType: form.type === "post" ? "post_and_vote" : "vote_only",
        startTime: eventStartTime,
        endTime: eventEndTime,
        ...(form.type === "post" ? { postingStart, postingEnd } : {}),
        imageUrl: imageUrl || "",
        allowSubmissions: form.type === "post",
        allowVoting: true,
        baseReward: parseFloat(form.baseReward) || 0,
        topReward: parseFloat(form.topPrize) || 0,
        leaderboardPool: parseFloat(form.leaderboardPool) || 0,
        capacity: Number(maxParticipants),
        blockchainStatus: "PENDING_BLOCKCHAIN",
        participantInstructions: form.participantInstructions,
        submissionGuidelines: form.submissionGuidelines,
        moderationRules: form.moderationRules,
        hashtags: form.hashtags,
        regions: form.regions,
        preferredGender: (form as any).preferredGender,
        ageGroup: (form as any).ageGroup,
        samples: form.type === "post" ? [] : undefined,
        proposals: form.type === "vote"
          ? (uploadedProposals.length >= 2
            ? uploadedProposals
            : [{ type: "TEXT" as const, title: "Option 1", order: 0 }, { type: "TEXT" as const, title: "Option 2", order: 1 }])
          : undefined,
      });

      // Generate the bytes32 hash of the UUID returned by backend (mirrors backend eventIdToBytes32)
      const eventIdBytes32 = keccak256(stringToHex(dbEvent.id));

      // ── Step 1: Approving USDC (UserOp being sent) ─────────────────────────
      setStep(1);

      console.log("[LaunchStepModal] Sending batch UserOp:", {
        approve: { to: USDC_ADDRESS, amount: netDepositFromWallet.toString() },
        createEvent: { to: REWARDS_VAULT_ADDRESS, eventId: eventIdBytes32, eventTypeInt, maxParticipants: maxParticipants.toString(), topPoolAlloc: topPoolAlloc.toString(), useRefundBalance: creditToUse.toString() },
      });

      const hash = await sendBatchTransaction([
        { to: USDC_ADDRESS, data: encodeUsdcApprove(REWARDS_VAULT_ADDRESS, netDepositFromWallet) },
        { to: REWARDS_VAULT_ADDRESS, data: encodeCreateEvent(eventIdBytes32, eventTypeInt, maxParticipants, topPoolAlloc, leaderboardAlloc, creditToUse) },
      ]);

      // ── Step 2: Waiting for on-chain confirmation ──────────────────────────
      setStep(2);
      setTxHash(hash);
      console.log("[LaunchStepModal] Batch UserOp submitted, waiting for receipt:", hash);

      // sendBatchTransaction (via permissionless) already waits internally and
      // returns the transaction hash. waitForTransactionReceipt is a safety net
      // that returns immediately if the tx is already included.
      await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      console.log("[LaunchStepModal] On-chain confirmation received ✓");

      // ── Step 3: Confirming to DB — only after on-chain confirmation ───────────
      setStep(3);
      console.log("[LaunchStepModal] Updating event blockchain status to ACTIVE...");
      await updateBlockchainStatus(dbEvent.id, hash, eventIdBytes32);

      // Mark all steps done
      setStep(STEPS.length);

      // ── Step 4: Cleanup credit ───────────
      if (form.useRefundCredit) {
        clearRefundCredit();
      }

    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      setError(msg);
    }
  }

  const isSuccess = step === 3 && !error;
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
        {/* Close button — only when done or errored */}
        {(isSuccess || isFailed) && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Rocket className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-base font-black">Launching Campaign</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            {isSuccess ? "Your campaign is live on-chain." : "One gasless transaction — no gas required."}
          </p>
        </div>

        {/* Wallet info */}
        {smartAccountAddress && (
          <div className="mb-5 p-3 bg-secondary/40 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Smart account</span>
              <a
                href={`https://amoy.polygonscan.com/address/${smartAccountAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-foreground hover:text-primary transition-colors"
              >
                {smartAccountAddress.slice(0, 10)}…{smartAccountAddress.slice(-6)}
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">USDC balance</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-foreground">
                  {usdcBalance !== null
                    ? `$${(Number(usdcBalance) / 1_000_000).toFixed(2)}`
                    : "—"}
                </span>
                <img src="/usdc.png" alt="USDC" className="w-3 h-3" />
              </div>
            </div>
            {form.useRefundCredit && form.refundCreditAmount && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-primary font-bold italic">Applied credit</span>
                <span className="text-xs font-mono font-bold text-primary italic">
                  -${form.refundCreditAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step list */}
        <div className="space-y-4 mb-6">
          {STEPS.map((_, i) => (
            <StepRow key={i} index={i} currentStep={step} error={isFailed} />
          ))}
        </div>

        {/* Error box */}
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

        {/* Footer actions */}
        {isSuccess && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onSuccess}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            View Dashboard
          </motion.button>
        )}
        {isFailed && (
          <button
            onClick={() => { reset(); launched.current = false; runLaunch(); }}
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
