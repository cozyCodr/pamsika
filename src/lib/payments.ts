import "server-only";
import crypto from "node:crypto";
import { db, newId, type ItemRow } from "./db";
import { usdToZmw } from "./config";
import { publishPayment } from "./events";

export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().replace(/^sha256=/, ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function collectStrings(value: unknown, out: Set<string>, depth = 0) {
  if (depth > 6 || value == null) return;
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out, depth + 1));
  else if (typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out, depth + 1));
}

function findItem(payload: unknown): ItemRow | undefined {
  const strings = new Set<string>();
  collectStrings(payload, strings);
  const ids = [...strings].filter((s) => s.length >= 6 && s.length <= 120);
  if (!ids.length) return undefined;
  const placeholders = ids.map(() => "?").join(",");
  return db()
    .prepare(
      `SELECT * FROM items WHERE devdraft_link_id IN (${placeholders}) OR devdraft_product_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 1`,
    )
    .get(...ids, ...ids) as ItemRow | undefined;
}

function amountFrom(obj: Record<string, unknown> | undefined): number | null {
  if (!obj) return null;
  for (const k of ["amount", "total", "amount_usd", "totalAmount"]) {
    const v = obj[k];
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export type DevDraftEvent = { id?: string; type?: string; created?: string; data?: { object?: Record<string, unknown> } };

export function recordWebhookEvent(evt: DevDraftEvent, source: "devdraft" | "simulated" = "devdraft"): { stored: boolean; paymentId?: string } {
  const type = evt.type ?? "unknown";
  if (!type.startsWith("payment.")) {
    db().prepare(
      "INSERT OR IGNORE INTO payments (id, event_id, type, status, source, payload) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(newId("evt"), evt.id ?? null, type, String(evt.data?.object?.status ?? type), source, JSON.stringify(evt));
    return { stored: true };
  }
  const item = findItem(evt.data ?? evt);
  const amountUsd = amountFrom(evt.data?.object) ?? item?.price_usd ?? null;
  const status = type === "payment.completed" ? "completed" : type === "payment.failed" ? "failed" : String(evt.data?.object?.status ?? type);
  const id = newId("pay");
  const res = db()
    .prepare(
      "INSERT OR IGNORE INTO payments (id, event_id, stall_id, item_id, type, status, amount_usd, source, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, evt.id ?? id, item?.stall_id ?? null, item?.id ?? null, type, status, amountUsd, source, JSON.stringify(evt));
  if (res.changes === 0) return { stored: false };
  publishPayment({
    kind: "payment",
    paymentId: id,
    stallId: item?.stall_id ?? null,
    itemName: item ? `${item.name}${item.unit ? ` ${item.unit}` : ""}` : null,
    amountUsd,
    amountZmw: item?.price_zmw ?? (amountUsd ? usdToZmw(amountUsd) : null),
    status,
    source,
    at: new Date().toISOString(),
  });
  return { stored: true, paymentId: id };
}

export function recordSimulatedPayment(itemId: string): string {
  const item = db().prepare("SELECT * FROM items WHERE id = ?").get(itemId) as ItemRow | undefined;
  if (!item) throw new Error("Item not found");
  const id = newId("sim");
  db().prepare(
    "INSERT INTO payments (id, event_id, stall_id, item_id, type, status, amount_usd, source) VALUES (?, ?, ?, ?, 'payment.completed', 'completed', ?, 'simulated')",
  ).run(id, id, item.stall_id, item.id, item.price_usd);
  publishPayment({
    kind: "payment",
    paymentId: id,
    stallId: item.stall_id,
    itemName: `${item.name}${item.unit ? ` ${item.unit}` : ""}`,
    amountUsd: item.price_usd,
    amountZmw: item.price_zmw,
    status: "completed",
    source: "simulated",
    at: new Date().toISOString(),
  });
  return id;
}
