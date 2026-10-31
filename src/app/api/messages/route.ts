import { NextResponse } from "next/server";
import { z } from "zod";
import { writeMessage } from "@/lib/ai";
import { getStall, salesForStall } from "@/lib/queries";

export const maxDuration = 30;

const Body = z.object({ stallId: z.string().min(1), kind: z.enum(["paid", "summary"]), item: z.string().max(120).optional(), amountZmw: z.number().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { stallId, kind, item, amountZmw } = parsed.data;
  const stall = await getStall(stallId);
  if (!stall) return NextResponse.json({ error: "Stall not found" }, { status: 404 });
  const s = kind === "summary" ? await salesForStall(stallId) : null;
  const facts = s
    ? `Stall: ${stall.name}, ${stall.market}. Payments today: ${s.count}. Total: K${s.totalZmw}. Top item: ${s.topItem ?? "none"}.`
    : `Stall: ${stall.name}, ${stall.market}. Item: ${item ?? "goods"}. Amount: K${amountZmw ?? "?"}. Paid by mobile money.`;
  try {
    return NextResponse.json({ text: await writeMessage(kind, stall.language, facts), language: stall.language });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const credit = /credits are depleted|RESOURCE_EXHAUSTED/i.test(raw);
    return NextResponse.json({ error: credit ? "Gemma is out of API credit." : raw.slice(0, 200) }, { status: credit ? 402 : 502 });
  }
}
