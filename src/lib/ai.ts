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

const BOARD_PROMPT = `You help market traders in Lusaka, Zambia turn photos into a price list.
The photo is usually a handwritten price board, but it can also be products shown next to a price (a price tag, a sign or a screen), or a shelf with price labels.
Prices are in Zambian Kwacha (K or ZMW). Return ONLY JSON, no prose, matching:
{"items":[{"name":string,"unit":string|null,"price_zmw":number,"canonical_key":string|null,"confidence":number,"flag_reason":string|null,"suggested_price_zmw":number|null}]}
Rules:
- One entry per product with a visible price, in reading order. Skip headings and dates.
- "name": short product name in Title Case, e.g. "Mealie meal". When a product's packaging is visible, name it from the label (brand and flavour, e.g. "Fanta Orange"), never use the price itself as the name.
- Put size/quantity in "unit", e.g. "25kg bag", "Box", "Bundle", or the pack size printed on a bottle or packet (e.g. "500ml") when you can read it.
- Pair each visible price with the product it belongs to. If one product and one price are shown together, they belong together.
- "canonical_key": one of ${STAPLE_KEYS.join(", ")} when the item clearly is that staple in that unit, else null.
- "confidence": 0-1, how sure you are you read the name and price correctly.
- "flag_reason": a short, friendly sentence for the seller when the price looks like a likely typo for that item (e.g. a missing zero), the writing is unclear, or the line is duplicated; else null. Do not flag an item just because the photo is not a chalk board.
- "suggested_price_zmw": your best guess of the intended price when you flag a likely typo; else null.
- Never invent items or prices that are not visible. If no prices are visible at all, return {"items":[]}.`;

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

const FALLBACK_MODEL: Record<string, string> = { "gemma-4-26b-a4b-it": "gemma-4-31b-it", "gemma-4-31b-it": "gemma-4-26b-a4b-it" };

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /"code":\s*(500|502|503|504|429)|INTERNAL|UNAVAILABLE|overloaded|ECONNRESET|fetch failed/i.test(msg);
}

function isRejectedImage(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /INVALID_ARGUMENT|"code":\s*400/i.test(msg);
}

export type Generated = { text: string; model: string };

// Google's API occasionally returns 500/503; retry once on the same model, then once on the other Gemma 4 model.
async function generateWithGemma(parts: Array<Record<string, unknown>>): Promise<Generated> {
  const models = [config.gemmaModel, config.gemmaModel, FALLBACK_MODEL[config.gemmaModel] ?? config.gemmaModel];
  let lastErr: unknown;
  for (const [i, model] of models.entries()) {
    try {
      const res = await ai().models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, temperature: 0.2 },
      });
      return { text: res.text ?? "", model };
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      if (i < models.length - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

// Gemma 4 on the Gemini API sometimes rejects every image with 400 INVALID_ARGUMENT while text still works.
// Photos then go to PHOTO_FALLBACK_MODEL, and the caller is told which model read them so the UI can say so.
async function generate(parts: Array<Record<string, unknown>>, { photo = false } = {}): Promise<Generated> {
  try {
    return await generateWithGemma(parts);
  } catch (err) {
    if (!photo || !config.photoFallbackModel || !isRejectedImage(err)) throw err;
    console.warn(`[ai] Gemma rejected the photo; reading it with ${config.photoFallbackModel} instead`);
    const res = await ai().models.generateContent({
      model: config.photoFallbackModel,
      contents: [{ role: "user", parts }],
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, temperature: 0.2 },
    });
    return { text: res.text ?? "", model: config.photoFallbackModel };
  }
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

export async function readBoard(imageBase64: string, mimeType: string): Promise<{ items: BoardItem[]; model: string }> {
  const imagePart = { inlineData: { mimeType, data: imageBase64 } };
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? BOARD_PROMPT : `${BOARD_PROMPT}\nYour previous answer was invalid (${lastError}). Return valid JSON only.`;
    const { text, model } = await generate([imagePart, { text: prompt }], { photo: true });
    try {
      const parsed = BoardSchema.parse(extractJson(text));
      const items = parsed.items.map((i) =>
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
      return { items, model };
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
  const { text } = await generate([{ text: `${task}\nWrite it in ${lang}. Use only these facts, do not invent numbers:\n${facts}\nReturn only the message text.` }]);
  return text.trim();
}

export { STAPLES };
