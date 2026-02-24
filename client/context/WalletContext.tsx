"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  createPublicClient,
  http,
  type Address,
  type PublicClient,
  custom,
  createWalletClient,
  type Hash,
} from "viem";
import { defineChain } from "viem";
import { usePrivy, useWallets } from "@privy-io/react-auth";

import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";

export const polygonAmoy = defineChain({
  id: 80002,
  name: "Polygon Amoy Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MATIC",
    symbol: "MATIC",
  },
  rpcUrls: {
    default: { http: ["https://rpc-amoy.polygon.technology"] },
  },
  blockExplorers: {
    default: {
      name: "Polygon Amoy Explorer",
      url: "https://amoy.polygonscan.com",
    },
  },
  testnet: true,
});

const CHAIN = polygonAmoy;
const PIMLICO_API_KEY =
  process.env.NEXT_PUBLIC_PIMLICO_API_KEY || "pim_EUHoE84PA87vUFGYGNemv2";
const PIMLICO_RPC = `https://api.pimlico.io/v2/80002/rpc?apikey=${PIMLICO_API_KEY}`;

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
  kernelClient: any | null;
  walletClient: any | null;
  publicClient: PublicClient | null;
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
  const { wallets } = useWallets();

  const [balance, setBalance] = useState<string>("0");
  const [walletClient, setWalletClient] = useState<any | null>(null);
  const [smartAccountClient, setSmartAccountClient] = useState<any | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: CHAIN,
        transport: http(),
      }),
    []
  );

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const eoaAddress = (embeddedWallet?.address as Address) || null;

  const address = smartAccountAddress || eoaAddress;
  const isConnected = ready && authenticated;
  const isInitialized = ready;

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

  // Set up EOA walletClient from Privy embedded wallet
  useEffect(() => {
    if (!embeddedWallet) {
      setWalletClient(null);
      return;
    }
    embeddedWallet
      .getEthereumProvider()
      .then((provider) => {
        setWalletClient(
          createWalletClient({ chain: CHAIN, transport: custom(provider) })
        );
      })
      .catch((e) => {
        console.warn("Failed to get Ethereum provider from embedded wallet:", e);
      });
  }, [embeddedWallet?.address]);

  // Build smart account client once the EOA walletClient is ready
  useEffect(() => {
    if (!walletClient || !embeddedWallet) {
      setSmartAccountClient(null);
      setSmartAccountAddress(null);
      return;
    }

    let cancelled = false;

    async function buildSmartAccount() {
      try {
        const pimlico = createPimlicoClient({
          transport: http(PIMLICO_RPC),
          entryPoint: { address: entryPoint07Address, version: "0.7" },
        });

        const simpleAccount = await toSimpleSmartAccount({
          client: publicClient,
          owner: walletClient,
          entryPoint: { address: entryPoint07Address, version: "0.7" },
        });

        if (cancelled) return;

        const saClient = createSmartAccountClient({
          account: simpleAccount,
          chain: CHAIN,
          bundlerTransport: http(PIMLICO_RPC),
          paymaster: pimlico,
          userOperation: {
            estimateFeesPerGas: async () => {
              return (await pimlico.getUserOperationGasPrice()).fast;
            },
          },
        });

        if (cancelled) return;

        setSmartAccountClient(saClient);
        setSmartAccountAddress(simpleAccount.address as Address);
        console.log("✅ WalletContext: Smart account ready at", simpleAccount.address);
      } catch (err) {
        console.error("WalletContext: Failed to build smart account client:", err);
      }
    }

    buildSmartAccount();
    return () => {
      cancelled = true;
    };
  }, [walletClient, publicClient]);

  const refreshBalance = useCallback(async () => {
    const addr = smartAccountAddress || eoaAddress;
    if (!addr) return;
    // Balance refresh from chain (USDC) - skipped if no contract address
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
  }, [smartAccountAddress, eoaAddress, publicClient]);

  useEffect(() => {
    if (address) {
      refreshBalance();
    } else {
      setBalance("0");
    }
  }, [address]);

  const sendTransaction = useCallback(
    async (params: SendTransactionParams): Promise<Hash> => {
      if (!smartAccountClient) throw new Error("Smart wallet not ready");
      return smartAccountClient.sendTransaction({
        to: params.to,
        data: params.data || "0x",
        value: params.value || BigInt(0),
      }) as Promise<Hash>;
    },
    [smartAccountClient]
  );

  const sendBatchTransaction = useCallback(
    async (transactions: SendTransactionParams[]): Promise<Hash> => {
      if (!smartAccountClient) throw new Error("Smart wallet not ready");
      if (transactions.length === 0) throw new Error("No transactions to send");
      if (transactions.length === 1) return sendTransaction(transactions[0]);

      const calls = transactions.map((tx) => ({
        to: tx.to,
        data: tx.data || ("0x" as `0x${string}`),
        value: tx.value || BigInt(0),
      }));

      return smartAccountClient.sendTransaction({ calls }) as Promise<Hash>;
    },
    [smartAccountClient, sendTransaction]
  );

  const disconnect = useCallback(async () => {
    setBalance("0");
    setWalletClient(null);
    setSmartAccountClient(null);
    setSmartAccountAddress(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("aris_onboarding");
    }
    await logout();
  }, [logout]);

  return (
    <WalletContext.Provider
      value={{
        address,
        eoaAddress,
        balance,
        kernelClient: smartAccountClient || null,
        walletClient,
        publicClient,
        isConnected,
        isLoading: !ready,
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
