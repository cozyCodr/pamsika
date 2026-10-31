import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { config } from "./config";
import { STAPLES, STAPLE_KEYS, stapleByKey } from "./staples";

const ItemSchema = z.object({
  name: z.string().min(1).max(80),
  unit: z.string().max(40).nullable().optional(),
  price_zmw: z.number().nonnegative(),
  canonical_key: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  flag_reason: z.string().max(200).nullable().optional(),
  suggested_price_zmw: z.number().positive().nullable().optional(),
});

const BoardSchema = z.object({ items: z.array(ItemSchema).max(40) });

export type BoardItem = {
  name: string;
  unit: string;
  priceZmw: number;
  canonicalKey: string | null;
  confidence: number;
  flagReason: string | null;
  suggestedPriceZmw: number | null;
};

const BOARD_PROMPT = `You read photos of handwritten price boards from markets and shops in Lusaka, Zambia.
Prices are in Zambian Kwacha (K or ZMW). Return ONLY JSON, no prose, matching:
{"items":[{"name":string,"unit":string|null,"price_zmw":number,"canonical_key":string|null,"confidence":number,"flag_reason":string|null,"suggested_price_zmw":number|null}]}
Rules:
- One entry per product line on the board, in board order. Skip headings and dates.
- "name": short product name in Title Case, e.g. "Mealie meal". Put size/quantity in "unit", e.g. "25kg bag", "Box", "Bundle".
- "canonical_key": one of ${STAPLE_KEYS.join(", ")} when the item clearly is that staple in that unit, else null.
- "confidence": 0-1, how sure you are you read the name and price correctly.
- "flag_reason": a short, friendly sentence for the seller when the price looks like a likely typo for that item (e.g. a missing zero), the writing is unclear, or the line is duplicated; else null.
- "suggested_price_zmw": your best guess of the intended price when you flag a likely typo; else null.
- Never invent items that are not on the board. If the image is not a price board, return {"items":[]}.`;

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model returned no JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function generate(parts: Array<Record<string, unknown>>): Promise<string> {
  const res = await ai().models.generateContent({
    model: config.gemmaModel,
    contents: [{ role: "user", parts }],
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, temperature: 0.2 },
  });
  return res.text ?? "";
}

function applyHeuristics(item: BoardItem): BoardItem {
  const staple = stapleByKey(item.canonicalKey);
  if (!staple || item.flagReason) return item;
  if (item.priceZmw < staple.minZmw || item.priceZmw > staple.maxZmw) {
    const tenX = item.priceZmw * 10;
    const suggestion = tenX >= staple.minZmw && tenX <= staple.maxZmw ? tenX : null;
    return {
      ...item,
      flagReason: suggestion
        ? `K${item.priceZmw} looks low for ${staple.label.toLowerCase()}. Did you mean K${suggestion}?`
        : `K${item.priceZmw} looks unusual for ${staple.label.toLowerCase()} (${staple.unit}). Please check.`,
      suggestedPriceZmw: item.suggestedPriceZmw ?? suggestion,
    };
  }
  return item;
}

export async function readBoard(imageBase64: string, mimeType: string): Promise<BoardItem[]> {
  const imagePart = { inlineData: { mimeType, data: imageBase64 } };
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? BOARD_PROMPT : `${BOARD_PROMPT}\nYour previous answer was invalid (${lastError}). Return valid JSON only.`;
    const text = await generate([imagePart, { text: prompt }]);
    try {
      const parsed = BoardSchema.parse(extractJson(text));
      return parsed.items.map((i) =>
        applyHeuristics({
          name: i.name,
          unit: i.unit ?? "",
          priceZmw: i.price_zmw,
          canonicalKey: i.canonical_key && STAPLE_KEYS.includes(i.canonical_key) ? i.canonical_key : null,
          confidence: i.confidence ?? 0.8,
          flagReason: i.flag_reason ?? null,
          suggestedPriceZmw: i.suggested_price_zmw ?? null,
        }),
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message.slice(0, 300) : "invalid JSON";
    }
  }
  throw new Error(`Could not read the board: ${lastError}`);
}

const LANGUAGE_NAMES: Record<string, string> = { en: "English", ny: "Nyanja (Chinyanja)", bem: "Bemba (Icibemba)" };

export async function writeMessage(kind: "paid" | "summary", language: string, facts: string): Promise<string> {
  const lang = LANGUAGE_NAMES[language] ?? "English";
  const task =
    kind === "paid"
      ? "Write a warm one or two sentence WhatsApp message from a market trader confirming a customer's payment."
      : "Write a short, encouraging end-of-day WhatsApp summary (max 3 lines) for a market trader about today's sales.";
  const text = await generate([{ text: `${task}\nWrite it in ${lang}. Use only these facts, do not invent numbers:\n${facts}\nReturn only the message text.` }]);
  return text.trim();
}

export { STAPLES };
