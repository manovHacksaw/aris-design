import type { NextConfig } from "next";

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
