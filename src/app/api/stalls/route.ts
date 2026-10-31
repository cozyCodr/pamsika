import { NextResponse } from "next/server";
import { z } from "zod";
import { db, newId } from "@/lib/db";
import { MARKETS } from "@/lib/staples";

const Body = z.object({
  name: z.string().trim().min(2).max(60),
  market: z.enum(MARKETS as [string, ...string[]]),
  language: z.enum(["en", "ny", "bem"]),
  phone: z.string().trim().max(20).optional().default(""),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please fill in your stall name and market." }, { status: 400 });
  const { name, market, language, phone } = parsed.data;
  const id = newId("stall");
  db().prepare("INSERT INTO stalls (id, name, market, language, phone) VALUES (?, ?, ?, ?, ?)").run(id, name, market, language, phone || null);
  return NextResponse.json({ id, name, market, language });
}
