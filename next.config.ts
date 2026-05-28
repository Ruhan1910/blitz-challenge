import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    RefreshIntervalTime: process.env.RefreshIntervalTime || "0.133",
  },
};

export default nextConfig;
