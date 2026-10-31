"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ErrorNote, Icon, LargeTitle, NavBar, cls } from "@/components/ui";
import { useStall } from "@/store/stall";

const STEPS = ["Creating products", "Making mobile money payment links", "Making your stall QR code"];

export default function Review() {
  const router = useRouter();
  const stall = useStall((s) => s.stall);
  const boardId = useStall((s) => s.boardId);
  const draft = useStall((s) => s.draft);
  const updateItem = useStall((s) => s.updateItem);
  const removeItem = useStall((s) => s.removeItem);
  const addItem = useStall((s) => s.addItem);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.length && step < 0) router.replace("/snap");
  }, [draft.length, step, router]);

  const valid = draft.filter((d) => d.name.trim() && d.priceZmw > 0);
  const unresolved = draft.filter((d) => !d.resolved).length;

  async function publish() {
    if (!stall) return;
    setError(null);
    setStep(0);
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400);
    const res = await fetch("/api/shop/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stallId: stall.id,
        boardId: boardId ?? undefined,
        items: valid.map((d) => ({ name: d.name.trim(), unit: d.unit.trim(), priceZmw: d.priceZmw, canonicalKey: d.canonicalKey })),
      }),
    });
    clearInterval(ticker);
    const json = await res.json();
    if (!res.ok) {
      setStep(-1);
      return setError(json.error ?? "Could not publish");
    }
    setStep(STEPS.length);
    sessionStorage.setItem("pamsika.publish", JSON.stringify({ preview: json.preview, errors: json.steps?.errors ?? [] }));
    setTimeout(() => router.push("/shop"), 700);
  }

  if (step >= 0) {
    return (
      <main className={`${cls.page} justify-center gap-6 ${cls.pad}`}>
        <h1 className={cls.title}>Publishing your shop…</h1>
        <ol className={cls.group} aria-live="polite">
          {STEPS.map((s, i) => {
            const isDone = i < step || step === STEPS.length;
            const isActive = i === step && step < STEPS.length;
            return (
              <li key={s} className={`${cls.row} ${cls.rowDivider}`}>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-footnote font-semibold ${
                    isDone ? "bg-success text-white" : isActive ? "border-2 border-accent text-accent" : "border border-line text-ink-3"
                  }`}
                >
                  {isDone ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className={`text-body ${isDone || isActive ? "text-ink" : "text-ink-3"}`}>{s}</span>
                {isDone && <span className="sr-only">done</span>}
              </li>
            );
          })}
        </ol>
      </main>
    );
  }

  return (
    <main className={cls.page}>
      <NavBar back="/snap" backLabel="Retake" />
      <LargeTitle title="Check your prices" subtitle={`Gemma found ${draft.length} items. Tap any field to edit.`} />

      <div className={`${cls.pad} flex flex-col gap-4 pb-4`}>
        {draft.some((d) => !d.resolved) && (
          <ul className="flex flex-col gap-2">
            {draft
              .filter((d) => !d.resolved)
              .map((d) => (
                <li key={d.key} className="flex flex-col gap-3 rounded-group border border-warn-line bg-warn-soft p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={cls.headline}>
                      {d.name} {d.unit && <span className="font-normal text-ink-2">{d.unit}</span>}
                    </span>
                    <span className={`${cls.money} text-body`}>K{d.priceZmw}</span>
                  </div>
                  <p className="flex items-start gap-2 text-subhead text-warn">
                    <Icon name="warn" size={18} className="mt-px shrink-0" />
                    {d.flagReason}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {d.suggestedPriceZmw ? (
                      <Button onClick={() => updateItem(d.key, { priceZmw: d.suggestedPriceZmw!, resolved: true })}>Use K{d.suggestedPriceZmw}</Button>
                    ) : (
                      <Button onClick={() => updateItem(d.key, { resolved: true })}>Edit it</Button>
                    )}
                    <Button variant="tonal" onClick={() => updateItem(d.key, { resolved: true })}>
                      Keep K{d.priceZmw}
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        )}

        <div>
          <h2 className={cls.sectionHeader}>Items</h2>
          <ul className={cls.group}>
            {draft
              .filter((d) => d.resolved)
              .map((d) => (
                <li key={d.key} className={`${cls.rowDivider} flex items-center gap-2 py-1.5 pr-1 pl-3`}>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <input
                      aria-label="Item name"
                      value={d.name}
                      onChange={(e) => updateItem(d.key, { name: e.target.value })}
                      placeholder="Item name"
                      className="min-h-8 w-full rounded-md bg-transparent px-1 text-body outline-none placeholder:text-ink-3 focus:bg-bg"
                    />
                    <input
                      aria-label="Unit"
                      value={d.unit}
                      onChange={(e) => updateItem(d.key, { unit: e.target.value })}
                      placeholder="Unit, e.g. 25kg bag"
                      className="min-h-7 w-full rounded-md bg-transparent px-1 text-subhead text-ink-2 outline-none placeholder:text-ink-3 focus:bg-bg"
                    />
                  </div>
                  <label className="flex min-h-11 items-center rounded-md px-1 focus-within:bg-bg">
                    <span className={`${cls.money} text-body text-ink-2`}>K</span>
                    <input
                      aria-label={`Price of ${d.name || "item"} in Kwacha`}
                      inputMode="decimal"
                      value={d.priceZmw || ""}
                      onChange={(e) => updateItem(d.key, { priceZmw: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })}
                      className={`${cls.money} min-h-11 w-[72px] bg-transparent text-right text-body outline-none`}
                    />
                  </label>
                  <button
                    aria-label={`Remove ${d.name || "item"}`}
                    onClick={() => removeItem(d.key)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger"
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            <li className={cls.rowDivider}>
              <button onClick={addItem} className={`${cls.row} w-full text-left text-accent hover:bg-bg`}>
                <Icon name="plus" size={20} />
                <span className="text-body">Add an item</span>
              </button>
            </li>
          </ul>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      <footer className={`${cls.pad} sticky bottom-0 mt-auto flex flex-col gap-2 border-t border-line bg-bg/95 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur`}>
        <span className="text-center text-footnote text-ink-2">
          {unresolved ? `Check ${unresolved} flagged ${unresolved === 1 ? "price" : "prices"} first` : "Buyers also see USD at an indicative rate"}
        </span>
        <Button onClick={publish} disabled={!stall || !valid.length || unresolved > 0} className={cls.btnLarge}>
          Publish shop · {valid.length} {valid.length === 1 ? "item" : "items"}
        </Button>
      </footer>
    </main>
  );
}
