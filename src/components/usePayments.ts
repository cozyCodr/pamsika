"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Sale = { id: string; item: string; amountZmw: number | null; amountUsd: number | null; status: string; source: string; at: string };
export type SalesData = { sales: Sale[]; totalZmw: number; totalUsd: number; count: number; topItem: string | null };
export type LivePayment = { paymentId: string; itemName: string | null; amountZmw: number | null; amountUsd: number | null; status: string; source: string; at: string };

const POLL_MS = 3000;

function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  } catch {}
}

// Live updates arrive by server push (SSE) on a single long-running server, and by polling everywhere (serverless hosts).
export function usePayments(stallId: string | null | undefined) {
  const [data, setData] = useState<SalesData | null>(null);
  const [latest, setLatest] = useState<LivePayment | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((p: LivePayment) => {
    setLatest(p);
    chime();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLatest(null), 12000);
  }, []);

  const refresh = useCallback(async () => {
    if (!stallId) return;
    const res = await fetch(`/api/sales?stallId=${encodeURIComponent(stallId)}`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const next = (await res.json()) as SalesData;
    setData(next);
    const completed = next.sales.filter((s) => s.status === "completed");
    if (seen.current === null) {
      seen.current = new Set(completed.map((s) => s.id));
      return;
    }
    const fresh = completed.filter((s) => !seen.current!.has(s.id));
    fresh.forEach((s) => seen.current!.add(s.id));
    if (fresh.length) {
      const s = fresh[0];
      announce({ paymentId: s.id, itemName: s.item, amountZmw: s.amountZmw, amountUsd: s.amountUsd, status: s.status, source: s.source, at: s.at });
    }
  }, [stallId, announce]);

  useEffect(() => {
    if (!stallId) return;
    seen.current = null;
    refresh();
    let es: EventSource | null = new EventSource(`/api/events?stallId=${encodeURIComponent(stallId)}`);
    let failures = 0;
    es.addEventListener("payment", (e) => {
      const evt = JSON.parse((e as MessageEvent).data) as LivePayment;
      if (evt.status === "completed" && !seen.current?.has(evt.paymentId)) {
        seen.current?.add(evt.paymentId);
        announce(evt);
      }
      refresh();
    });
    es.onerror = () => {
      failures += 1;
      if (failures >= 2) {
        es?.close();
        es = null;
      }
    };
    const poll = setInterval(refresh, POLL_MS);
    return () => {
      es?.close();
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [stallId, refresh, announce]);

  return { data, latest, refresh };
}
