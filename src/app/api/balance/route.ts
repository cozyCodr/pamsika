import { NextResponse } from "next/server";
import { devdraftConfigured } from "@/lib/config";
import { balances } from "@/lib/devdraft";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!devdraftConfigured()) return NextResponse.json({ configured: false, usdc: null });
  try {
    const b = await balances();
    return NextResponse.json({ configured: true, usdc: b.usdc?.total_balance ?? null, totalUsd: b.total_usd_value ?? null });
  } catch (err) {
    return NextResponse.json({ configured: true, usdc: null, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
