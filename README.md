# Pamsika

**One photo of a market price board becomes a mobile-money shop for the trader, and a public price board for everyone.**

*Pamsika* means "at the market" in Nyanja. Built at Hacktoberfest Hack Day Lusaka x Tech Kaizen, 31 October 2026.

## The problem

Most Zambian workers are informal. A trader at Soweto, Chisokone or Kamwala market keeps prices on a chalk board, takes cash or a "send to my number" mobile-money payment with no record, and has no shop a customer can order from. Meanwhile the public has no easy way to see what staples like mealie meal, kapenta, tomatoes and cooking oil cost today, market by market.

## What it does

1. **Snap.** The trader photographs their price board. **Gemma 4** reads it into a catalogue, normalises the item names, and flags likely typos (for example, "K5 for kapenta looks low. Did you mean K50?").
2. **Check.** The trader fixes anything flagged with one tap, then publishes.
3. **Get paid.** Pamsika creates a **DevDraft** product and a mobile-money payment link for each item, plus a stall QR code to print or share on WhatsApp. Customers pay with MTN, Airtel or Zamtel, and a DevDraft webhook updates the trader's live sales screen.
4. **Public good.** Every published board feeds an anonymised **Market Price Watch** (`/prices`) with today's price for each staple across Lusaka markets and the change since yesterday.

## Who it's for

Informal market traders who already use mobile money, and the shoppers who want to know what staples cost before they travel.

## Challenge categories

| Category | How Pamsika qualifies |
|---|---|
| DevDraft API Build Challenge: *Snap. Chat. Get Paid* | Products, Payment Links (mobile money enabled) and Webhooks, plus Balances. Bonuses: local-language messages (English, Nyanja, Bemba), daily sales summary, stall QR. |
| Best Use of Gemma 4 | Gemma 4 image understanding is the core: board photo to structured catalogue, price sanity flags, item normalisation, local-language messages. |
| Best Open-Source AI Project | MIT licensed; built on the open-weight Gemma 4; the model sits behind one provider module (`src/lib/ai.ts`) so it can be swapped for a self-hosted Gemma. |

## DevDraft APIs used

| Endpoint | Used for |
|---|---|
| `GET /api/v0/health` | Checking the keys on startup (`/api/health`) |
| `POST /api/v0/products` | One product per board item, priced in USD at an indicative rate |
| `POST /api/v0/payment-links` | One `PRODUCT` link per item, with `allowMobilePayment: true`, in `usdc` |
| `POST /api/v0/webhooks` | Registering our signed webhook (`npm run webhook:register`) |
| Webhook `payment.completed` / `payment.failed` | Live sales; HMAC-SHA256 (`x-webhook-signature`) verified on the raw body; idempotent by event id |
| `GET /api/v0/balance` | The live USDC balance on the stage view |
| `POST /api/v0/transfers/external-stablecoin-transfer` | Client helper for returning demo payments |

## Models used

- `gemma-4-26b-a4b-it` through the Gemini API (`@google/genai`), with thinking set to minimal. You can switch to `gemma-4-31b-it` with `GEMMA_MODEL`.

## What's mocked, sample or limited (labelled in the UI)

- **Sample prices:** `npm run seed` adds three markets of sample prices, marked `source='sample'` and shown with a "Sample data" label.
- **Simulated payments:** the "Simulate a test payment" button only appears when DevDraft isn't connected (or `ALLOW_SIMULATE=1`). Those rows are labelled "Simulated", and no money moves.
- **Kwacha to USD:** a fixed indicative rate (`ZMW_PER_USD`), because DevDraft products are priced in USD and payment links in USDC.
- **Demo safety:** items above `DEMO_MAX_USD` (default $5) show no pay button, to stay within the hackathon's per-transaction limit.

## Architecture

```
Seller phone ──snap──▶ /api/board/read ──▶ Gemma 4 (image → JSON catalogue + flags)
             ──publish▶ /api/shop/publish ─▶ DevDraft: products + payment links
Buyer phone ──scan QR─▶ /s/:stall ──Pay──▶ DevDraft checkout (mobile money)
DevDraft ──webhook──▶ /api/devdraft/webhook (HMAC verify, idempotent) ─▶ SSE /api/events
                                                   ├─▶ /sales (seller)
                                                   └─▶ /stage (big screen)
Published boards ─▶ prices table ─▶ /prices (public Market Price Watch)
```

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Zustand · SQLite (better-sqlite3) · zod.

## Run it

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY and the DevDraft keys
npm run seed                 # optional sample prices for Price Watch
npm run build && npm start   # http://localhost:3000
```

To receive DevDraft webhooks, expose the app over HTTPS (for example `cloudflared tunnel --url http://localhost:3000`), set `PUBLIC_BASE_URL` to that URL, then:

```bash
npm run webhook:register -- https://<your-tunnel-host>
```

Useful checks:

```bash
npm test               # backend checks: signatures, idempotency, matching, totals
npm run check:devdraft # read-only DevDraft calls
npm run check:gemma    # one Gemma call
```

## Screens

`/start` setup · `/snap` photograph the board · `/review` check prices · `/shop` QR code and share · `/sales` live payments · `/s/:stall` buyer page · `/prices` public Market Price Watch · `/stage` big-screen demo view · `/qr/print` printable stall sign

## Licence

MIT
