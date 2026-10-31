import { bus, type PaymentEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const stallId = new URL(req.url).searchParams.get("stallId");
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(data));
      const onPayment = (evt: PaymentEvent) => {
        if (stallId && evt.stallId && evt.stallId !== stallId) return;
        send(`event: payment\ndata: ${JSON.stringify(evt)}\n\n`);
      };
      bus.on("payment", onPayment);
      const ping = setInterval(() => send(`: ping\n\n`), 15000);
      send(`: connected\n\n`);
      cleanup = () => {
        clearInterval(ping);
        bus.off("payment", onPayment);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
