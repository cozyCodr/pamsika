import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { mockBalance, mockCreateLink, mockCreateProduct, mockCreateWebhook, mockHealth, mockListWebhooks, mockRefund } from "@/lib/mockDevdraft";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

function guard(req: Request): NextResponse | null {
  if (!config.devdraftMock) return NextResponse.json({ statusCode: 404, message: "Mock DevDraft is off" }, { status: 404 });
  if (!req.headers.get("x-client-key") || !req.headers.get("x-client-secret")) {
    return NextResponse.json({ statusCode: 401, message: "Client key or secret is invalid or missing" }, { status: 401 });
  }
  return null;
}

const notFound = (method: string, path: string) => NextResponse.json({ statusCode: 404, message: `Cannot ${method} /api/v0/${path}` }, { status: 404 });

export async function GET(req: Request, { params }: Ctx) {
  const denied = guard(req);
  if (denied) return denied;
  const path = (await params).path.join("/");
  if (path === "health") return NextResponse.json(mockHealth());
  if (path === "balance") return NextResponse.json(mockBalance());
  if (path === "webhooks") return NextResponse.json(mockListWebhooks());
  return notFound("GET", path);
}

export async function POST(req: Request, { params }: Ctx) {
  const denied = guard(req);
  if (denied) return denied;
  const segments = (await params).path;
  const path = segments.join("/");

  if (path === "products") {
    const form = await req.formData().catch(() => null);
    const name = String(form?.get("name") ?? "").trim();
    const price = Number(form?.get("price"));
    if (!name || !(price >= 0.01)) return NextResponse.json({ statusCode: 400, message: "name and price (>= 0.01) are required" }, { status: 400 });
    return NextResponse.json(mockCreateProduct({ name, price, currency: String(form?.get("currency") ?? "USD") }), { status: 201 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (path === "payment-links") {
    const res = mockCreateLink(body);
    if ("error" in res) return NextResponse.json({ statusCode: res.status, message: res.error }, { status: res.status });
    return NextResponse.json(res.data, { status: 201 });
  }
  if (path === "webhooks") return NextResponse.json(mockCreateWebhook(body), { status: 201 });
  if (segments[0] === "test-payment" && segments[2] === "refund" && segments[1]) {
    const res = await mockRefund(segments[1]);
    if ("error" in res) return NextResponse.json({ statusCode: res.status, message: res.error }, { status: res.status });
    return NextResponse.json({ id: res.refundId, amount: res.amount, status: "completed", simulated: true }, { status: 201 });
  }
  return notFound("POST", path);
}
