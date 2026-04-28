import { apiRequest } from "./api";

interface FaucetResponse {
  funded: boolean;
  txHash?: string;
  balance: string;
  message?: string;
}

/**
 * Request test USDC from the backend faucet for a smart account.
 * Only mints if the address balance is below $0.50.
 */
export async function requestTestUsdc(smartAccountAddress: string): Promise<FaucetResponse> {
  return apiRequest<FaucetResponse>("/faucet/usdc", {
    method: "POST",
    body: JSON.stringify({ address: smartAccountAddress }),
  });
}
