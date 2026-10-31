import "server-only";
import { config, devdraftConfigured } from "./config";

export class DevDraftError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

export class DevDraftNotConfigured extends Error {
  constructor() {
    super("DevDraft keys are not set. Add DEVDRAFT_CLIENT_KEY and DEVDRAFT_CLIENT_SECRET to .env.local.");
  }
}

type Json = Record<string, unknown>;

async function request<T = Json>(method: string, path: string, opts: { json?: unknown; form?: FormData; idempotencyKey?: string } = {}): Promise<T> {
  if (!devdraftConfigured()) throw new DevDraftNotConfigured();
  const headers: Record<string, string> = {
    "x-client-key": config.devdraftClientKey,
    "x-client-secret": config.devdraftClientSecret,
    accept: "application/json",
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form;
  }
  const res = await fetch(`${config.devdraftBaseUrl}/api/v0${path}`, { method, headers, body, cache: "no-store" });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {}
  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && "message" in parsed && String((parsed as Json).message)) ||
      `${res.status} ${res.statusText}`;
    throw new DevDraftError(`DevDraft ${method} ${path} failed: ${msg}`, res.status, parsed);
  }
  return parsed as T;
}

function unwrap(obj: unknown): Json {
  if (obj && typeof obj === "object" && "data" in obj && (obj as Json).data && typeof (obj as Json).data === "object") {
    return (obj as Json).data as Json;
  }
  return (obj ?? {}) as Json;
}

function pickString(obj: Json, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

export type HealthResult = { status: string; authenticated: boolean; version?: string; message?: string };

export async function health(): Promise<HealthResult> {
  return request<HealthResult>("GET", "/health");
}

export async function createProduct(input: { name: string; description: string; priceUsd: number; unit?: string; idempotencyKey: string }) {
  const form = new FormData();
  form.set("name", input.name.slice(0, 200));
  form.set("description", input.description.slice(0, 2000));
  form.set("price", input.priceUsd.toFixed(2));
  form.set("currency", "USD");
  form.set("productType", "PRODUCT");
  form.set("status", "ACTIVE");
  if (input.unit) form.set("unit", input.unit);
  const res = unwrap(await request("POST", "/products", { form, idempotencyKey: input.idempotencyKey }));
  const id = pickString(res, ["id", "productId", "_id"]);
  if (!id) throw new DevDraftError("DevDraft product created but no id was returned", 201, res);
  return { id, raw: res };
}

const g = globalThis as unknown as { __devdraftReady?: { ok: boolean; message: string; at: number } };

export async function devdraftReadiness(): Promise<{ ok: boolean; message: string }> {
  if (!devdraftConfigured()) return { ok: false, message: "DevDraft keys are not set" };
  const cached = g.__devdraftReady;
  if (cached && Date.now() - cached.at < 60_000) return cached;
  let result: { ok: boolean; message: string };
  try {
    const h = await health();
    result = { ok: h.status === "ok", message: h.message ?? h.status };
  } catch (err) {
    result = { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
  g.__devdraftReady = { ...result, at: Date.now() };
  return result;
}

export async function createProductPaymentLink(input: {
  title: string;
  slug: string;
  description?: string;
  productId?: string | null;
  amountUsd: number;
  idempotencyKey: string;
}) {
  const productFields = input.productId
    ? { linkType: "PRODUCT", paymentLinkProducts: [{ productId: input.productId, quantity: 1 }] }
    : { linkType: config.devdraftFallbackLinkType, amount: input.amountUsd };
  const res = unwrap(
    await request("POST", "/payment-links", {
      idempotencyKey: input.idempotencyKey,
      json: {
        title: input.title.slice(0, 100).padEnd(3, " "),
        url: input.slug,
        description: input.description?.slice(0, 500),
        ...productFields,
        allowQuantityAdjustment: false,
        collectTax: false,
        collectAddress: false,
        allowMobilePayment: true,
        limitPayments: false,
        currency: "usdc",
      },
    }),
  );
  const id = pickString(res, ["id", "paymentLinkId", "_id"]);
  const returnedUrl = pickString(res, ["paymentUrl", "checkoutUrl", "link", "shortUrl", "fullUrl", "url"]);
  const payUrl =
    returnedUrl && /^https?:\/\//.test(returnedUrl)
      ? returnedUrl
      : config.devdraftCheckoutBase
        ? `${config.devdraftCheckoutBase.replace(/\/$/, "")}/${returnedUrl ?? input.slug}`
        : null;
  return { id, payUrl, raw: res };
}

export async function createWebhook(input: { name: string; url: string; signingSecret: string }) {
  return request("POST", "/webhooks", {
    json: { name: input.name, url: input.url, isActive: true, encrypted: false, signing_secret: input.signingSecret },
  });
}

export async function listWebhooks() {
  return request("GET", "/webhooks");
}

export type Balances = { usdc: { total_balance: string }; eurc: { total_balance: string }; total_usd_value: string };

export async function balances(): Promise<Balances> {
  return request<Balances>("GET", "/balance");
}

export async function wallets() {
  return request("GET", "/wallets");
}

export async function externalStablecoinTransfer(input: {
  sourceWalletId: string;
  beneficiaryId: string;
  amount: number;
  currency?: string;
  idempotencyKey: string;
}) {
  return request("POST", "/transfers/external-stablecoin-transfer", {
    idempotencyKey: input.idempotencyKey,
    json: {
      sourceWalletId: input.sourceWalletId,
      sourceCurrency: input.currency ?? "usdc",
      destinationCurrency: input.currency ?? "usdc",
      beneficiaryId: input.beneficiaryId,
      amount: input.amount,
    },
  });
}
