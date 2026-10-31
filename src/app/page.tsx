"use client";

import Link from "next/link";
import { Brand, Icon, LinkButton, Row, Section, cls } from "@/components/ui";
import { useStall } from "@/store/stall";

const STEPS = [
  ["Snap", "Photograph your price board"],
  ["Check", "Fix anything Gemma flags"],
  ["Get paid", "Customers scan your stall QR code"],
];

export default function Home() {
  const stall = useStall((s) => s.stall);
  const hydrated = useStall((s) => s.hydrated);

  return (
    <main className={cls.page}>
      <header className={`${cls.pad} flex items-center justify-between pt-3`}>
        <Brand />
        <Link href="/prices" className={`${cls.btnBase} ${cls.btn.plain}`}>
          Price Watch
        </Link>
      </header>

      <div className={`${cls.pad} flex flex-col gap-3 pt-8 pb-8`}>
        <p className="text-footnote font-semibold text-accent">For Lusaka&apos;s market traders</p>
        <h1 className={`${cls.largeTitle} text-balance`}>Snap your price board. Get paid by mobile money.</h1>
        <p className={`${cls.sub} max-w-[34ch]`}>
          Pamsika reads your board with Gemma 4 and turns it into a shop with a QR code. Customers pay with MTN, Airtel or Zamtel, and your
          prices help everyone see what staples cost today.
        </p>
      </div>

      <div className={`${cls.pad} flex flex-col gap-2 pb-8`}>
        {hydrated && stall ? (
          <>
            <LinkButton href="/snap" className={cls.btnLarge}>
              <Icon name="camera" /> Open {stall.name}
            </LinkButton>
            <LinkButton href="/sales" variant="tonal" className={cls.btnLarge}>
              Today&apos;s sales
            </LinkButton>
          </>
        ) : (
          <LinkButton href="/start" className={cls.btnLarge}>
            Start my shop
          </LinkButton>
        )}
      </div>

      <Section header="How it works">
        {STEPS.map(([t, d], i) => (
          <Row
            key={t}
            leading={<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-footnote font-semibold text-accent">{i + 1}</span>}
            title={t}
            subtitle={d}
          />
        ))}
      </Section>

      <footer className={`${cls.pad} mt-auto pt-10 pb-6 text-center text-footnote text-ink-2`}>Open source (MIT) · Built at Hacktoberfest Hack Day Lusaka</footer>
    </main>
  );
}
