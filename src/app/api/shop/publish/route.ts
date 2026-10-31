import { NextResponse } from "next/server";
import { z } from "zod";
import { config, devdraftConfigured, zmwToUsd } from "@/lib/config";
import { newId, run, tx } from "@/lib/db";
import { DevDraftError, createProduct, createProductPaymentLink, devdraftReadiness } from "@/lib/devdraft";
import { getStall, stallItems } from "@/lib/queries";
import { STAPLE_KEYS } from "@/lib/staples";

export const maxDuration = 120;

const Body = z.object({
  stallId: z.string().min(1),
  boardId: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        unit: z.string().trim().max(40).default(""),
        priceZmw: z.number().positive().max(1_000_000),
        canonicalKey: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add at least one item with a price." }, { status: 400 });
  const { stallId, boardId, items } = parsed.data;
  const stall = await getStall(stallId);
  if (!stall) return NextResponse.json({ error: "Stall not found" }, { status: 404 });

  const rows = items.map((i) => ({
    id: newId("item"),
    ...i,
    canonicalKey: i.canonicalKey && STAPLE_KEYS.includes(i.canonicalKey) ? i.canonicalKey : null,
    priceUsd: zmwToUsd(i.priceZmw),
  }));
  await tx([
    { sql: "UPDATE items SET active = 0 WHERE stall_id = ?", args: [stallId] },
    ...rows.flatMap((r) => [
      {
        sql: "INSERT INTO items (id, board_id, stall_id, name, unit, canonical_key, price_zmw, price_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [r.id, boardId ?? null, stallId, r.name, r.unit, r.canonicalKey, r.priceZmw, r.priceUsd],
      },
      ...(r.canonicalKey && stall.market !== "Other"
        ? [{ sql: "INSERT INTO prices (canonical_key, market, price_zmw, source) VALUES (?, ?, ?, 'board')", args: [r.canonicalKey, stall.market, r.priceZmw] }]
        : []),
    ]),
  ]);

  const steps = { products: 0, links: 0, productsApiMissing: false, errors: [] as string[] };
  const readiness = await devdraftReadiness();
  if (devdraftConfigured() && !readiness.ok) steps.errors.push(`DevDraft not ready: ${readiness.message}`);
  if (readiness.ok) {
    for (const r of rows) {
      try {
        const label = `${r.name}${r.unit ? ` (${r.unit})` : ""}`;
        let productId: string | null = null;
        if (!steps.productsApiMissing) {
          try {
            const product = await createProduct({
              name: label,
              description: `${label} from ${stall.name}, ${stall.market}. K${r.priceZmw}.`,
              priceUsd: r.priceUsd,
              unit: r.unit || undefined,
              idempotencyKey: `prod-${r.id}`,
            });
            productId = product.id;
            steps.products++;
          } catch (err) {
            if (err instanceof DevDraftError && err.status === 404) steps.productsApiMissing = true;
            else throw err;
          }
        }
        const link = await createProductPaymentLink({
          title: `${label} · ${stall.name}`,
          slug: `pamsika-${r.id.replace("item_", "")}`,
          description: `Pay ${stall.name} at ${stall.market} with mobile money.`,
          productId,
          amountUsd: r.priceUsd,
          idempotencyKey: `link-${r.id}`,
        });
        if (link.id) steps.links++;
        if (!link.payUrl) steps.errors.push(`${r.name}: link created but no checkout URL returned (set DEVDRAFT_CHECKOUT_BASE)`);
        await run("UPDATE items SET devdraft_product_id = ?, devdraft_link_id = ?, pay_url = ? WHERE id = ?", [productId, link.id, link.payUrl, r.id]);
      } catch (err) {
        steps.errors.push(`${r.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return NextResponse.json({
    preview: !readiness.ok,
    stallUrl: `${config.publicBaseUrl}/s/${stallId}`,
    steps,
    items: await stallItems(stallId),
  });
}
