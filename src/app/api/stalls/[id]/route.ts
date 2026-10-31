import { NextResponse } from "next/server";
import { getStall, stallItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stall = getStall(id);
  if (!stall) return NextResponse.json({ error: "Stall not found" }, { status: 404 });
  return NextResponse.json({ stall: { id: stall.id, name: stall.name, market: stall.market, language: stall.language }, items: stallItems(id) });
}
