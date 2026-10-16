import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unzipper"],
  // Pin the tracing root to this project; otherwise Next may pick a lockfile
  // higher up the filesystem (e.g. the user's home directory).
  outputFileTracingRoot: process.cwd()
};

export default nextConfig;
