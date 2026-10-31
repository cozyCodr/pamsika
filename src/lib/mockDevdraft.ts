import "server-only";
import crypto from "node:crypto";
import { config } from "./config";
import { all, ensureSchema, newId, one, run } from "./db";

// A local stand-in for DevDraft's documented API, used when DEVDRAFT_MODE=mock. Everything it produces is labelled simulated.

const MOCK_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS mock_products (id TEXT PRIMARY KEY, name TEXT, price REAL, currency TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "CREATE TABLE IF NOT EXISTS mock_links (id TEXT PRIMARY KEY, slug TEXT UNIQUE, title TEXT, link_type TEXT, amount REAL, product_id TEXT, currency TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "CREATE TABLE IF NOT EXISTS mock_webhooks (id TEXT PRIMARY KEY, name TEXT, url TEXT, signing_secret TEXT, is_active INTEGER, created_at TEXT DEFAULT (datetime('now')))",
  "CREATE TABLE IF NOT EXISTS mock_ledger (id TEXT PRIMARY KEY, kind TEXT, link_id TEXT, amount REAL, provider TEXT, phone_last4 TEXT, status TEXT, refund_of TEXT, created_at TEXT DEFAULT (datetime('now')))",
];

let ready: Promise<void> | null = null;
function store(): Promise<void> {
  ready ??= ensureSchema(MOCK_SCHEMA).catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

export type MockLink = { id: string; slug: string; title: string; link_type: string; amount: number | null; product_id: string | null; currency: string; price: number | null };

export function mockHealth() {
  return { status: "ok", timestamp: new Date().toISOString(), version: "mock", database: "connected", message: "Simulated DevDraft", authenticated: true };
}

export async function mockCreateProduct(fields: { name: string; price: number; currency?: string }) {
  await store();
  const id = crypto.randomUUID();
  await run("INSERT INTO mock_products (id, name, price, currency) VALUES (?, ?, ?, ?)", [id, fields.name, fields.price, fields.currency ?? "USD"]);
  return { id, name: fields.name, price: fields.price, currency: fields.currency ?? "USD", status: "ACTIVE" };
}

export async function mockCreateLink(body: Record<string, unknown>) {
  await store();
  const products = (body.paymentLinkProducts as Array<{ productId: string }> | undefined) ?? [];
  const productId = products[0]?.productId ?? null;
  const product = productId ? await one<{ price: number }>("SELECT price FROM mock_products WHERE id = ?", [productId]) : undefined;
  if (productId && !product) return { error: "Product not found", status: 400 } as const;
  const amount = typeof body.amount === "number" ? body.amount : product ? Number(product.price) : null;
  if (!amount) return { error: "amount or paymentLinkProducts required", status: 400 } as const;
  const id = crypto.randomUUID();
  const slug = String(body.url ?? id);
  try {
    await run("INSERT INTO mock_links (id, slug, title, link_type, amount, product_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      id,
      slug,
      String(body.title ?? "Payment"),
      String(body.linkType ?? "PRODUCT"),
      amount,
      productId,
      String(body.currency ?? "usdc"),
    ]);
  } catch {
    return { error: "Payment link url must be unique", status: 400 } as const;
  }
  return { data: { id, url: slug, title: body.title, linkType: body.linkType, amount, paymentUrl: `${config.publicBaseUrl}/mock-checkout/${id}` } } as const;
}

export async function mockGetLink(id: string): Promise<MockLink | undefined> {
  await store();
  const row = await one<MockLink>("SELECT l.*, p.price FROM mock_links l LEFT JOIN mock_products p ON p.id = l.product_id WHERE l.id = ?", [id]);
  return row ? { ...row, amount: row.amount == null ? null : Number(row.amount), price: row.price == null ? null : Number(row.price) } : undefined;
}

export async function mockCreateWebhook(body: Record<string, unknown>) {
  await store();
  const id = crypto.randomUUID();
  await run("INSERT INTO mock_webhooks (id, name, url, signing_secret, is_active) VALUES (?, ?, ?, ?, 1)", [
    id,
    String(body.name ?? "webhook"),
    String(body.url ?? ""),
    String(body.signing_secret ?? config.devdraftWebhookSecret),
  ]);
  return { id, name: body.name, url: body.url, isActive: true, encrypted: false, created_at: new Date().toISOString() };
}

export async function mockListWebhooks() {
  await store();
  return all("SELECT id, name, url, is_active AS isActive, created_at FROM mock_webhooks");
}

export async function mockBalance() {
  await store();
  const row = await one<{ total: number }>(
    "SELECT COALESCE(SUM(CASE WHEN kind='payment' AND status='completed' THEN amount WHEN kind='refund' THEN -amount ELSE 0 END),0) AS total FROM mock_ledger",
  );
  const total = Math.max(0, Math.round(Number(row?.total ?? 0) * 100) / 100).toFixed(2);
  return { usdc: { currency: "usdc", total_balance: total, balances: [] }, eurc: { currency: "eurc", total_balance: "0.00", balances: [] }, total_usd_value: total };
}

async function deliver(event: Record<string, unknown>) {
  const body = JSON.stringify(event);
  const hooks = await all<{ url: string; signing_secret: string }>("SELECT url, signing_secret FROM mock_webhooks WHERE is_active = 1");
  const targets = hooks.length ? hooks : [{ url: `${config.localOrigin}/api/devdraft/webhook`, signing_secret: config.devdraftWebhookSecret }];
  const results = [];
  for (const t of targets) {
    const target = t.url.replace(/^https?:\/\/[^/]+/, config.localOrigin);
    const signature = crypto.createHmac("sha256", t.signing_secret).update(body).digest("hex");
    try {
      const res = await fetch(target, { method: "POST", headers: { "content-type": "application/json", "x-webhook-signature": signature }, body });
      results.push({ url: t.url, status: res.status });
    } catch (err) {
      results.push({ url: t.url, status: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

export async function mockPay(linkId: string, provider: string, phone: string) {
  const link = await mockGetLink(linkId);
  if (!link) return { error: "Payment link not found", status: 404 } as const;
  const id = `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const amount = link.amount ?? link.price ?? 0;
  await run("INSERT INTO mock_ledger (id, kind, link_id, amount, provider, phone_last4, status) VALUES (?, 'payment', ?, ?, ?, ?, 'completed')", [
    id,
    linkId,
    amount,
    provider,
    phone.replace(/\D/g, "").slice(-4),
  ]);
  const deliveries = await deliver({
    id: newId("evt"),
    type: "payment.completed",
    created: new Date().toISOString(),
    data: { object: { id, status: "completed", amount, currency: link.currency, paymentLinkId: linkId, productId: link.product_id, provider, simulated: true } },
  });
  return { paymentId: id, amount, deliveries } as const;
}

export async function mockRefund(paymentId: string) {
  await store();
  const pay = await one<{ amount: number; link_id: string }>("SELECT amount, link_id FROM mock_ledger WHERE id = ? AND kind = 'payment'", [paymentId]);
  if (!pay) return { error: "Payment not found", status: 404 } as const;
  const existing = await one("SELECT id FROM mock_ledger WHERE kind = 'refund' AND refund_of = ?", [paymentId]);
  if (existing) return { error: "Already refunded", status: 409 } as const;
  const id = `rf_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await run("INSERT INTO mock_ledger (id, kind, link_id, amount, status, refund_of) VALUES (?, 'refund', ?, ?, 'completed', ?)", [id, pay.link_id, pay.amount, paymentId]);
  return { refundId: id, amount: Number(pay.amount) } as const;
}
