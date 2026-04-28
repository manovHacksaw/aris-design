"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Address, PublicClient, Hash } from "viem";
import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useBalance } from "wagmi";
import { polygonAmoy, publicClient as _publicClient } from "@/lib/blockchain/client";

export { polygonAmoy }; // re-export so ClientProviders import stays backward-compatible

const CHAIN = polygonAmoy;

type SendTransactionParams = {
  to: Address;
  data?: `0x${string}`;
  value?: bigint;
  gasLimit?: bigint;
  gas?: bigint;
};

type WalletContextType = {
  address: Address | null;
  eoaAddress: Address | null;
  balance: string;
  smartWalletClient: any | null; // Represents the generic Privy Smart Wallet Provider
  publicClient: PublicClient | null;
  isAuthenticated: boolean;
  isConnected: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  userInfo: {
    email?: string;
    name?: string;
    profileImage?: string;
  } | null;
  connect: () => void;
  loginWithGoogle: () => void;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTransaction: (params: SendTransactionParams) => Promise<Hash>;
  sendBatchTransaction: (transactions: SendTransactionParams[]) => Promise<Hash>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function WalletProviderInner({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, user: privyUser } = usePrivy();
  const { client: smartWalletClient } = useSmartWallets();

  const [balance, setBalance] = useState<string>("0");
  const [timedOut, setTimedOut] = useState(false);

  // If Privy never becomes ready (e.g. invalid App ID), unblock the auth guard after 5s
  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(id);
  }, [ready]);

  const publicClient = _publicClient;

  // Derive addresses directly from Privy's Smart Wallet Client and User object
  const address = (smartWalletClient?.account?.address as Address) || null;
  const embeddedWallet = privyUser?.linkedAccounts.find(
    (a) => a.type === "wallet" && a.walletClientType === "privy"
  ) as any;
  const eoaAddress = (embeddedWallet?.address as Address) || null;

  const isConnected = ready && authenticated && !!address;
  const isAuthenticated = ready && authenticated;
  const isInitialized = ready || timedOut;

  const userInfo = privyUser
    ? {
      email:
        privyUser.google?.email ||
        (privyUser.email as any)?.address,
      name:
        privyUser.google?.name ||
        (privyUser.email as any)?.address?.split("@")[0],
      profileImage: (privyUser.google as any)?.picture,
    }
    : null;

  const refreshBalance = useCallback(async () => {
    const addr = address || eoaAddress;
    if (!addr) return;

    // Balance refresh from chain (USDC)
    const usdcAddress = process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS;
    if (!usdcAddress || usdcAddress === "0x") return;
    try {
      const result = await publicClient.readContract({
        address: usdcAddress as Address,
        abi: [
          {
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "balanceOf",
        args: [addr],
      });
      setBalance((Number(result as bigint) / 1_000_000).toFixed(2));
    } catch (err: any) {
      if (
        err?.message?.includes("returned no data") ||
        err?.message?.includes("not a contract")
      ) {
        console.warn("USDC contract not found on this chain — balance set to 0");
      } else {
        console.error("Failed to refresh USDC balance:", err);
      }
    }
  }, [address, eoaAddress, publicClient]);

  useEffect(() => {
    if (address || eoaAddress) {
      refreshBalance();
    } else {
      setBalance("0");
    }
  }, [address, eoaAddress, refreshBalance]);

  const sendTransaction = useCallback(
    async (params: SendTransactionParams): Promise<Hash> => {
      if (!smartWalletClient) throw new Error("Smart wallet not ready");
      return smartWalletClient.sendTransaction({
        to: params.to,
        data: params.data || "0x",
        value: params.value || BigInt(0),
        // NOTE: Stub for Privy/Biconomy gasless execution
        // paymasterContext: { mode: "SPONSORED" }
      }) as Promise<Hash>;
    },
    [smartWalletClient]
  );

  const sendBatchTransaction = useCallback(
    async (transactions: SendTransactionParams[]): Promise<Hash> => {
      // Privy Smart Wallets natively support sendTransaction with an array of calls
      if (!smartWalletClient) throw new Error("Smart wallet not ready");
      if (transactions.length === 0) throw new Error("No transactions to send");
      if (transactions.length === 1) return sendTransaction(transactions[0]);

      const calls = transactions.map((tx) => ({
        to: tx.to,
        data: tx.data || ("0x" as `0x${string}`),
        value: tx.value || BigInt(0),
      }));

      // @ts-ignore - Note: Viem extends sendTransaction but Privy Smart Wallet wraps it for batches
      return smartWalletClient.sendTransaction({
        calls,
        // NOTE: Stub for Privy/Biconomy gasless batch execution
        // paymasterContext: { mode: "SPONSORED" } 
      }) as Promise<Hash>;
    },
    [smartWalletClient, sendTransaction]
  );

  const disconnect = useCallback(async () => {
    setBalance("0");
    // Wipe all app state from localStorage (auth token, onboarding data, etc.)
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
    await logout();
  }, [logout]);

  return (
    <WalletContext.Provider
      value={{
        address,
        eoaAddress,
        balance,
        smartWalletClient,
        publicClient,
        isAuthenticated,
        isConnected,
        isLoading: !ready && !timedOut,
        isInitialized,
        userInfo,
        connect: login,
        loginWithGoogle: login,
        disconnect,
        refreshBalance,
        sendTransaction,
        sendBatchTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return <WalletProviderInner>{children}</WalletProviderInner>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside a WalletProvider");
  return ctx;
}
