"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, LargeTitle, NavBar, SegmentedControl, cls } from "@/components/ui";
import { useStall } from "@/store/stall";
import { MARKETS } from "@/lib/staples";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ny", label: "Nyanja" },
  { value: "bem", label: "Bemba" },
];

export default function Start() {
  const router = useRouter();
  const setStall = useStall((s) => s.setStall);
  const [name, setName] = useState("");
  const [market, setMarket] = useState(MARKETS[0]);
  const [language, setLanguage] = useState("en");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/stalls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, market, language, phone }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Something went wrong");
    setStall(json);
    router.push("/snap");
  }

  return (
    <main className={cls.page}>
      <NavBar back="/" backLabel="Home" />
      <LargeTitle title="Set up your stall" subtitle="Takes about 30 seconds." />
      <form onSubmit={submit} className={`${cls.pad} flex flex-1 flex-col gap-5 pb-6`}>
        <label className="flex flex-col gap-2">
          <span className={cls.label}>Stall name</span>
          <input id="stall-name" className={cls.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Banda's Stall" required minLength={2} maxLength={60} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={cls.label}>Market</span>
          <select id="stall-market" className={cls.input} value={market} onChange={(e) => setMarket(e.target.value)}>
            {MARKETS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <SegmentedControl name="language" legend="Language for messages" value={language} options={LANGUAGES} onChange={setLanguage} />
        <label className="flex flex-col gap-2">
          <span className={cls.label}>
            Mobile money number <span className="font-normal text-ink-2">(optional)</span>
          </span>
          <input id="stall-phone" className={cls.input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="09…" maxLength={20} />
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" disabled={busy} className={`${cls.btnLarge} mt-auto`}>
          {busy ? "Saving…" : "Continue"}
        </Button>
      </form>
    </main>
  );
}
