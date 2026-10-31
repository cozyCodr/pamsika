"use client";

import { useEffect, useState } from "react";
import { QrCode } from "@/components/QrCode";
import { usePayments } from "@/components/usePayments";
import { BrandMark, Icon, kwacha } from "@/components/ui";
import { change, usePriceData, type PriceData } from "../prices/PriceList";

type Props = { stall: { id: string; name: string; market: string } | null; publicBaseUrl: string; live: boolean; mock: boolean; prices: PriceData };

const panel = "rounded-2xl border border-night-line bg-night-2";
const label = "text-[15px] font-semibold uppercase tracking-wide text-night-ink-2";

export function StageView({ stall, publicBaseUrl, live, mock, prices: initialPrices }: Props) {
  const { data, latest } = usePayments(stall?.id);
  const prices = usePriceData(initialPrices, 8000);
  const [usdc, setUsdc] = useState<string | null>(null);
  const [origin, setOrigin] = useState(publicBaseUrl);

  useEffect(() => {
    if (!publicBaseUrl || publicBaseUrl.includes("localhost")) setOrigin(window.location.origin);
  }, [publicBaseUrl]);

  useEffect(() => {
    if (!live) return;
    const load = () =>
      fetch("/api/balance", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => setUsdc(j.usdc ?? null))
        .catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [live, latest]);

  const last = latest ?? null;

  return (
    <main className="flex min-h-dvh flex-col bg-night px-6 pt-6 text-night-ink lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark size={36} />
          <span className="text-2xl font-semibold">Pamsika</span>
          <span className="hidden text-lg text-night-ink-2 md:inline">One photo. A mobile-money shop. A fairer market.</span>
        </div>
        <span className="flex items-center gap-2 text-base text-night-ink-2">
          <span className={`h-2 w-2 rounded-full ${live && !mock ? "bg-[#3fb768]" : "bg-[#e0a43a]"}`} aria-hidden="true" />
          {mock ? "Simulated DevDraft · no real money" : live ? "Live · DevDraft production" : "Preview · DevDraft not connected"}
        </span>
      </header>

      <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[520px_minmax(0,1fr)]">
        <section className={`${panel} flex flex-col items-center justify-center gap-5 p-8`}>
          <span className={label}>Scan to pay</span>
          <div className="rounded-2xl bg-white p-4">
            {stall ? (
              <QrCode value={`${origin}/s/${stall.id}`} size={300} label={`QR code for ${stall.name}`} />
            ) : (
              <div className="flex h-[300px] w-[300px] items-center justify-center p-6 text-center text-lg text-[#5c5852]">Publish a board to show its QR code here</div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-3xl font-semibold">{stall ? stall.name : "No stall yet"}</span>
            <span className="text-lg text-night-ink-2">{stall ? `${stall.market} · MTN, Airtel, Zamtel` : "MTN, Airtel, Zamtel"}</span>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-6">
          <div role="status" aria-live="assertive" className={`flex items-center gap-6 rounded-2xl px-8 py-7 transition-colors ${last ? "bg-night-success" : panel}`}>
            <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${last ? "bg-white/20 text-white" : "bg-white/5 text-night-ink-2"}`}>
              <Icon name="check" size={34} />
            </span>
            {last ? (
              <span key={last.paymentId} className="flex animate-fade flex-col gap-1">
                <span className="text-5xl font-bold text-white tabular-nums">Paid · {kwacha(last.amountZmw)}</span>
                <span className="text-xl text-white/85">
                  {last.itemName ?? "Payment"} · {last.source === "simulated" ? "Simulated" : "webhook received"} just now
                </span>
              </span>
            ) : (
              <span className="flex flex-col gap-1">
                <span className="text-4xl font-semibold text-night-ink-2">Waiting for a payment</span>
                <span className="text-lg text-night-ink-2">Scan the QR code and pay with mobile money</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className={`${panel} px-6 py-5`}>
              <span className={label}>Stall takings today</span>
              <span className="mt-1 block text-5xl font-bold tabular-nums">{kwacha(data?.totalZmw ?? 0)}</span>
            </div>
            <div className={`${panel} px-6 py-5`}>
              <span className={label}>DevDraft balance (USDC)</span>
              <span className="mt-1 block text-5xl font-bold tabular-nums">{live ? (usdc != null ? `$${Number(usdc).toFixed(2)}` : "…") : "—"}</span>
            </div>
          </div>

          <div className={`${panel} flex flex-1 flex-col px-6 py-4`}>
            <span className={`${label} pb-2`}>Live payments</span>
            {!data?.sales.length && <span className="text-xl text-night-ink-2">None yet</span>}
            {data?.sales.slice(0, 5).map((s) => (
              <div key={s.id} className="flex justify-between border-t border-night-line py-2.5 text-xl first:border-t-0">
                <span>
                  {s.item}{" "}
                  <span className="text-base text-night-ink-2">
                    · {new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {s.source === "simulated" ? " · Simulated" : ""}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{kwacha(s.amountZmw)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="-mx-6 mt-6 flex items-center gap-8 overflow-hidden border-t border-night-line px-6 py-4 text-lg whitespace-nowrap lg:-mx-10 lg:px-10">
        <span className="font-semibold text-[#e8894a]">Price Watch</span>
        {prices.tiles.slice(0, 6).map((t) => (
          <span key={t.key} className="text-night-ink">
            {t.label} {t.unit} <span className="font-semibold tabular-nums">{kwacha(t.midZmw)}</span>{" "}
            <span className="text-night-ink-2">{change(t.changeZmw).text.toLowerCase()}</span>
          </span>
        ))}
        {prices.tiles.some((t) => t.hasSample) && <span className="text-night-ink-2">Includes sample data</span>}
      </footer>
    </main>
  );
}
