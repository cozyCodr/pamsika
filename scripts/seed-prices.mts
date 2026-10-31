// Seeds clearly-labelled SAMPLE prices (source='sample') for today and yesterday so Price Watch isn't empty.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });
const db = new Database(path.join(dir, "pamsika.db"));
db.exec(`CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, canonical_key TEXT NOT NULL, market TEXT NOT NULL,
  price_zmw REAL NOT NULL, source TEXT NOT NULL CHECK (source IN ('board','sample')),
  observed_at TEXT NOT NULL DEFAULT (datetime('now')))`);

const sample: Record<string, Record<string, number>> = {
  "Chisokone Market": { mealie_meal_25kg: 320, kapenta_1kg: 160, tomatoes_box: 220, cooking_oil_2l: 90, eggs_tray: 80, rape_bundle: 8 },
  "Kamwala Market": { mealie_meal_25kg: 350, kapenta_1kg: 210, tomatoes_box: 260, cooking_oil_2l: 99, eggs_tray: 82, onions_5kg: 65 },
  "Mtendere Market": { mealie_meal_25kg: 365, tomatoes_box: 280, cooking_oil_2l: 105, eggs_tray: 92, rape_bundle: 10 },
};

db.prepare("DELETE FROM prices WHERE source = 'sample'").run();
const ins = db.prepare("INSERT INTO prices (canonical_key, market, price_zmw, source, observed_at) VALUES (?, ?, ?, 'sample', ?)");
let n = 0;
for (const [market, items] of Object.entries(sample)) {
  for (const [key, price] of Object.entries(items)) {
    ins.run(key, market, price, new Date(Date.now() - 86_400_000).toISOString().slice(0, 19).replace("T", " "));
    ins.run(key, market, price + (key === "mealie_meal_25kg" ? 10 : key === "tomatoes_box" ? -20 : 0), new Date(Date.now() - 600_000).toISOString().slice(0, 19).replace("T", " "));
    n += 2;
  }
}
console.log(`Seeded ${n} sample price rows.`);
