// Seeds clearly-labelled SAMPLE prices (source='sample') for today and yesterday so Price Watch isn't empty.
// Uses TURSO_DATABASE_URL when set, else the local data/pamsika.db file. Run: npm run seed
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

let url = process.env.TURSO_DATABASE_URL?.trim();
if (!url) {
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
  url = `file:${path.join(process.cwd(), "data", "pamsika.db")}`;
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() });

await db.execute(`CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, canonical_key TEXT NOT NULL, market TEXT NOT NULL,
  price_zmw REAL NOT NULL, source TEXT NOT NULL CHECK (source IN ('board','sample')),
  observed_at TEXT NOT NULL DEFAULT (datetime('now')))`);

const sample: Record<string, Record<string, number>> = {
  "Chisokone Market": { mealie_meal_25kg: 320, kapenta_1kg: 160, tomatoes_box: 220, cooking_oil_2l: 90, eggs_tray: 80, rape_bundle: 8 },
  "Kamwala Market": { mealie_meal_25kg: 350, kapenta_1kg: 210, tomatoes_box: 260, cooking_oil_2l: 99, eggs_tray: 82, onions_5kg: 65 },
  "Mtendere Market": { mealie_meal_25kg: 365, tomatoes_box: 280, cooking_oil_2l: 105, eggs_tray: 92, rape_bundle: 10 },
};

const stamp = (msAgo: number) => new Date(Date.now() - msAgo).toISOString().slice(0, 19).replace("T", " ");
const statements = [{ sql: "DELETE FROM prices WHERE source = 'sample'", args: [] as (string | number)[] }];
for (const [market, items] of Object.entries(sample)) {
  for (const [key, price] of Object.entries(items)) {
    const today = price + (key === "mealie_meal_25kg" ? 10 : key === "tomatoes_box" ? -20 : 0);
    statements.push({ sql: "INSERT INTO prices (canonical_key, market, price_zmw, source, observed_at) VALUES (?, ?, ?, 'sample', ?)", args: [key, market, price, stamp(86_400_000)] });
    statements.push({ sql: "INSERT INTO prices (canonical_key, market, price_zmw, source, observed_at) VALUES (?, ?, ?, 'sample', ?)", args: [key, market, today, stamp(600_000)] });
  }
}
await db.batch(statements, "write");
console.log(`Seeded ${statements.length - 1} sample price rows into ${url.startsWith("file:") ? "the local file" : "Turso"}.`);
