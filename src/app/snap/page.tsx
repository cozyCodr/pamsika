"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/components/image";
import { BottomNav, Brand, Button, ErrorNote, Icon, LargeTitle, Notice, cls, kwacha } from "@/components/ui";
import { useStall, type DraftItem } from "@/store/stall";

type ReadItem = Omit<DraftItem, "key" | "resolved">;

function modelLabel(model: string): string {
  return /flash-lite/i.test(model) ? "Gemini Flash-Lite" : /flash/i.test(model) ? "Gemini Flash" : model;
}

export default function Snap() {
  const router = useRouter();
  const stall = useStall((s) => s.stall);
  const hydrated = useStall((s) => s.hydrated);
  const setBoard = useStall((s) => s.setBoard);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [found, setFound] = useState<ReadItem[]>([]);
  const [shown, setShown] = useState(0);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackModel, setFallbackModel] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !stall) router.replace("/start");
  }, [hydrated, stall, router]);

  useEffect(() => {
    if (!found.length || shown >= found.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 260);
    return () => clearTimeout(t);
  }, [found, shown]);

  async function onFile(file: File | undefined) {
    if (!file || !stall) return;
    setError(null);
    setFound([]);
    setShown(0);
    setFallbackModel(null);
    try {
      const img = await compressImage(file);
      setPreview(img.previewUrl);
      setReading(true);
      const res = await fetch("/api/board/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stallId: stall.id, imageBase64: img.base64, mimeType: img.mimeType }),
      });
      const json = await res.json();
      setReading(false);
      if (!res.ok) return setError(json.error ?? "Could not read the board");
      if (!json.items.length) return setError("Gemma couldn't find prices in that photo. Try again closer, with the whole board in view.");
      if (!json.gemma) setFallbackModel(json.model);
      setBoard(json.boardId, img.previewUrl, json.items);
      setFound(json.items);
    } catch (err) {
      setReading(false);
      setError(err instanceof Error ? err.message : "Could not read the photo");
    }
  }

  const done = found.length > 0 && shown >= found.length;
  const scanning = reading || (found.length > 0 && !done);
  const inputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </>
  );

  if (preview) {
    const heading = reading ? "Reading your board…" : error ? "Couldn't read the board" : done ? `Found ${found.length} items` : "Reading your board…";
    const detail = reading ? "Gemma 4 is reading the prices. This takes a few seconds." : found.length ? `${Math.min(shown, found.length)} of ${found.length} items` : "";
    const readBy = fallbackModel ? modelLabel(fallbackModel) : "Gemma 4";
    return (
      <main className={cls.page}>
        <header className="flex min-h-12 items-center justify-between px-2 pt-2">
          <button
            onClick={() => {
              setPreview(null);
              setFound([]);
              setError(null);
            }}
            className={`${cls.btnBase} ${cls.btn.plain}`}
          >
            Cancel
          </button>
          <span className="pr-4 text-footnote text-ink-2">{readBy}</span>
        </header>

        <div className={`${cls.pad} pt-2`}>
          <div className="relative overflow-hidden rounded-group bg-fill">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your price board" className="max-h-[40dvh] w-full object-cover" />
            {scanning && <div className="absolute inset-x-0 h-0.5 animate-scan bg-accent/80" aria-hidden="true" />}
          </div>
        </div>

        <div className={`${cls.pad} flex flex-col gap-0.5 pt-5 pb-3`} aria-live="polite">
          <h1 className={cls.title}>{heading}</h1>
          {detail && <p className="text-subhead text-ink-2">{detail}</p>}
        </div>

        {found.length > 0 && (
          <div className={cls.pad}>
            <ul className={cls.group}>
              {found.slice(0, shown).map((i, n) => (
                <li key={n} className={`${cls.row} ${cls.rowDivider} animate-arrive`}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body">{i.name}</span>
                    {(i.unit || i.flagReason) && (
                      <span className={`text-subhead ${i.flagReason ? "text-warn" : "text-ink-2"}`}>{i.flagReason ? "Check this price" : i.unit}</span>
                    )}
                  </span>
                  {i.flagReason && <Icon name="warn" size={18} className="text-warn" />}
                  <span className={`${cls.money} text-body`}>{kwacha(i.priceZmw)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fallbackModel && found.length > 0 && (
          <div className={`${cls.pad} pt-3`}>
            <Notice>Gemma 4 couldn&apos;t open photos just now, so {modelLabel(fallbackModel)} read this one. Check the prices before you publish.</Notice>
          </div>
        )}

        {error && (
          <div className={`${cls.pad} pt-1`}>
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        <div className={`${cls.pad} mt-auto pt-6 pb-6`}>
          {done ? (
            <Link href="/review" className={`${cls.btnBase} ${cls.btn.primary} ${cls.btnLarge}`}>
              Review prices
            </Link>
          ) : error ? (
            <Button onClick={() => cameraRef.current?.click()} className={cls.btnLarge}>
              Take another photo
            </Button>
          ) : null}
        </div>
        {inputs}
      </main>
    );
  }

  return (
    <main className={cls.page}>
      <header className={`${cls.pad} pt-3`}>
        <Brand />
      </header>
      <LargeTitle eyebrow={stall?.market} title={stall?.name ?? "…"} />

      <div className={`${cls.pad} flex flex-col gap-4 pb-6`}>
        <div className={`${cls.group} flex flex-col items-center gap-4 px-6 pt-8 pb-6 text-center`}>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="camera" size={28} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className={cls.title}>Photograph your price board</h2>
            <p className="text-subhead text-ink-2">Fit the whole board in the frame. Your shop is ready in about 30 seconds.</p>
          </div>
          <div className="flex w-full flex-col gap-2 pt-2">
            <Button onClick={() => cameraRef.current?.click()} className={cls.btnLarge}>
              <Icon name="camera" /> Take photo
            </Button>
            <Button variant="tonal" onClick={() => uploadRef.current?.click()} className={cls.btnLarge}>
              <Icon name="photo" /> Choose from photos
            </Button>
          </div>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      {inputs}
      <BottomNav active="snap" />
    </main>
  );
}
