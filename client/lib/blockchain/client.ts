import { createPublicClient, http, formatUnits } from "viem";
import { defineChain } from "viem";
import type { Address, Hash, PublicClient } from "viem";

export const polygonAmoy = defineChain({
  id: 80002,
  name: "Polygon Amoy Testnet",
  nativeCurrency: { decimals: 18, name: "MATIC", symbol: "MATIC" },
  rpcUrls: { default: { http: ["https://rpc-amoy.polygon.technology"] } },
  blockExplorers: {
    default: { name: "Polygon Amoy Explorer", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
});

export const publicClient: PublicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

// Re-export viem utilities so app/ and components/ never import viem directly
export { formatUnits };
export type { Address, Hash, PublicClient };
