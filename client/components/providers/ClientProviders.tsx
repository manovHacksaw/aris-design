"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'wagmi';
import { polygonAmoy as wagmiPolygonAmoy } from 'wagmi/chains';

import { WalletProvider } from "@/context/WalletContext";
import { polygonAmoy } from "@/lib/blockchain/client";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { SocketProvider } from "@/context/SocketContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { Toaster } from "sonner";
import { type ReactNode } from "react";

import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';

// Setup Wagmi Config for Privy
export const wagmiConfig = createConfig({
  chains: [wagmiPolygonAmoy],
  transports: {
    [wagmiPolygonAmoy.id]: http(),
  },
});

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["google", "email"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          showWalletUIs: false,
        },
        defaultChain: polygonAmoy,
        supportedChains: [polygonAmoy],
        appearance: {
          theme: "dark",
          accentColor: "#3B82F6",
          logo: "/icons/aris_logo.png",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <SmartWalletsProvider
            config={{
              // Auto-approve transactions to these contracts — no popup needed
              allowlistContractAddresses: [
                (process.env.NEXT_PUBLIC_REWARDS_VAULT_ADDRESS || "0x34C5A617e32c84BC9A54c862723FA5538f42F221") as `0x${string}`,
                (process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS || "0x61d11C622Bd98A71aD9361833379A2066Ad29CCa") as `0x${string}`,
              ],
            }}
          >
            <WalletProvider>
              <UserProvider>
                <SocketProvider>
                  <NotificationProvider>
                    <AuthProvider>
                      <SidebarProvider>
                        {children}
                        <Toaster
                          position="top-center"
                          richColors
                          toastOptions={{
                            style: {
                              background: "rgba(10, 10, 10, 0.95)",
                              backdropFilter: "blur(20px)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "12px",
                              color: "#fff",
                            },
                          }}
                        />
                      </SidebarProvider>
                    </AuthProvider>
                  </NotificationProvider>
                </SocketProvider>
              </UserProvider>
            </WalletProvider>
          </SmartWalletsProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
