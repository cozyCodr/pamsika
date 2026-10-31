"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Sale = { id: string; item: string; amountZmw: number | null; amountUsd: number | null; status: string; source: string; at: string };
export type SalesData = { sales: Sale[]; totalZmw: number; totalUsd: number; count: number; topItem: string | null };
export type LivePayment = { paymentId: string; itemName: string | null; amountZmw: number | null; amountUsd: number | null; status: string; source: string; at: string };

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

export function usePayments(stallId: string | null | undefined) {
  const [data, setData] = useState<SalesData | null>(null);
  const [latest, setLatest] = useState<LivePayment | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!stallId) return;
    const res = await fetch(`/api/sales?stallId=${encodeURIComponent(stallId)}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [stallId]);

  useEffect(() => {
    if (!stallId) return;
    refresh();
    const es = new EventSource(`/api/events?stallId=${encodeURIComponent(stallId)}`);
    es.addEventListener("payment", (e) => {
      const evt = JSON.parse((e as MessageEvent).data) as LivePayment;
      if (evt.status === "completed") {
        setLatest(evt);
        chime();
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setLatest(null), 12000);
      }
      refresh();
    });
    const poll = setInterval(refresh, 20000);
    return () => {
      es.close();
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [stallId, refresh]);

  return { data, latest, refresh };
}
