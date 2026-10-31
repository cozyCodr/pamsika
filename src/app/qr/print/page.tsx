"use client";

import { useEffect, useState } from "react";
import { QrCode } from "@/components/QrCode";
import { BrandMark, Button, NavBar } from "@/components/ui";
import { useStall } from "@/store/stall";

export default function PrintQr() {
  const stall = useStall((s) => s.stall);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!stall) return <p className="p-6">Set up your stall first.</p>;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[148mm] flex-col bg-white text-ink">
      <NavBar back="/shop" backLabel="Shop" />
      <div className="flex flex-1 flex-col items-center gap-5 px-8 pt-4 pb-8 text-center">
        <div className="flex items-center gap-2 text-headline font-semibold">
          <BrandMark size={24} /> Pamsika
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-5xl leading-tight font-bold">{stall.name}</h1>
          <p className="text-2xl text-ink-2">{stall.market}</p>
        </div>
        <div className="rounded-2xl border-2 border-ink p-4">{origin && <QrCode value={`${origin}/s/${stall.id}`} size={300} label={`QR code for ${stall.name}`} />}</div>
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-bold">Scan to pay</p>
          <p className="text-xl text-ink-2">MTN · Airtel · Zamtel mobile money</p>
        </div>
        <Button className="no-print mt-2" onClick={() => window.print()}>
          Print this sign
        </Button>
      </div>
    </main>
  );
}
