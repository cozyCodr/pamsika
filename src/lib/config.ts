import "server-only";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

const devdraftMock = env("DEVDRAFT_MODE") === "mock";
// On a hosted deploy the platform's own site URL wins over PUBLIC_BASE_URL, which may still point at a dev tunnel.
const deploySiteUrl = (process.env.DEPLOY_SITE_URL ?? "").trim();
const publicBaseUrl = (deploySiteUrl || env("PUBLIC_BASE_URL", "http://localhost:3000")).replace(/\/$/, "");
const serverless = Boolean(deploySiteUrl || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
const localOrigin = env("LOCAL_ORIGIN", serverless ? publicBaseUrl : `http://127.0.0.1:${env("PORT", "3000")}`).replace(/\/$/, "");

export const config = {
  geminiApiKey: env("GEMINI_API_KEY"),
  gemmaModel: env("GEMMA_MODEL", "gemma-4-26b-a4b-it"),
  // Used only when Gemma rejects a photo outright. Gemma 4 is free; Flash-Lite is the cheapest paid model that reads photos well.
  // Pinned rather than a -latest alias so the price can't change under us. Set PHOTO_FALLBACK_MODEL=off to disable.
  photoFallbackModel: env("PHOTO_FALLBACK_MODEL", "gemini-3.1-flash-lite").replace(/^off$/, ""),
  devdraftMock,
  localOrigin,
  devdraftBaseUrl: devdraftMock ? `${localOrigin}/api/mock-devdraft` : env("DEVDRAFT_BASE_URL", "https://api.devdraft.ai").replace(/\/$/, ""),
  devdraftClientKey: env("DEVDRAFT_CLIENT_KEY"),
  devdraftClientSecret: env("DEVDRAFT_CLIENT_SECRET"),
  devdraftWebhookSecret: env("DEVDRAFT_WEBHOOK_SECRET"),
  devdraftCheckoutBase: env("DEVDRAFT_CHECKOUT_BASE"),
  devdraftFallbackLinkType: env("DEVDRAFT_FALLBACK_LINK_TYPE", "COLLECTION"),
  zmwPerUsd: Number(env("ZMW_PER_USD", "25")) || 25,
  demoMaxUsd: Number(env("DEMO_MAX_USD", "5")) || 5,
  publicBaseUrl,
  allowSimulate: env("ALLOW_SIMULATE") === "1",
};

export function devdraftConfigured(): boolean {
  return Boolean(config.devdraftClientKey && config.devdraftClientSecret);
}

export function simulateAllowed(devdraftReady: boolean): boolean {
  return config.allowSimulate || !devdraftReady;
}

export function zmwToUsd(zmw: number): number {
  return Math.max(0.01, Math.round((zmw / config.zmwPerUsd) * 100) / 100);
}

export function usdToZmw(usd: number): number {
  return Math.round(usd * config.zmwPerUsd);
}
