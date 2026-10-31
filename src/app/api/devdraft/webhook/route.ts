import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { recordWebhookEvent, verifySignature, type DevDraftEvent } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!config.devdraftWebhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }
  if (!verifySignature(raw, req.headers.get("x-webhook-signature"), config.devdraftWebhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let evt: DevDraftEvent;
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = recordWebhookEvent(evt);
  return NextResponse.json({ received: true, duplicate: !result.stored });
}
