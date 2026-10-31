import "server-only";
import { db, type ItemRow, type PaymentRow, type StallRow } from "./db";
import { config, usdToZmw } from "./config";
import { STAPLES } from "./staples";

export function getStall(id: string): StallRow | undefined {
  return db().prepare("SELECT * FROM stalls WHERE id = ?").get(id) as StallRow | undefined;
}

export function latestStallWithItems(): StallRow | undefined {
  return db()
    .prepare("SELECT s.* FROM stalls s JOIN items i ON i.stall_id = s.id AND i.active = 1 GROUP BY s.id ORDER BY MAX(i.created_at) DESC LIMIT 1")
    .get() as StallRow | undefined;
}

export type PublicItem = {
  id: string;
  name: string;
  unit: string;
  priceZmw: number;
  priceUsd: number;
  payUrl: string | null;
  live: boolean;
  overDemoLimit: boolean;
};

export function stallItems(stallId: string): PublicItem[] {
  const rows = db().prepare("SELECT * FROM items WHERE stall_id = ? AND active = 1 ORDER BY rowid").all(stallId) as ItemRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    priceZmw: r.price_zmw,
    priceUsd: r.price_usd,
    payUrl: r.pay_url,
    live: Boolean(r.devdraft_link_id && r.pay_url),
    overDemoLimit: r.price_usd > config.demoMaxUsd,
  }));
}

export type SaleView = { id: string; item: string; amountZmw: number | null; amountUsd: number | null; status: string; source: string; at: string };

export function salesForStall(stallId: string) {
  const rows = db()
    .prepare(
      `SELECT p.*, i.name AS item_name, i.unit AS item_unit, i.price_zmw AS item_zmw FROM payments p
       LEFT JOIN items i ON i.id = p.item_id
       WHERE p.stall_id = ? AND p.type LIKE 'payment.%' AND date(p.created_at) = date('now')
       ORDER BY p.created_at DESC LIMIT 50`,
    )
    .all(stallId) as Array<PaymentRow & { item_name: string | null; item_unit: string | null; item_zmw: number | null }>;
  const sales: SaleView[] = rows.map((r) => ({
    id: r.id,
    item: r.item_name ? `${r.item_name}${r.item_unit ? ` ${r.item_unit}` : ""}` : "Payment",
    amountZmw: r.item_zmw ?? (r.amount_usd ? usdToZmw(r.amount_usd) : null),
    amountUsd: r.amount_usd,
    status: r.status,
    source: r.source,
    at: r.created_at.replace(" ", "T") + "Z",
  }));
  const completed = sales.filter((s) => s.status === "completed");
  const counts = new Map<string, number>();
  completed.forEach((s) => counts.set(s.item, (counts.get(s.item) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    sales,
    totalZmw: completed.reduce((n, s) => n + (s.amountZmw ?? 0), 0),
    totalUsd: Math.round(completed.reduce((n, s) => n + (s.amountUsd ?? 0), 0) * 100) / 100,
    count: completed.length,
    topItem: top,
  };
}

export type PriceTile = {
  key: string;
  label: string;
  unit: string;
  midZmw: number;
  minZmw: number;
  maxZmw: number;
  marketCount: number;
  changeZmw: number | null;
  hasSample: boolean;
  markets: Array<{ market: string; priceZmw: number; sample: boolean }>;
};

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function priceWatch(): { tiles: PriceTile[]; boardCount: number; updatedAt: string | null } {
  const latest = db()
    .prepare(
      `SELECT p.canonical_key, p.market, p.price_zmw, p.source, p.observed_at FROM prices p
       JOIN (SELECT canonical_key, market, MAX(observed_at) AS t FROM prices WHERE date(observed_at) = date('now') GROUP BY canonical_key, market) l
         ON l.canonical_key = p.canonical_key AND l.market = p.market AND l.t = p.observed_at`,
    )
    .all() as Array<{ canonical_key: string; market: string; price_zmw: number; source: string; observed_at: string }>;
  const yesterday = db()
    .prepare(
      `SELECT canonical_key, price_zmw FROM prices WHERE date(observed_at) = date('now','-1 day')`,
    )
    .all() as Array<{ canonical_key: string; price_zmw: number }>;
  const tiles: PriceTile[] = [];
  for (const staple of STAPLES) {
    const rows = latest.filter((r) => r.canonical_key === staple.key);
    if (!rows.length) continue;
    const prices = rows.map((r) => r.price_zmw);
    const mid = median(prices);
    const prev = yesterday.filter((r) => r.canonical_key === staple.key).map((r) => r.price_zmw);
    tiles.push({
      key: staple.key,
      label: staple.label,
      unit: staple.unit,
      midZmw: mid,
      minZmw: Math.min(...prices),
      maxZmw: Math.max(...prices),
      marketCount: rows.length,
      changeZmw: prev.length ? Math.round(mid - median(prev)) : null,
      hasSample: rows.some((r) => r.source === "sample"),
      markets: rows
        .map((r) => ({ market: r.market, priceZmw: r.price_zmw, sample: r.source === "sample" }))
        .sort((a, b) => a.priceZmw - b.priceZmw),
    });
  }
  const boardCount = (db().prepare("SELECT COUNT(*) AS n FROM boards WHERE date(created_at) = date('now')").get() as { n: number }).n;
  const updated = latest.map((r) => r.observed_at).sort().pop() ?? null;
  return { tiles, boardCount, updatedAt: updated ? updated.replace(" ", "T") + "Z" : null };
}
