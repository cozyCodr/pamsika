import { notFound } from "next/navigation";
import { LargeTitle, Notice, cls, kwacha } from "@/components/ui";
import { config, usdToZmw } from "@/lib/config";
import { mockGetLink } from "@/lib/mockDevdraft";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function MockCheckout({ params }: { params: Promise<{ linkId: string }> }) {
  if (!config.devdraftMock) notFound();
  const { linkId } = await params;
  const link = await mockGetLink(linkId);
  if (!link) notFound();
  const usd = link.amount ?? link.price ?? 0;

  return (
    <main className={cls.page}>
      <div className={`${cls.pad} pt-4`}>
        <Notice tone="warn">Simulated DevDraft checkout. No real money moves.</Notice>
      </div>
      <LargeTitle eyebrow="Checkout" title={link.title} subtitle={`${kwacha(usdToZmw(usd))} · $${usd.toFixed(2)} USDC`} />
      <CheckoutForm linkId={link.id} />
    </main>
  );
}
