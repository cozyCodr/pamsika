import { GoogleGenAI, ThinkingLevel } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const t0 = Date.now();
const res = await ai.models.generateContent({
  model: process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it",
  contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
  config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
});
console.log("model:", process.env.GEMMA_MODEL, "reply:", JSON.stringify(res.text), "ms:", Date.now() - t0);
