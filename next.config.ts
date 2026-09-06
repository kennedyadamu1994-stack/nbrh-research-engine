import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname } from "path";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to THIS repo. There's a stray
  // package-lock.json in the home directory that Next would otherwise
  // infer as the workspace root, which throws off the standalone build
  // trace on Vercel.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
