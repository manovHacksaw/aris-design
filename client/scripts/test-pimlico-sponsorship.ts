/**
 * Phase 3 — PAY-03 Verification Script
 *
 * Proves end-to-end Pimlico sponsorship on Polygon Amoy. On testnet, Pimlico
 * sponsors all UserOps automatically — no policy needed.
 *
 * Prerequisite: configure Privy Dashboard → Smart Wallets → Polygon Amoy
 *   Bundler URL:   https://api.pimlico.io/v2/80002/rpc?apikey=pim_Q4eNC7jUqJX851hdnJVrs5
 *   Paymaster URL: https://api.pimlico.io/v2/80002/rpc?apikey=pim_Q4eNC7jUqJX851hdnJVrs5
 *
 * Run:
 *   cd client && npx tsx scripts/test-pimlico-sponsorship.ts
 */

import { createPublicClient, http, encodeFunctionData } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { polygonAmoy } from "../lib/blockchain/client";
import { USDC_ABI } from "../lib/blockchain/contracts";
import type { Address } from "viem";

// Hardcoded for the script — NEXT_PUBLIC_* vars aren't loaded by tsx
const USDC_ADDRESS = "0x61d11C622Bd98A71aD9361833379A2066Ad29CCa" as Address;
const REWARDS_VAULT_ADDRESS = "0x34C5A617e32c84BC9A54c862723FA5538f42F221" as Address;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PIMLICO_API_KEY =
  process.env.NEXT_PUBLIC_PIMLICO_API_KEY ?? "pim_Q4eNC7jUqJX851hdnJVrs5";

const PIMLICO_RPC = `https://api.pimlico.io/v2/80002/rpc?apikey=${PIMLICO_API_KEY}`;
const EXPLORER_BASE = "https://jiffyscan.xyz/userOpHash";

// ---------------------------------------------------------------------------

async function main() {
  console.log("\n=== Pimlico Sponsorship Verification (Phase 3 — PAY-03) ===\n");
  console.log(`Chain:          Polygon Amoy (80002)`);
  console.log(`Pimlico RPC:    ${PIMLICO_RPC}`);
  console.log(`USDC:           ${USDC_ADDRESS}`);
  console.log(`RewardsVault:   ${REWARDS_VAULT_ADDRESS}`);

  console.log(`Sponsorship:    automatic (testnet — no policy required)\n`);

  // 1. Fresh random EOA — this avoids any stored state issues
  const privateKey = generatePrivateKey();
  const owner = privateKeyToAccount(privateKey);
  console.log(`Test EOA:       ${owner.address} (ephemeral — discarded after run)`);

  // 2. Public client for contract reads
  const publicClient = createPublicClient({ chain: polygonAmoy, transport: http() });

  // 3. Pimlico client (handles both bundling and paymaster)
  const pimlico = createPimlicoClient({
    transport: http(PIMLICO_RPC),
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });

  // 4. SimpleAccount — counterfactual (not deployed). Privy uses Kernel, but for
  //    the sponsorship test any ERC-4337 account type works.
  const account = await toSimpleSmartAccount({
    client: publicClient,
    owner,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });
  console.log(`Smart account:  ${account.address} (counterfactual — not yet deployed)`);

  // 5. Smart account client with Pimlico as bundler + sponsoring paymaster
  const smartAccountClient = createSmartAccountClient({
    account,
    chain: polygonAmoy,
    bundlerTransport: http(PIMLICO_RPC),
    paymaster: pimlico,
    userOperation: {
      estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
    },
  });

  // 6. Test call: USDC.approve(REWARDS_VAULT_ADDRESS, 0)
  //    - USDC is whitelisted in the policy
  //    - approve(addr, 0) is harmless (sets allowance to 0)
  //    - Proves the full sponsored flow end-to-end
  const callData = encodeFunctionData({
    abi: USDC_ABI,
    functionName: "approve",
    args: [REWARDS_VAULT_ADDRESS, BigInt(0)],
  });

  console.log(`\nSending sponsored UserOp: USDC.approve(RewardsVault, 0) ...`);

  try {
    const txHash = await smartAccountClient.sendTransaction({
      to: USDC_ADDRESS,
      data: callData,
      value: BigInt(0),
    });

    console.log(`\n✅ UserOp submitted!`);
    console.log(`   Hash:     ${txHash}`);
    console.log(`   Explorer: ${EXPLORER_BASE}/${txHash}?network=polygon-amoy`);
    console.log(`\nVerify it appears as "Sponsored" in the Pimlico Dashboard before Phase 4.\n`);
  } catch (err: any) {
    console.error(`\n❌ UserOp failed:`, err?.message ?? err);
    if (err?.message?.includes("sponsorship")) {
      console.error(`   → Policy ID may be wrong or policy is not yet active.`);
    }
    if (err?.message?.includes("AA20") || err?.message?.includes("not deployed")) {
      console.error(`   → AA20 should not happen — counterfactual initCode is included automatically.`);
    }
    process.exit(1);
  }
}

main();
