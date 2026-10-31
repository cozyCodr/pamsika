import { NextResponse } from "next/server";
import { z } from "zod";
import { simulateAllowed } from "@/lib/config";
import { devdraftReadiness } from "@/lib/devdraft";
import { recordSimulatedPayment } from "@/lib/payments";

const Body = z.object({ itemId: z.string().min(1) });

export async function POST(req: Request) {
  if (!simulateAllowed((await devdraftReadiness()).ok)) return NextResponse.json({ error: "Simulated payments are off" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "itemId required" }, { status: 400 });
  try {
    return NextResponse.json({ id: await recordSimulatedPayment(parsed.data.itemId), simulated: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 404 });
  }
}
