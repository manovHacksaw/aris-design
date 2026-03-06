import { encodeFunctionData, parseUnits } from "viem";
import type { Address } from "viem";
import { publicClient } from "./client";

export const USDC_DECIMALS = 6;

export const USDC_ADDRESS = process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS as Address;
export const REWARDS_VAULT_ADDRESS = process.env.NEXT_PUBLIC_REWARDS_VAULT_ADDRESS as Address;

export function parseUsdc(amount: number): bigint {
  return parseUnits(amount.toString(), USDC_DECIMALS);
}

export const USDC_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const VAULT_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "eventId", type: "bytes32" },
      { internalType: "uint8", name: "eventType", type: "uint8" },
      { internalType: "uint256", name: "maxParticipants", type: "uint256" },
      { internalType: "uint256", name: "topPoolUsdc", type: "uint256" },
      { internalType: "uint256", name: "leaderboardPoolUsdc", type: "uint256" },
      { internalType: "uint256", name: "useRefundBalance", type: "uint256" },
    ],
    name: "createEvent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint8", name: "eventType", type: "uint8" },
      { internalType: "uint256", name: "maxParticipants", type: "uint256" },
      { internalType: "uint256", name: "topPoolUsdc", type: "uint256" },
      { internalType: "uint256", name: "leaderboardPoolUsdc", type: "uint256" },
    ],
    name: "calculateRequiredUsdc",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "brand", type: "address" }],
    name: "getBrandRefundBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function encodeUsdcApprove(spender: Address, amount: bigint): `0x${string}` {
  return encodeFunctionData({ abi: USDC_ABI, functionName: "approve", args: [spender, amount] });
}

export function encodeMint(to: Address, amount: bigint): `0x${string}` {
  return encodeFunctionData({ abi: USDC_ABI, functionName: "mint", args: [to, amount] });
}

export async function readUsdcBalance(account: Address): Promise<bigint> {
  return publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [account],
  }) as Promise<bigint>;
}

export function encodeCreateEvent(
  eventId: `0x${string}`,
  eventType: number,
  maxParticipants: bigint,
  topPoolUsdc: bigint,
  leaderboardPoolUsdc: bigint = BigInt(0),
  useRefundBalance: bigint = BigInt(0)
): `0x${string}` {
  return encodeFunctionData({
    abi: VAULT_ABI,
    functionName: "createEvent",
    args: [eventId, eventType, maxParticipants, topPoolUsdc, leaderboardPoolUsdc, useRefundBalance],
  });
}

/**
 * Compute required USDC deposit client-side — mirrors contract calculateRequiredUsdc().
 *
 * Vote Only:   base + topPool + platformFee
 * Post & Vote: base + topPool + creatorPool + leaderboardPool + platformFee
 *
 * All event types: topPool >= 1× base pool minimum.
 */
export function computeRequiredUsdc(
  eventType: number,        // 0 = VoteOnly, 1 = PostAndVote
  maxParticipants: bigint,
  topPoolUsdc: bigint,      // form.topPrize (top voter pool / top creator prize)
  leaderboardUsdc: bigint = BigInt(0) // form.leaderboardPool (post_and_vote only)
): bigint {
  const BASE = BigInt(30_000);  // $0.030 per participant
  const CREATOR = BigInt(50_000);  // $0.050 per participant (post_and_vote only)
  const FEE_VOTE = BigInt(15_000);  // $0.015 per participant (vote_only)
  const FEE_POST = BigInt(20_000);  // $0.020 per participant (post_and_vote)

  const basePool = BASE * maxParticipants;
  const platformFee = (eventType === 1 ? FEE_POST : FEE_VOTE) * maxParticipants;
  const creatorPool = eventType === 1 ? CREATOR * maxParticipants : BigInt(0);
  const leaderboard = eventType === 1 ? leaderboardUsdc : BigInt(0);

  // Minimum: topPool >= 1× base pool for all event types.
  const minTopPool = basePool;
  const effectiveTopPool = topPoolUsdc < minTopPool ? minTopPool : topPoolUsdc;

  return basePool + effectiveTopPool + platformFee + creatorPool + leaderboard;
}

/**
 * Minimum top prize = BASE_REWARD * maxParticipants * 1 (1× minimum for all event types)
 */
export function minTopPoolUsdc(maxParticipants: bigint): bigint {
  return BigInt(30_000) * maxParticipants;
}

export function encodeClaimRewards(): `0x${string}` {
  return encodeFunctionData({ abi: VAULT_ABI, functionName: "claimRewards", args: [] });
}

export function encodeWithdrawRefund(): `0x${string}` {
  return encodeFunctionData({ abi: VAULT_ABI, functionName: "withdrawRefund", args: [] });
}

export async function readBrandRefundBalance(account: Address): Promise<bigint> {
  return publicClient.readContract({
    address: REWARDS_VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getBrandRefundBalance",
    args: [account],
  }) as Promise<bigint>;
}

export async function readRequiredUsdc(
  eventType: number,
  maxParticipants: bigint,
  topPoolUsdc: bigint,
  leaderboardPoolUsdc: bigint = BigInt(0)
): Promise<bigint> {
  return publicClient.readContract({
    address: REWARDS_VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "calculateRequiredUsdc",
    args: [eventType, maxParticipants, topPoolUsdc, leaderboardPoolUsdc],
  }) as Promise<bigint>;
}
