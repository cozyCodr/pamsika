import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoard } from "@/lib/ai";
import { db, newId } from "@/lib/db";
import { getStall } from "@/lib/queries";

export const maxDuration = 60;

const Body = z.object({
  stallId: z.string().min(1),
  imageBase64: z.string().min(100).max(8_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

function friendlyError(err: unknown): { message: string; status: number } {
  const raw = err instanceof Error ? err.message : String(err);
  if (/credits are depleted|RESOURCE_EXHAUSTED|402/i.test(raw)) {
    return { message: "Gemma is out of API credit. Top up the AI Studio project, then try again.", status: 402 };
  }
  if (/API key|PERMISSION_DENIED|401|403/i.test(raw)) return { message: "The Gemma API key was rejected.", status: 401 };
  if (/GEMINI_API_KEY is not set/.test(raw)) return { message: "GEMINI_API_KEY is not set on the server.", status: 500 };
  return { message: raw.slice(0, 300), status: 502 };
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please send a JPEG, PNG or WebP photo." }, { status: 400 });
  const { stallId, imageBase64, mimeType } = parsed.data;
  if (!getStall(stallId)) return NextResponse.json({ error: "Set up your stall first." }, { status: 404 });
  try {
    const items = await readBoard(imageBase64, mimeType);
    const boardId = newId("board");
    db().prepare("INSERT INTO boards (id, stall_id, raw_json) VALUES (?, ?, ?)").run(boardId, stallId, JSON.stringify(items));
    return NextResponse.json({ boardId, items });
  } catch (err) {
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
