// Run: npm test  (uses a throwaway local database, never Turso)
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pamsika-test-"));
process.chdir(tmp);
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;
process.env.ZMW_PER_USD = "25";

const { newId, run } = await import("../src/lib/db.ts");
const { verifySignature, recordWebhookEvent, recordSimulatedPayment } = await import("../src/lib/payments.ts");
const { salesForStall, priceWatch, stallItems } = await import("../src/lib/queries.ts");
const { bus } = await import("../src/lib/events.ts");

let pass = 0;
const ok = (name: string) => {
  pass++;
  console.log("ok -", name);
};

const secret = "test-secret";
const body = JSON.stringify({ id: "evt_1", type: "payment.completed" });
const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
assert.equal(verifySignature(body, sig, secret), true);
assert.equal(verifySignature(body, sig.replace(/.$/, "0"), secret), false);
assert.equal(verifySignature(body, null, secret), false);
assert.equal(verifySignature(body + " ", sig, secret), false);
ok("HMAC signature verification accepts valid, rejects tampered/missing");

const stallId = newId("stall");
await run("INSERT INTO stalls (id, name, market, language) VALUES (?, 'Test Stall', 'Soweto Market', 'en')", [stallId]);
const itemId = newId("item");
await run(
  "INSERT INTO items (id, stall_id, name, unit, canonical_key, price_zmw, price_usd, devdraft_product_id, devdraft_link_id, pay_url) VALUES (?, ?, 'Cooking oil', '2 litres', 'cooking_oil_2l', 95, 3.8, 'prod_abc123', 'link_xyz789', 'https://pay.example/x')",
  [itemId, stallId],
);
await run("INSERT INTO prices (canonical_key, market, price_zmw, source) VALUES ('cooking_oil_2l', 'Soweto Market', 95, 'board')");

const seen: unknown[] = [];
bus.on("payment", (e) => seen.push(e));

const evt = { id: "evt_pay_1", type: "payment.completed", created: new Date().toISOString(), data: { object: { id: "pi_1", status: "completed", amount: 3.8, paymentLinkId: "link_xyz789" } } };
assert.equal((await recordWebhookEvent(evt)).stored, true);
assert.equal((await recordWebhookEvent(evt)).stored, false);
ok("webhook event stored once; replay is ignored (idempotent)");

assert.equal(seen.length, 1);
const live = seen[0] as { stallId: string; amountZmw: number; itemName: string };
assert.equal(live.stallId, stallId);
assert.equal(live.amountZmw, 95);
assert.match(live.itemName, /Cooking oil/);
ok("payment matched to the stall item via payment link id and broadcast once");

await recordSimulatedPayment(itemId);
const s = await salesForStall(stallId);
assert.equal(s.count, 2);
assert.equal(s.totalZmw, 190);
assert.equal(s.sales.filter((x) => x.source === "simulated").length, 1);
ok("simulated payment recorded and labelled; sales totals correct");

await recordWebhookEvent({ id: "evt_pay_2", type: "payment.failed", data: { object: { paymentLinkId: "link_xyz789" } } });
assert.equal((await salesForStall(stallId)).count, 2);
ok("failed payments don't count toward takings");

const pw = await priceWatch();
assert.equal(pw.tiles.length, 1);
assert.equal(pw.tiles[0].midZmw, 95);
ok("price watch aggregates today's board prices");

assert.equal((await stallItems(stallId))[0].overDemoLimit, false);
ok("demo $5 cap flag computed");

console.log(`\n${pass} checks passed`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
