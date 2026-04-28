import type { NextConfig } from "next";

const ContentSecurityPolicy = [
  "default-src 'self'",
  // Allow Privy, Cloudflare Turnstile, WalletConnect, and common CDN scripts
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.privy.io https://auth.privy.io",
  // Allow Turnstile + Privy iframes
  "frame-src 'self' https://challenges.cloudflare.com https://*.privy.io https://auth.privy.io https://verify.walletconnect.com",
  // Allow connections to backend, Privy, Cloudflare, Supabase, WalletConnect
  "connect-src 'self' https://challenges.cloudflare.com https://*.privy.io https://auth.privy.io https://*.supabase.co wss://*.supabase.co https://relay.walletconnect.com wss://relay.walletconnect.com https://aris-demo-production.up.railway.app https://api.pimlico.io https://polygon-amoy.g.alchemy.com https://rpc-amoy.polygon.technology",
  // Allow images from anywhere (Cloudinary, IPFS gateways, Unsplash, etc.)
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  // Disable object embeds
  "object-src 'none'",
  // Allow Privy and Turnstile to use required APIs
  "media-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  transpilePackages: ["@pqina/pintura", "@pqina/react-pintura"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
  turbopack: {
    resolveAlias: {
      tailwindcss: require.resolve("tailwindcss/index.css"),
    },
  },
};

export default nextConfig;
