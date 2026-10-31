import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS stalls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  board_id TEXT REFERENCES boards(id),
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  canonical_key TEXT,
  price_zmw REAL NOT NULL,
  price_usd REAL NOT NULL,
  devdraft_product_id TEXT,
  devdraft_link_id TEXT,
  pay_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  event_id TEXT UNIQUE,
  stall_id TEXT,
  item_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_usd REAL,
  source TEXT NOT NULL DEFAULT 'devdraft',
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_key TEXT NOT NULL,
  market TEXT NOT NULL,
  price_zmw REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('board','sample')),
  observed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_stall ON items(stall_id, active);
CREATE INDEX IF NOT EXISTS idx_payments_stall ON payments(stall_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prices_key ON prices(canonical_key, observed_at);
`;

const g = globalThis as unknown as { __pamsikaDb?: Database.Database };

export function db(): Database.Database {
  if (!g.__pamsikaDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const conn = new Database(path.join(dir, "pamsika.db"));
    conn.pragma("journal_mode = WAL");
    conn.exec(SCHEMA);
    g.__pamsikaDb = conn;
  }
  return g.__pamsikaDb;
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export type StallRow = { id: string; name: string; market: string; language: string; phone: string | null; created_at: string };
export type ItemRow = {
  id: string;
  board_id: string | null;
  stall_id: string;
  name: string;
  unit: string;
  canonical_key: string | null;
  price_zmw: number;
  price_usd: number;
  devdraft_product_id: string | null;
  devdraft_link_id: string | null;
  pay_url: string | null;
  active: number;
};
export type PaymentRow = {
  id: string;
  event_id: string | null;
  stall_id: string | null;
  item_id: string | null;
  type: string;
  status: string;
  amount_usd: number | null;
  source: string;
  created_at: string;
};
