import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone", // Required for Vercel/Docker deployments in some monorepo setups
};

export default nextConfig;
