import { notFound } from "next/navigation";
import { BrandMark, cls, kwacha } from "@/components/ui";
import { config } from "@/lib/config";
import { getStall, stallItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function StallPage({ params }: { params: Promise<{ stallId: string }> }) {
  const { stallId } = await params;
  const stall = await getStall(stallId);
  if (!stall) notFound();
  const items = await stallItems(stallId);

  return (
    <main className={cls.page}>
      <header className={`${cls.pad} flex items-center gap-2 pt-4 text-footnote font-semibold text-ink-2`}>
        <BrandMark size={20} /> Pamsika
      </header>
      <div className={`${cls.pad} flex flex-col gap-1 pt-3 pb-4`}>
        <h1 className={cls.largeTitle}>{stall.name}</h1>
        <p className={cls.sub}>{stall.market} · Pay with MTN, Airtel or Zamtel</p>
      </div>

      <div className={`${cls.pad} pb-8`}>
        {items.length === 0 ? (
          <p className={cls.sub}>This stall hasn&apos;t published prices yet.</p>
        ) : (
          <ul className={cls.group}>
            {items.map((i) => (
              <li key={i.id} className={`${cls.row} ${cls.rowDivider} min-h-[68px]`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body">{i.name}</span>
                  <span className="text-subhead text-ink-2">
                    {i.unit ? `${i.unit} · ` : ""}≈ ${i.priceUsd.toFixed(2)}
                  </span>
                </span>
                <span className={`${cls.money} text-body`}>{kwacha(i.priceZmw)}</span>
                {i.live && !i.overDemoLimit ? (
                  <a href={i.payUrl!} className={`${cls.btnBase} ${cls.btn.primary} min-h-10 px-4 text-subhead`}>
                    Pay
                  </a>
                ) : (
                  <span className="max-w-[92px] text-right text-footnote text-ink-2">{i.overDemoLimit ? `Over $${config.demoMaxUsd} demo limit` : "Pay at stall"}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className={cls.sectionFooter}>Prices in Kwacha. USD at an indicative rate of K{config.zmwPerUsd} per $1.</p>
      </div>
    </main>
  );
}
