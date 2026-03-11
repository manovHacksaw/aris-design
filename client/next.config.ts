import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  transpilePackages: ["@pqina/pintura", "@pqina/react-pintura"],
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
    root: path.resolve(__dirname),
    resolveAlias: {
      tailwindcss: require.resolve("tailwindcss/index.css"),
    },
  },
};

export default nextConfig;
