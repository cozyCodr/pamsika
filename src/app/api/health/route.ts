import { NextResponse } from "next/server";
import { config, devdraftConfigured, simulateAllowed } from "@/lib/config";
import { devdraftReadiness } from "@/lib/devdraft";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  db();
  const ready = await devdraftReadiness();
  return NextResponse.json({
    app: "ok",
    gemma: { model: config.gemmaModel, keySet: Boolean(config.geminiApiKey) },
    devdraft: { mode: config.devdraftMock ? "mock" : "live", configured: devdraftConfigured(), ready: ready.ok, message: ready.message },
    webhookSecretSet: Boolean(config.devdraftWebhookSecret),
    simulateAllowed: simulateAllowed(ready.ok),
    publicBaseUrl: config.publicBaseUrl,
  });
}
