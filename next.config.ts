import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  // Netlify sets URL (the site's primary address) at build time; bake it in so the deployed app knows its own origin.
  env: { DEPLOY_SITE_URL: process.env.URL ?? "" },
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
