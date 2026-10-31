// Prints a short pass/fail status for Gemma and DevDraft. Never prints keys.
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ok = (s: string) => `\x1b[32mOK\x1b[0m   ${s}`;
const bad = (s: string) => `\x1b[31mFAIL\x1b[0m ${s}`;

async function gemma() {
  if (!process.env.GEMINI_API_KEY) return bad("Gemma: GEMINI_API_KEY not set");
  const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const t0 = Date.now();
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
    });
    return ok(`Gemma (${model}) replied "${(res.text ?? "").trim()}" in ${Date.now() - t0}ms`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const m = msg.match(/"message":"([^"]+)/);
    return bad(`Gemma (${model}): ${(m?.[1] ?? msg).slice(0, 120)}`);
  }
}

async function devdraft() {
  if (!process.env.DEVDRAFT_CLIENT_KEY || !process.env.DEVDRAFT_CLIENT_SECRET) return [bad("DevDraft: keys not set")];
  const base = (process.env.DEVDRAFT_BASE_URL || "https://api.devdraft.ai") + "/api/v0";
  const headers = { "x-client-key": process.env.DEVDRAFT_CLIENT_KEY, "x-client-secret": process.env.DEVDRAFT_CLIENT_SECRET, accept: "application/json" };
  const lines: string[] = [];
  for (const path of ["/health", "/balance", "/payment-links", "/webhooks", "/products"]) {
    try {
      const res = await fetch(base + path, { headers });
      const body = await res.text();
      let msg = "";
      try {
        msg = JSON.parse(body).message ?? "";
      } catch {}
      lines.push(res.ok ? ok(`DevDraft GET ${path} (${res.status})`) : bad(`DevDraft GET ${path} (${res.status}) ${String(msg).slice(0, 80)}`));
    } catch (err) {
      lines.push(bad(`DevDraft GET ${path}: ${err instanceof Error ? err.message : err}`));
    }
  }
  return lines;
}

const [g, d] = await Promise.all([gemma(), devdraft()]);
console.log([g, ...d].join("\n"));
console.log(`\nWebhook secret: ${process.env.DEVDRAFT_WEBHOOK_SECRET ? "set" : "MISSING"} · Public URL: ${process.env.PUBLIC_BASE_URL || "not set"}`);
