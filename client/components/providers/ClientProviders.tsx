"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WalletProvider, polygonAmoy } from "@/context/WalletContext";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { Toaster } from "sonner";
import { type ReactNode } from "react";

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
      <WalletProvider>
        <UserProvider>
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
        </UserProvider>
      </WalletProvider>
    </PrivyProvider>
  );
}
