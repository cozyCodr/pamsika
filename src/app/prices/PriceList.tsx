"use client";

import { useEffect, useState } from "react";
import { Badge, Icon, cls, kwacha } from "@/components/ui";

export type PriceTile = {
  key: string;
  label: string;
  unit: string;
  midZmw: number;
  minZmw: number;
  maxZmw: number;
  marketCount: number;
  changeZmw: number | null;
  hasSample: boolean;
  markets: Array<{ market: string; priceZmw: number; sample: boolean }>;
};
export type PriceData = { tiles: PriceTile[]; boardCount: number; updatedAt: string | null };

function ago(iso: string | null) {
  if (!iso) return "not yet";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 1 ? "just now" : mins === 1 ? "1 min ago" : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
}

export function usePriceData(initial: PriceData, everyMs = 10000) {
  const [data, setData] = useState(initial);
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    }, everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return data;
}

export function change(c: number | null) {
  if (c == null) return { text: "New today", color: "text-ink-2", icon: null };
  if (c === 0) return { text: "No change", color: "text-ink-2", icon: "minus" as const };
  return c > 0
    ? { text: `Up K${c}`, color: "text-danger", icon: "arrow-up" as const }
    : { text: `Down K${-c}`, color: "text-success", icon: "arrow-down" as const };
}

export function PriceList({ initial }: { initial: PriceData }) {
  const data = usePriceData(initial);
  const [open, setOpen] = useState<string | null>(initial.tiles[0]?.key ?? null);
  const anySample = data.tiles.some((t) => t.hasSample);

  return (
    <>
      <div className={cls.pad}>
        {!data.tiles.length ? (
          <p className={cls.sub}>No prices yet today. They appear as soon as a trader publishes a board.</p>
        ) : (
          <ul className={cls.group}>
            {data.tiles.map((t) => {
              const ch = change(t.changeZmw);
              const isOpen = open === t.key;
              return (
                <li key={t.key} className={cls.rowDivider}>
                  <button
                    onClick={() => setOpen(isOpen ? null : t.key)}
                    aria-expanded={isOpen}
                    className={`${cls.row} min-h-[72px] w-full text-left hover:bg-bg active:bg-fill`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body">
                        {t.label} <span className="text-ink-2">· {t.unit}</span>
                      </span>
                      <span className="text-subhead text-ink-2">
                        {kwacha(t.minZmw)}–{kwacha(t.maxZmw)} at {t.marketCount} {t.marketCount === 1 ? "market" : "markets"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end whitespace-nowrap">
                      <span className={`${cls.money} text-body`}>{kwacha(t.midZmw)}</span>
                      <span className={`inline-flex items-center gap-0.5 text-footnote ${ch.color}`}>
                        {ch.icon && <Icon name={ch.icon} size={13} />}
                        {ch.text}
                      </span>
                    </span>
                    <Icon name="chevron-down" size={18} className={`shrink-0 text-ink-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <ul className="flex flex-col border-t border-line bg-bg/60 py-1 pr-4 pl-4">
                      {t.markets.map((m) => (
                        <li key={m.market} className="flex min-h-10 items-center justify-between text-subhead">
                          <span>
                            {m.market}
                            {m.sample && <span className="ml-1.5 text-footnote text-ink-2">Sample</span>}
                          </span>
                          <span className={cls.money}>{kwacha(m.priceZmw)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <footer className={`${cls.pad} flex flex-col items-center gap-2 pt-3 pb-6 text-center text-footnote text-ink-2`}>
        {anySample && <Badge>Includes sample data</Badge>}
        <span>
          Middle price across markets; change since yesterday. Updated {ago(data.updatedAt)} · from {data.boardCount} stall {data.boardCount === 1 ? "board" : "boards"} today · anonymised
        </span>
      </footer>
    </>
  );
}
