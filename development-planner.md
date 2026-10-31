# Pamsika — Development Planner

> **Pamsika** ("at the market", Nyanja). One photo of a market price board becomes a live
> mobile-money shop for the trader, and a public price board for everyone in the city.
>
> Built at **Hacktoberfest Hack Day Lusaka x Tech Kaizen**, Saturday 31 October 2026.
> **DevDraft submissions close 3:30 PM CAT.** Event ends 5:00 PM CAT.

---

## 1. Product brief

**Problem.** Most Zambian workers are informal. A trader at Soweto, Chisokone or Kamwala keeps
stock and prices on a chalk board and in their head, takes cash or a mobile-money "send to my
number" with no record, and has no shop a customer can order from. Meanwhile the public has no
easy way to see what staples (mealie meal, kapenta, tomatoes, cooking oil) cost today, market by
market.

**Product.** Two sides, one action:

1. **Seller side (mobile-first web app).** Snap the price board, and Gemma 4 reads it into a
   catalogue. Review the flagged prices, then publish. Products and payment links are created on
   DevDraft, and a stall QR code is ready to print or share on WhatsApp. Payments land live via
   webhook. A closing summary arrives in the seller's language.
2. **Public side (Market Price Watch).** Every published board feeds an anonymised public page
   with today's price for each staple at each market, plus the change since yesterday.

**Target categories (one product, three categories):**

| Category | How Pamsika qualifies |
|---|---|
| DevDraft — *Snap. Chat. Get Paid* | Required APIs: Products, Payment Links / Invoices, Webhooks. Bonuses: local language, daily summary, stall QR. |
| Best Use of Gemma 4 | Gemma 4 image input *is* the product: board → catalogue, price sanity flags, item normalisation, local-language messages. |
| Best Open-Source AI Project | MIT repo, open-weight Gemma 4, swappable model provider (stretch: local Gemma via Ollama). |

**DevDraft judging weights:** API 30 · real problem 25 · useful AI 20 · practicality 15 ·
originality/demo 10.

---

## 2. Constraints and settled decisions

- **Real money.** Production DevDraft keys from kickoff. Each transaction ≤ **5 USD**, team total
  ≤ **50 USD**. Collect only from team members and judges. **Refund every test payment before
  3:30 PM** and show one refund in the demo. Never commit keys.
- **Sandbox-only scores zero for API integration.** The demo payment must be a real production
  payment.
- **Label anything mocked.** Seeded price-board data carries a visible "Sample data" badge.
- **Gemma 4 via Gemini API:** `gemma-4-26b-a4b-it` (primary) or `gemma-4-31b-it`. Text and
  image input only; no audio. SDK `@google/genai`. `thinking_level: "minimal"` for speed.
- **Stack:** Next.js (App Router) + TypeScript, Tailwind CSS v4 with design tokens in `@theme`,
  Zustand for shared client state (the draft catalogue moves across the snap, review and publish
  screens), SQLite via `better-sqlite3` for local persistence, `zod` for validation, `qrcode` for
  QR codes.
- **Hosting for the demo:** run locally and expose it with a `cloudflared` tunnel, so DevDraft
  webhooks reach the laptop. (Vercel needs a hosted database; that's P2.)
- **Money display:** sellers think in Kwacha. DevDraft settles in USDC and the exchange-rate API
  only covers USD/EUR. Use a single fixed rate in config (`ZMW_PER_USD`), labelled on screen as
  "indicative rate". Push it to DevDraft in whatever currency the product API accepts (**verify
  at kickoff**).
- **Licence:** MIT.
- **Local-language copy is model-generated and checked by a native speaker on the team before
  the demo.** Don't hard-code Nyanja or Bemba strings written by a non-speaker.

---

## 3. Architecture

```
Phone (seller)        Phone (buyer/judge)          Big screen (stage)
   │ snap board            │ scans stall QR             │ /stage
   ▼                       ▼                            ▼
Next.js app ───────────────────────────────────────────────────────
  /api/board/read   → Gemma 4 (image → JSON catalogue + flags)
  /api/shop/publish → DevDraft: POST products, POST payment-links
  /api/devdraft/webhook ← DevDraft (HMAC-verified, idempotent)
  /api/events (SSE) → seller dashboard + stage live feed
  /api/prices       → Market Price Watch aggregates
  SQLite: stalls, boards, items, products, links, payments, prices
───────────────────────────────────────────────────────────────────
        ▲ cloudflared tunnel (public HTTPS URL for webhooks + QR)
```

**DevDraft API mapping** (base `https://api.devdraft.ai/api/v0`; auth headers per the docs'
"API Request Authentication" page, reported as `x-client-key` / `x-client-secret`, **verify**):

| Step | Endpoint | Notes |
|---|---|---|
| Health check on boot | `GET /health` (authenticated) | Confirms the keys work |
| Create each catalogue item | `POST /products` (+ image upload) | Board photo crop as product image is a stretch |
| One stall checkout | `POST /payment-links` type `PRODUCT` with `paymentLinkProducts`, `allowMobilePayment: true` | This link's URL is encoded in the stall QR |
| Chat order (P1) | `POST /customers`, `POST /invoices` with `payment_methods: ["MOBILE_MONEY"]` | |
| Receive payments | `POST /webhooks` once; handle `payment.completed`, `payment.failed` | Verify `x-webhook-signature` (HMAC-SHA256) |
| Show takings | `GET /balances` (USDC) | Stage view shows the live app balance |
| Refund | Transfer back (`external stablecoin transfer` or `direct wallet transfer`) | No live refund endpoint. **Ask DevDraft at kickoff for the preferred refund method.** |

**Data model (SQLite)**

- `stalls(id, name, market, language, phone, created_at)`
- `boards(id, stall_id, photo_path, raw_json, created_at)`
- `items(id, board_id, stall_id, name, canonical_key, unit, price_zmw, flagged, flag_reason)`
- `products(item_id, devdraft_product_id)`
- `links(stall_id, devdraft_link_id, url)`
- `payments(id, devdraft_event_id UNIQUE, stall_id, amount, currency, status, payload, created_at)`
- `prices(canonical_key, market, price_zmw, unit, source: 'board'|'sample', observed_at)`

---

## 4. User experience

### Principles

1. **One action, then a result.** The seller's whole job is "snap". Everything else is review
   and confirmation.
2. **Built for the market, not the office.** Readable in bright sun: high contrast, 18px+ body,
   48px+ touch targets, works one-handed on a cheap Android phone over a slow connection.
   Compress photos on the device to about 1280px JPEG before upload.
3. **Show the AI working.** While Gemma reads, items appear one at a time over the photo. That
   is the wow moment, and it also makes waiting feel shorter.
4. **AI suggests, the seller decides.** Flagged prices are highlighted with a reason and a
   one-tap fix. Nothing is published without the seller's tap.
5. **Kwacha first.** Prices show as K; USD appears small, labelled as the indicative rate.
6. **The seller's language.** English, Nyanja or Bemba chosen at sign-up; messages and the
   summary follow it.

### Flows

**A. First run (about 30 seconds)**
Welcome, then stall name, market (Soweto, Chisokone, Kamwala, City Market, Mtendere, COMESA,
Other), language, mobile-money number. Lands on Home.

**B. Snap to shop (the core flow, under 60 seconds)**
1. Home: one big **Snap your board** button (camera), with "Upload a photo" as a secondary link.
2. Reading: the photo fills the screen with a scan-line sweep. Item chips fade in over it as
   Gemma returns them ("Mealie meal 25kg · K340").
3. Review: list of item cards (name, unit, price). Flagged cards are amber with a reason, e.g.
   "K5 for kapenta looks low. Did you mean K50?", and **Use K50** / **Keep K5** buttons. Tap any
   field to edit. Sticky footer: **Publish my shop (8 items)**.
4. Publishing: three ticks as each step completes (Products created → Payment link ready → QR
   code ready).
5. Shop live: big stall QR, stall name, **Print QR**, **Share on WhatsApp**, **See my sales**.

**C. Getting paid**
The buyer scans the QR and goes to DevDraft's hosted checkout, where they pay with MTN, Airtel or
Zamtel. The webhook fires. The seller's phone shows a full-width green **"Paid ✅ K340 — Mealie
meal 25kg"** toast with a chime, and the sales list updates.

**D. Chat order (P1)**
Sales screen → **New order from chat** → upload a WhatsApp screenshot. Gemma pulls out the items
and quantities, the seller confirms, and an invoice with a mobile-money link is created. Then
**Copy message** (a drafted reply in the seller's language, with the link).

**E. Closing time (P1)**
**Close the day** gives a one-screen summary: total, top items, number of payments. Plus a
two-line message in the seller's language with **Share on WhatsApp**.

**F. Public: Market Price Watch**
`/prices` needs no login. Staple tiles (mealie meal 25kg, kapenta 1kg, tomatoes box, cooking oil
2L, rape bundle, eggs tray) each show today's middle price and the range across markets, with the
change since yesterday. Tap a tile to see it by market. The footer says "Updated 2 min ago · from
N stall boards". Seeded rows show **Sample data**.

**G. Stage view (for the judges' big screen)**
`/stage` is a split screen: left, the stall QR (large) with the stall name; right, the live
payment feed and the DevDraft USDC balance; bottom, a Price Watch ticker. A payment makes a large
animated **Paid** banner.

### Screen inventory

| Route | Screen | Priority |
|---|---|---|
| `/` | Landing: what Pamsika is, **Start my shop**, link to Price Watch | P0 |
| `/start` | First-run setup | P0 |
| `/snap` | Camera / upload, then reading animation | P0 |
| `/review` | Review and fix the catalogue | P0 |
| `/shop` | Shop live: QR, share, print | P0 |
| `/sales` | Live sales list, total, Paid toasts | P0 |
| `/stage` | Big-screen demo view | P0 |
| `/prices` | Market Price Watch (public) | P0 |
| `/order` | Chat screenshot → invoice | P1 |
| `/close` | Day summary | P1 |
| `/qr/print` | Printable A5 stall sign | P1 |

---

## 5. Design system

**Look and feel:** warm, confident, market-bright. Inspired by chitenge fabric and the Zambian
flag (green, orange, red, black) on an off-white "paper" background. The chalk board is a
recurring motif: dark slate panels with chalk-white handwriting-style numbers for prices.

**Tokens (Tailwind `@theme`)**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-paper` | `#FBF7F0` | `#14120F` | Page background |
| `--color-ink` | `#1C1A17` | `#F3EEE6` | Body text |
| `--color-muted` | `#6B645A` | `#A69E92` | Secondary text |
| `--color-card` | `#FFFFFF` | `#1F1C18` | Cards |
| `--color-line` | `#E7DFD2` | `#332E27` | Borders |
| `--color-green` | `#1E7A12` | `#4CC23A` | Primary actions, Paid |
| `--color-copper` | `#E36F00` | `#FF9A33` | Highlights, QR frame, brand |
| `--color-red` | `#C62828` | `#FF6B6B` | Errors |
| `--color-amber` | `#B26A00` | `#FFB547` | AI flags |
| `--color-slate` | `#22302B` | `#0E1613` | Chalk-board panels |
| `--color-chalk` | `#F4F1E8` | `#F4F1E8` | Text on chalk-board panels |

- **Type:** "Bricolage Grotesque" (headings, 700) + "Inter" (body, 400/600). Prices use tabular
  numbers. Body 18px on mobile.
- **Shape:** 16px radius on cards, 999px on buttons and chips. Soft shadow only on raised
  surfaces.
- **Motion:** scan-line sweep (1.2s loop) while reading; chips fade-and-rise in 180ms with a 60ms
  stagger; Paid banner slides up with a single bounce. Respect `prefers-reduced-motion`.
- **Components** (shared, one source of truth for class strings): `Button` (primary / secondary /
  ghost), `PriceChip`, `ItemCard` (with flagged state), `StepTicks`, `QrPanel`, `PaidToast`,
  `StatTile`, `PriceTile`, `SampleBadge`, `ChalkPanel`.

---

## 6. Demo script (2 minutes)

1. **Problem (15s):** "This is how Mrs Banda sells at Soweto market: a chalk board and a phone
   number." Hold up a real chalk board.
2. **Snap (20s):** snap it on stage. The items appear over the photo as Gemma reads them.
3. **AI catches a mistake (15s):** "K5 for kapenta? Did you mean K50?" One tap fixes it.
4. **Publish (10s):** three ticks. The shop is live; the QR is on the big screen.
5. **A judge pays (30s):** the judge scans and pays K-equivalent of 1–5 USD with mobile money.
   The **Paid ✅** banner fires on the stage view and on the seller's phone.
6. **Public impact (20s):** switch to Price Watch. Her prices just joined the city board.
   "Every trader who joins makes staple prices more transparent for everyone."
7. **Open + honest (10s):** MIT repo, open-weight Gemma 4, show the refund transaction ID.

---

## 7. Risks and open questions (check at kickoff)

- Payment-link minimum for mobile money: the app documents a 5 USD deposit minimum, which equals
  the per-transaction cap. If the link has the same minimum, price the demo item at exactly 5 USD.
- Preferred refund method for real payments (there is no live refund endpoint in the docs).
- Whether production keys have the `webhook:create` scope.
- Currency accepted by `POST /products` and payment links (ZMW or USD only?).
- Exact payment-link request fields; confirm against the live docs before coding P0-04.
- Whether Gemma 4 via the Gemini API supports a JSON response schema. Plan on prompt + `zod`
  validation + one retry.
- Venue Wi-Fi: keep a phone hotspot ready, and record the backup video early (after P0-05).

---

## Current priorities

### P0 — Must ship by 3:00 PM CAT

### P0-01 — Scaffold app, tokens and persistence
- Next.js App Router + TypeScript project named `pamsika`, MIT `LICENSE`, `.env.example` listing
  `DEVDRAFT_CLIENT_KEY`, `DEVDRAFT_CLIENT_SECRET`, `DEVDRAFT_WEBHOOK_SECRET`, `GEMINI_API_KEY`,
  `GEMMA_MODEL`, `ZMW_PER_USD`, `PUBLIC_BASE_URL`; `.env*` (except the example) in `.gitignore`.
- Tailwind v4 with the section 5 tokens in `@theme` (light and dark), fonts loaded, shared UI
  components stubbed in `src/components/ui/`.
- SQLite schema from section 3 created on boot (`src/lib/db.ts`).
- `GET /api/health` returns app status and the result of DevDraft's authenticated health check.
- Accept: `npm run build` passes; `/api/health` returns 200 with DevDraft `ok` using real keys.

### P0-02 — DevDraft client and webhook receiver
- Typed DevDraft client in `src/lib/devdraft.ts` (auth headers, JSON errors surfaced with the
  DevDraft message, idempotency key on writes where supported).
- `POST /api/devdraft/webhook`: verifies the HMAC-SHA256 `x-webhook-signature` against the raw
  body, rejects bad signatures with 401, stores each event once (unique event id), updates
  `payments`, and broadcasts to SSE subscribers.
- `GET /api/events` SSE stream; script `npm run webhook:register` registers the tunnel URL with
  DevDraft for `payment.completed` and `payment.failed`.
- Accept: a replayed event is stored once; a bad signature returns 401; a real test event shows
  in the stream.

### P0-03 — Gemma 4 board reader
- Client-side compression to about 1280px JPEG before upload.
- `POST /api/board/read` sends the image to `GEMMA_MODEL` with a prompt that returns JSON:
  `{ items: [{ name, unit, price_zmw, canonical_key, confidence, flag_reason|null }] }`,
  validated with `zod`; one retry with the validation error on failure.
- Flags: implausible prices for known staples, unreadable entries, duplicates. `canonical_key`
  maps to the Price Watch staples list in `src/lib/staples.ts`.
- Provider wrapper `src/lib/ai.ts` so the model can be swapped (P2-01).
- Accept: three sample board photos in `fixtures/boards/` each return valid JSON; a planted typo
  is flagged.

### P0-04 — Snap, review and publish flow
- Screens `/start`, `/snap`, `/review`, `/shop` per section 4, with the draft catalogue in a
  Zustand store.
- Reading animation (scan line + staggered chips); review cards with flagged state and one-tap
  fixes; sticky publish button.
- Publish creates one DevDraft product per item and one `PRODUCT` payment link with mobile
  payment enabled; shows `StepTicks`; renders the QR for the link URL; writes rows to `prices`.
- Accept: from a fixture photo, publish creates real products and a payment link on DevDraft,
  and the QR opens DevDraft checkout on a phone.

### P0-05 — Live sales and stage view
- `/sales`: today's total (K, with indicative USD), payments list, `PaidToast` with chime driven
  by SSE.
- `/stage`: big QR, live feed, DevDraft USDC balance (`GET` balances), Price Watch ticker, Paid
  banner animation.
- Accept: a real mobile-money payment shows on both screens within 5 seconds of the webhook.
  Record the backup demo video immediately after this passes.

### P0-06 — Market Price Watch
- `/prices` public page: staple tiles with the middle price and range across markets, the change
  since yesterday, a per-market drill-down, "Updated N min ago · from N boards".
- Seed script adds two or three sample markets with `source='sample'`, shown with `SampleBadge`.
- Accept: publishing a new board updates its market's prices on `/prices` without a restart.

### P0-07 — Live payment, refund and submission pack
- Make one real payment of at most 5 USD from a judge or teammate; refund it with the method
  DevDraft confirmed; save both transaction IDs and screenshots in `docs/evidence/`.
- README: user, problem and value statement; DevDraft APIs used; models used (Gemma 4 model ID);
  setup steps; architecture diagram; "mocked or sample" list; MIT licence; team credits.
- Confirm every team test payment is refunded and the team total stayed under 50 USD.
- Accept: submission form filled before 3:30 PM CAT with repo, live demo URL, backup video and
  evidence.

### P1 — If time allows (cut in this order: P1-03, P1-02, P1-01)

### P1-01 — Printable stall sign
- `/qr/print`: A5 sign with the stall name, big QR, "Pay with MTN, Airtel or Zamtel", Pamsika
  mark; print stylesheet.

### P1-02 — Local language messages and day summary
- Gemma writes the Paid confirmation and the closing summary in the stall's language
  (English, Nyanja or Bemba); `/close` shows the total, top items and the payment count, with
  **Share on WhatsApp** (`wa.me` link with prefilled text).
- A native speaker on the team checks the output before the demo.

### P1-03 — Chat screenshot to invoice
- `/order`: upload a WhatsApp order screenshot; Gemma extracts the items and quantities; the
  seller confirms; create a DevDraft customer and an invoice with `MOBILE_MONEY`; copy a drafted
  reply with the link.

### P2 — After the deadline

### P2-01 — Local Gemma via Ollama
- Second provider in `src/lib/ai.ts` running Gemma 4 E4B through Ollama, selected by env var;
  README section on self-hosting for a market co-op.

### P2-02 — Hosted deployment
- Move persistence to a hosted Postgres and deploy to Vercel so the demo doesn't depend on the
  laptop tunnel.

---

## Completed Action Items

- None

---

## Formatting practices

- Each work item is an H3 `### P<priority>-<nn> — <title>` under its bucket in Current
  priorities; bullets are requirements, and the last bullet starts with `Accept:`.
- An empty bucket contains a single `- None` bullet.
- Accepted items move to the top of Completed Action Items under a date-stamped heading
  (`### 2026-10-31 — <session>`), as concise past-tense bullets with file paths in backticks and
  a verification receipt line.
- Never commit secrets; never mark an item complete before its `Accept:` bullet is verified.
