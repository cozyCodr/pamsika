"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QrCode } from "@/components/QrCode";
import { BottomNav, Icon, LargeTitle, Notice, RowLink, Section, cls } from "@/components/ui";
import { useStall } from "@/store/stall";

type PublishInfo = { preview: boolean; errors: string[] };

export default function Shop() {
  const router = useRouter();
  const stall = useStall((s) => s.stall);
  const hydrated = useStall((s) => s.hydrated);
  const [origin, setOrigin] = useState("");
  const [info, setInfo] = useState<PublishInfo | null>(null);

  useEffect(() => {
    if (hydrated && !stall) router.replace("/start");
    setOrigin(window.location.origin);
    try {
      const raw = sessionStorage.getItem("pamsika.publish");
      if (raw) setInfo(JSON.parse(raw));
    } catch {}
  }, [hydrated, stall, router]);

  if (!stall) return null;
  const stallUrl = `${origin}/s/${stall.id}`;
  const shareText = encodeURIComponent(`Buy from ${stall.name} at ${stall.market} and pay with mobile money: ${stallUrl}`);

  return (
    <main className={cls.page}>
      <LargeTitle eyebrow={<span className="inline-flex items-center gap-1 text-success"><Icon name="check" size={14} /> Published</span>} title="Your shop is live" subtitle="Customers scan to pay with MTN, Airtel or Zamtel." />

      <div className={`${cls.pad} flex flex-col gap-2 pb-4`}>
        {info?.preview && <Notice tone="warn">Preview mode: DevDraft isn&apos;t connected yet, so pay buttons are placeholders.</Notice>}
        {info?.errors?.length ? (
          <Notice tone="error">
            {info.errors.length} item{info.errors.length === 1 ? "" : "s"} couldn&apos;t get a payment link: {info.errors[0]}
          </Notice>
        ) : null}
      </div>

      <div className={`${cls.pad} pb-6`}>
        <div className={`${cls.group} flex flex-col items-center gap-3 px-6 pt-6 pb-5`}>
          {origin && <QrCode value={stallUrl} size={208} label={`QR code for ${stall.name}`} />}
          <div className="flex flex-col items-center">
            <span className={cls.headline}>{stall.name}</span>
            <span className="text-subhead text-ink-2">{stall.market}</span>
          </div>
        </div>
      </div>

      <Section className="pb-6">
        <RowLink href="/qr/print" leading={<Icon name="print" className="text-accent" />} title="Print stall sign" />
        <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer" className={`${cls.row} ${cls.rowDivider} hover:bg-bg active:bg-fill`}>
          <Icon name="share" className="text-accent" />
          <span className="flex-1 text-body">Share on WhatsApp</span>
          <Icon name="chevron-right" size={18} className="text-ink-3" />
        </a>
        <RowLink href={`/s/${stall.id}`} leading={<Icon name="qr" className="text-accent" />} title="Preview what customers see" />
        <RowLink href="/sales" leading={<Icon name="chart" className="text-accent" />} title="See my sales" />
      </Section>
      <BottomNav active="sales" />
    </main>
  );
}
