"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePayments } from "@/components/usePayments";
import { Badge, BottomNav, Button, ErrorNote, Icon, Row, RowLink, Section, cls, kwacha } from "@/components/ui";
import { useStall } from "@/store/stall";

type Item = { id: string; name: string; unit: string; priceZmw: number };

function time(at: string) {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Sales() {
  const router = useRouter();
  const stall = useStall((s) => s.stall);
  const hydrated = useStall((s) => s.hydrated);
  const { data, latest, refresh } = usePayments(stall?.id);
  const [canSimulate, setCanSimulate] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && !stall) router.replace("/start");
    if (!stall) return;
    fetch("/api/health").then((r) => r.json()).then((h) => setCanSimulate(Boolean(h.simulateAllowed))).catch(() => {});
    fetch(`/api/stalls/${stall.id}`).then((r) => r.json()).then((j) => setItems(j.items ?? [])).catch(() => {});
  }, [hydrated, stall, router]);

  async function simulate() {
    const cheapest = [...items].sort((a, b) => a.priceZmw - b.priceZmw)[0];
    if (!cheapest) return;
    await fetch("/api/demo/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId: cheapest.id }) });
    refresh();
  }

  async function closeDay() {
    if (!stall) return;
    setBusy(true);
    setSummaryError(null);
    const res = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stallId: stall.id, kind: "summary" }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setSummaryError(json.error ?? "Could not write the summary");
    setSummary(json.text);
  }

  return (
    <main className={cls.page}>
      <div className={`${cls.pad} pt-3`} aria-live="assertive">
        {latest && (
          <div role="status" className="flex animate-arrive items-center gap-3 rounded-group bg-success px-4 py-3 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Icon name="check" size={20} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className={`${cls.headline} tabular-nums`}>Payment received · {kwacha(latest.amountZmw)}</span>
              <span className="text-subhead text-white/85">
                {latest.itemName ?? "Payment"} · just now{latest.source === "simulated" ? " · Simulated" : ""}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className={`${cls.pad} flex flex-col pt-4 pb-5`}>
        <span className="text-subhead text-ink-2">Today at {stall?.name}</span>
        <span className={`${cls.largeTitle} tabular-nums`}>{kwacha(data?.totalZmw ?? 0)}</span>
        <span className="text-subhead text-ink-2">≈ ${(data?.totalUsd ?? 0).toFixed(2)} USDC</span>
      </div>

      <Section className="pb-6">
        <Row title="Payments" trailing={<span className={`${cls.money} text-body`}>{data?.count ?? 0}</span>} />
        <Row title="Top item" trailing={<span className="text-body text-ink-2">{data?.topItem ?? "—"}</span>} />
      </Section>

      <Section header="Payments today" className="pb-6">
        {!data?.sales.length ? (
          <Row title={<span className="text-ink-2">No payments yet. Share your QR code to start.</span>} />
        ) : (
          data.sales.map((s) => (
            <Row
              key={s.id}
              title={s.item}
              subtitle={
                <span className="inline-flex items-center gap-1.5">
                  {time(s.at)} · {s.status}
                  {s.source === "simulated" && <Badge>Simulated</Badge>}
                </span>
              }
              trailing={<span className={`${cls.money} text-body`}>{kwacha(s.amountZmw)}</span>}
            />
          ))
        )}
      </Section>

      <Section className="pb-4">
        <RowLink href="/shop" leading={<Icon name="qr" className="text-accent" />} title="My QR code" />
      </Section>

      <div className={`${cls.pad} flex flex-col gap-3 pb-6`}>
        <Button variant="tonal" onClick={closeDay} disabled={busy} className={cls.btnLarge}>
          {busy ? "Writing summary…" : "Close the day"}
        </Button>
        {summaryError && <ErrorNote>{summaryError}</ErrorNote>}
        {summary && (
          <div className={`${cls.group} flex flex-col gap-3 p-4`}>
            <p className="text-body whitespace-pre-line">{summary}</p>
            <a href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noreferrer" className={`${cls.btnBase} ${cls.btn.primary}`}>
              <Icon name="share" size={20} /> Share on WhatsApp
            </a>
          </div>
        )}
        {canSimulate && items.length > 0 && (
          <button onClick={simulate} className={`${cls.btnBase} ${cls.btn.plain} self-center text-subhead`}>
            Simulate a test payment (no money moves)
          </button>
        )}
      </div>
      <BottomNav active="sales" />
    </main>
  );
}
