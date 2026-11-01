import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoard } from "@/lib/ai";
import { newId, run } from "@/lib/db";
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
  if (/"code":\s*(500|502|503|504|429)|INTERNAL|UNAVAILABLE|overloaded/i.test(raw)) {
    return { message: "Gemma is busy right now. Please try that photo again in a moment.", status: 503 };
  }
  if (/Unable to process input image/i.test(raw)) return { message: "Gemma couldn't open that photo. Try taking it again.", status: 422 };
  if (/INVALID_ARGUMENT|"code":\s*400/i.test(raw)) {
    console.error("[board/read] Gemini rejected the image request:", raw.slice(0, 300));
    return { message: "Gemma couldn't read photos right now. Please try again in a few minutes.", status: 502 };
  }
  console.error("[board/read] unexpected Gemma error:", raw.slice(0, 300));
  if (/^\s*\{/.test(raw)) return { message: "Gemma couldn't read that photo. Please try again.", status: 502 };
  return { message: raw.slice(0, 300), status: 502 };
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please send a JPEG, PNG or WebP photo." }, { status: 400 });
  const { stallId, imageBase64, mimeType } = parsed.data;
  if (!(await getStall(stallId))) return NextResponse.json({ error: "Set up your stall first." }, { status: 404 });
  try {
    const { items, model } = await readBoard(imageBase64, mimeType);
    const boardId = newId("board");
    await run("INSERT INTO boards (id, stall_id, raw_json) VALUES (?, ?, ?)", [boardId, stallId, JSON.stringify(items)]);
    return NextResponse.json({ boardId, items, model, gemma: model.startsWith("gemma") });
  } catch (err) {
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
