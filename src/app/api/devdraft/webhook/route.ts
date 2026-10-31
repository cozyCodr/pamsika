import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { recordWebhookEvent, verifySignature, type DevDraftEvent } from "@/lib/payments";

export const dynamic = "force-dynamic";

function describe(req: Request, raw: string, reason: string) {
  let topKeys: string[] | string = "not JSON";
  try {
    const parsed = JSON.parse(raw);
    topKeys = parsed && typeof parsed === "object" ? Object.keys(parsed) : typeof parsed;
  } catch {}
  console.warn("[webhook] rejected", {
    reason,
    headers: [...req.headers.keys()].filter((h) => !/cookie|authorization/i.test(h)),
    contentType: req.headers.get("content-type"),
    bodyLength: raw.length,
    topKeys,
  });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!config.devdraftWebhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }
  if (!verifySignature(raw, req.headers.get("x-webhook-signature"), config.devdraftWebhookSecret)) {
    describe(req, raw, req.headers.get("x-webhook-signature") ? "signature mismatch" : "no x-webhook-signature header");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let evt: DevDraftEvent;
  try {
    evt = JSON.parse(raw);
  } catch {
    describe(req, raw, "body is not JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!evt.type) describe(req, raw, "signed but no event type (encrypted payload?)");
  const result = recordWebhookEvent(evt);
  console.info("[webhook] accepted", { type: evt.type, id: evt.id, duplicate: !result.stored });
  return NextResponse.json({ received: true, duplicate: !result.stored });
}
