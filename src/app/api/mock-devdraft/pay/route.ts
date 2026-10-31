import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { mockPay, mockRefund } from "@/lib/mockDevdraft";

export const dynamic = "force-dynamic";

const Body = z.union([
  z.object({ action: z.literal("pay"), linkId: z.string().min(1), provider: z.enum(["MTN", "Airtel", "Zamtel"]), phone: z.string().max(20).default("") }),
  z.object({ action: z.literal("refund"), paymentId: z.string().min(1) }),
]);

export async function POST(req: Request) {
  if (!config.devdraftMock) return NextResponse.json({ error: "Mock DevDraft is off" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const res = parsed.data.action === "pay" ? await mockPay(parsed.data.linkId, parsed.data.provider, parsed.data.phone) : await mockRefund(parsed.data.paymentId);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res);
}
