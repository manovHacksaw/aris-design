import type { Address, Hash } from "viem";

export type GaslessCall = {
  to: Address;
  data?: `0x${string}`;
  value?: bigint;
};

/**
 * Send a gasless transaction (or batch) via the Privy smart wallet client.
 *
 * Privy's SmartWalletsProvider automatically handles counterfactual deployment
 * (factory + factoryData in EntryPoint v0.7) for fresh accounts, so AA20
 * "account not deployed" errors will not occur even on the very first transaction.
 */
export async function sendGaslessTransaction(
  client: { sendTransaction: (params: any) => Promise<Hash> },
  calls: GaslessCall[]
): Promise<Hash> {
  if (calls.length === 0) throw new Error("sendGaslessTransaction requires at least one call");

  if (calls.length === 1) {
    const [call] = calls;
    return client.sendTransaction({
      to: call.to,
      data: call.data ?? ("0x" as `0x${string}`),
      value: call.value ?? BigInt(0),
    });
  }

  // Batch: Privy bundles multiple calls into a single UserOperation
  return client.sendTransaction({
    calls: calls.map((c) => ({
      to: c.to,
      data: c.data ?? ("0x" as `0x${string}`),
      value: c.value ?? BigInt(0),
    })),
  });
}
