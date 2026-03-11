import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  serverExternalPackages: ["pino", "pino-pretty"],
  transpilePackages: ["@pqina/pintura", "@pqina/react-pintura"],
=======
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
>>>>>>> 45351bcf49a5ed1e69c126a3ed39008636d7a294
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
