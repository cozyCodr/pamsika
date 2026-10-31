import { NextResponse } from "next/server";
import { salesForStall } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const stallId = new URL(req.url).searchParams.get("stallId");
  if (!stallId) return NextResponse.json({ error: "stallId required" }, { status: 400 });
  return NextResponse.json(salesForStall(stallId));
}
