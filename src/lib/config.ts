import "server-only";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export const config = {
  geminiApiKey: env("GEMINI_API_KEY"),
  gemmaModel: env("GEMMA_MODEL", "gemma-4-26b-a4b-it"),
  devdraftBaseUrl: env("DEVDRAFT_BASE_URL", "https://api.devdraft.ai").replace(/\/$/, ""),
  devdraftClientKey: env("DEVDRAFT_CLIENT_KEY"),
  devdraftClientSecret: env("DEVDRAFT_CLIENT_SECRET"),
  devdraftWebhookSecret: env("DEVDRAFT_WEBHOOK_SECRET"),
  devdraftCheckoutBase: env("DEVDRAFT_CHECKOUT_BASE"),
  devdraftFallbackLinkType: env("DEVDRAFT_FALLBACK_LINK_TYPE", "COLLECTION"),
  zmwPerUsd: Number(env("ZMW_PER_USD", "25")) || 25,
  demoMaxUsd: Number(env("DEMO_MAX_USD", "5")) || 5,
  publicBaseUrl: env("PUBLIC_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
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
