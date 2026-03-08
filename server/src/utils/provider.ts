import { ethers } from 'ethers';

/**
 * Get a provider instance for signature verification
 * Uses RPC URL from environment or defaults to a public RPC
 */
export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';
  return new ethers.JsonRpcProvider(rpcUrl);
}

