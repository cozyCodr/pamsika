"use client";

import { useState } from "react";
import { Button, ErrorNote, Icon, Notice, SegmentedControl, cls } from "@/components/ui";

type Provider = "MTN" | "Airtel" | "Zamtel";
type Paid = { paymentId: string; amount: number };

export function CheckoutForm({ linkId }: { linkId: string }) {
  const [provider, setProvider] = useState<Provider>("MTN");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<Paid | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/mock-devdraft/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      return null;
    }
    return json;
  }

  if (paid) {
    return (
      <div className={`${cls.pad} flex flex-col gap-3 pb-8`}>
        <div className={`${cls.group} flex flex-col items-center gap-2 px-6 py-8 text-center`}>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <Icon name="check" size={30} />
          </span>
          <p className={cls.title}>Payment sent</p>
          <p className={cls.sub}>
            {provider} mobile money · ${paid.amount.toFixed(2)} USDC
          </p>
          <p className="text-footnote text-ink-2">Reference {paid.paymentId}</p>
        </div>
        {refundId ? (
          <Notice tone="success">Refunded (simulated) · reference {refundId}</Notice>
        ) : (
          <Button
            variant="tonal"
            disabled={busy}
            onClick={async () => {
              const json = await call({ action: "refund", paymentId: paid.paymentId });
              if (json) setRefundId(json.refundId);
            }}
          >
            Refund this payment
          </Button>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    );
  }

  return (
    <form
      className={`${cls.pad} flex flex-col gap-5 pb-8`}
      onSubmit={async (e) => {
        e.preventDefault();
        const json = await call({ action: "pay", linkId, provider, phone });
        if (json) setPaid(json);
      }}
    >
      <SegmentedControl
        name="provider"
        legend="Pay with"
        value={provider}
        onChange={setProvider}
        options={[
          { value: "MTN", label: "MTN" },
          { value: "Airtel", label: "Airtel" },
          { value: "Zamtel", label: "Zamtel" },
        ]}
      />
      <label className="flex flex-col gap-2">
        <span className={cls.label}>
          Mobile money number <span className="font-normal text-ink-2">(not stored)</span>
        </span>
        <input className={cls.input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="09…" maxLength={20} />
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" variant="success" disabled={busy} className={cls.btnLarge}>
        {busy ? "Sending…" : "Pay now"}
      </Button>
    </form>
  );
}
