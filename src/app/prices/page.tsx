import { Brand, LargeTitle, cls } from "@/components/ui";
import { priceWatch } from "@/lib/queries";
import { PriceList } from "./PriceList";

export const dynamic = "force-dynamic";

export const metadata = { title: "Market Price Watch · Pamsika" };

export default async function Prices() {
  return (
    <main className={cls.page}>
      <header className={`${cls.pad} pt-3`}>
        <Brand />
      </header>
      <LargeTitle eyebrow="Public · Lusaka" title="Market Price Watch" subtitle="What staples cost today across Lusaka markets. Tap one to compare." />
      <PriceList initial={await priceWatch()} />
    </main>
  );
}
