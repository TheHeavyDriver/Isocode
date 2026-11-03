# Sahaj Order

A distributor order-capture app for a packaged food and home-care wholesaler. Retailers browse a personalised catalogue, build a server-priced cart, or paste a messy Hindi/English order message for AI capture and human review. The order desk reviews every order, manages credit holds, confirms it, and exports it to Tally.

The app is a single Next.js modular monolith with PostgreSQL. Prices, stock, credit, schemes, and totals are always recalculated on the server.

---

## What is in the core slice

| Area       | Capability                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth       | Phone OTP, hashed codes, opaque DB sessions, httpOnly cookie, retailer/desk/admin roles                                                                    |
| Catalogue  | 33 seeded SKUs, retailer price resolution, stock status, scheme badges, search and filters, Hindi/English UI                                               |
| Cart       | Quantity stepper, server preview, automatic free goods, slab discounts, nudges, stock and credit warnings                                                  |
| Orders     | Idempotent checkout, atomic stock reservation, credit hold, IST order numbers, history, detail, repeat, cancel                                             |
| AI capture | Normalisation, deterministic Hindi/Hinglish parser, optional provider adapter with fallback, catalogue grounding, confidence, alternatives, alias learning |
| AI safety  | No order without per-line human review and confirmation; accepted lines become a normal cart that is re-priced at checkout                                 |
| Desk       | Queue with status tabs and filters, full order detail, raw-vs-parsed AI comparison, credit hold/approve/reject, confirm, cancel, audit trail               |
| Export     | Tally Prime XML primary, CSV fallback, checksum, export log, download, duplicate-export protection                                                         |
| PWA        | Web manifest and maskable icons; no stale-cache service worker                                                                                             |

Out of scope for this slice: photo/voice capture, offline salesman mode, van loading, the 14-day retailer dashboard, admin CRUD, payments, delivery tracking, and two-way Tally sync.

---

## Demo logins

OTP is fixed by `DEMO_OTP` in `.env.local`:

| Role                                     | Phone           | OTP      |
| ---------------------------------------- | --------------- | -------- |
| Retailer 1 — Rajesh Kirana Store         | `+919000000001` | `123456` |
| Retailer 2 — Shree Ganesh General Store  | `+919000000002` | `123456` |
| Retailer 9 — Annapurna Mart (low credit) | `+919000000009` | `123456` |
| Desk                                     | `+919000000101` | `123456` |
| Desk                                     | `+919000000102` | `123456` |
| Desk                                     | `+919000000103` | `123456` |
| Admin                                    | `+919000000199` | `123456` |

Retailers 3–10 use `+919000000003` through `+919000000010`. All data is fictional.

The seeded order `SO-20261102-0042` is a pending AI order for Retailer 1. It contains `SKU-BS-075` × 10 with one free case, `SKU-DT-1KG` × 5 with a 3% slab discount, and `SKU-BS-150` × 12 with one free case.

---

## Screens

| Route               | Role       | Purpose                                                                  |
| ------------------- | ---------- | ------------------------------------------------------------------------ |
| `/login`            | Public     | Phone + OTP sign-in                                                      |
| `/shop`             | Retailer   | Personalised catalogue, filters, schemes, stock, cart bar                |
| `/cart`             | Retailer   | Server preview, free goods, warnings, notes, checkout                    |
| `/ai`               | Retailer   | Paste an order, review lines, resolve products and units, accept to cart |
| `/orders`           | Retailer   | Order history with status and totals                                     |
| `/orders/[id]`      | Retailer   | Timeline, items, free goods, totals, AI provenance, repeat and cancel    |
| `/account`          | Retailer   | Shop profile, credit, language, sign out                                 |
| `/desk`             | Desk/admin | Queue, counts, status tabs, search, date filters                         |
| `/desk/orders/[id]` | Desk/admin | Raw-vs-parsed AI, credit actions, confirm/cancel, export, audit          |
| `/desk/exports`     | Desk/admin | Export log, checksum, download                                           |

Every data screen has a loading, empty, and error state where it applies.

---

## Run locally

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker with Compose

### 1. Start PostgreSQL

```bash
docker compose up -d
```

The database listens on `localhost:5435` with database `sahaj_order`, user `sahaj`, password `sahaj`. These are local-only development credentials.

### 2. Install and configure

```bash
pnpm install
cp .env.example .env.local
```

For a local demo, set the three secrets to any long random strings and keep:

```dotenv
DEMO_OTP=123456
AI_PROVIDER=mock
APP_URL=http://localhost:3000
```

Generate secrets with `openssl rand -base64 32`.

### 3. Migrate and seed

```bash
pnpm db:migrate
pnpm db:seed
```

The seed is deterministic and safe to re-run. To rebuild the database from scratch:

```bash
pnpm db:reset
```

The reset script refuses a non-local `DATABASE_URL` unless `ALLOW_DB_RESET=1` is set.

### 4. Run

```bash
pnpm dev
```

Open <http://localhost:3000>. The health endpoint is <http://localhost:3000/api/health>.

### Production-mode check

```bash
pnpm build
pnpm start
```

---

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The current suite has 45 unit tests:

- 17 scheme/pricing tests: thresholds, overlap, free-stock cap, slab discounts, paisa rounding, expired schemes, nudges.
- 17 AI parser tests: Hindi, Hinglish and English messages, aliases, unit ambiguity, confidence, multi-word specificity.
- 11 Tally tests: XML escaping, voucher totals, CSV rows, dates, filenames.

Manual smoke flow used for the demo:

1. Sign in as Retailer 1 with the demo OTP.
2. Add `SKU-BS-075` × 10, `SKU-BS-150` × 12 and `SKU-DT-1KG` × 5 to the cart.
3. Confirm the preview applies two free cases and the 3% slab discount; total is ₹26,979.00.
4. Place the order and note the `SO-YYYYMMDD-NNNN` number.
5. Sign in as the desk, confirm the order, export Tally XML, and download the file.
6. Try the same export again: it is blocked with `ALREADY_EXPORTED`.
7. Sign in as Retailer 9 and order `SKU-BS-075` × 10: the order lands on credit hold; the desk can approve and confirm it.
8. Sign in as Retailer 2 and confirm Retailer 1's order is not visible and cannot be cancelled or downloaded.

---

## Scripts

| Script                              | Purpose                                            |
| ----------------------------------- | -------------------------------------------------- |
| `pnpm dev`                          | Next.js development server                         |
| `pnpm build` / `pnpm start`         | Production build and server                        |
| `pnpm lint`                         | ESLint                                             |
| `pnpm typecheck`                    | TypeScript, no emit                                |
| `pnpm test`                         | Vitest unit suite                                  |
| `pnpm check`                        | Lint + typecheck + tests                           |
| `pnpm db:generate`                  | Generate a Drizzle migration after a schema change |
| `pnpm db:migrate`                   | Apply SQL migrations                               |
| `pnpm db:seed`                      | Insert deterministic demo data                     |
| `pnpm db:reset`                     | Drop, migrate and reseed a local database          |
| `pnpm format` / `pnpm format:check` | Prettier                                           |

---

## How the important parts work

### Server authority

The client never supplies a retailer ID, price, discount, free quantity, or total. The server resolves the retailer from the session, re-prices every line with active schemes, locks and decrements stock inside a transaction, checks available credit, and only then writes the order. A repeated checkout with the same idempotency key returns the original order.

### Schemes and money

One best scheme per SKU. The engine supports buy-X-get-Y and slab-percent schemes, caps free goods at available stock, and prefers the higher saving (then lower priority number) when rules overlap. Money is integer paisa. Dealer prices are GST-inclusive by default; the engine derives taxable value and GST from the inclusive total.

### AI capture

The default `AI_PROVIDER=mock` uses a deterministic parser and matcher, so the demo works without a key. When `AI_PROVIDER=openai` or `anthropic` and a key are configured, the provider adapter is attempted first; timeout or provider failure falls back to the deterministic path and records the reason. Both paths ground every candidate in the catalogue. The model never receives retailer identity, phone, credit, or order history.

A capture is stored as `review`. The retailer must choose a product and a unit (`case` or `piece`), adjust quantity, or remove each line. Accepting returns cart lines, not an order. The normal checkout path then re-prices everything. Corrections can be saved as retailer-scoped aliases.

### Tally export

Only confirmed orders can be exported. The export transaction checks for previously exported orders, writes the export record and join rows, marks the orders `exported`, and records an audit entry. Downloads are desk/admin only and re-check the export record.

Assumptions to confirm with the client:

- Tally Prime XML import envelope with `SVCURRENTCOMPANY` set to `Sahaj Distributors`.
- One sales voucher per order, party ledger named after the retailer's shop, sales and output GST ledgers with those exact names.
- Stock item names match the product names; stock item codes match `SKU-*`.
- Quantities are cases; free goods are zero-value inventory lines.
- CSV is a fallback for environments where XML import is not available.

If the client's Tally company, ledger names, voucher type, or GST setup differ, adjust `lib/exports/tally.ts` and the fixtures before the handover.

---

## Environment variables

| Name                    | Required  | Purpose                                          |
| ----------------------- | --------- | ------------------------------------------------ |
| `DATABASE_URL`          | Yes       | PostgreSQL connection string                     |
| `AUTH_SECRET`           | Yes       | Session/token secret, 16+ characters             |
| `OTP_PEPPER`            | Yes       | OTP hashing pepper, 16+ characters               |
| `EXPORT_SIGNING_SECRET` | Yes       | Export checksum secret, 16+ characters           |
| `DEMO_OTP`              | Demo only | Fixed six-digit OTP; unset for real users        |
| `SMS_PROVIDER`          | No        | `mock` (default) or `none`                       |
| `SMS_API_KEY`           | No        | Reserved for a real SMS adapter                  |
| `AI_PROVIDER`           | No        | `mock` (default), `openai`, or `anthropic`       |
| `AI_MODEL`              | No        | Provider model name                              |
| `AI_API_KEY`            | No        | Provider key, server-side only                   |
| `APP_URL`               | Yes       | Public origin used for cookies and origin checks |

Never commit `.env.local` or real credentials. See [`.env.example`](./.env.example).

---

## Security notes

- OTPs expire after five minutes, allow five attempts, and are hashed with the server pepper.
- Sessions are opaque, stored hashed, expire after seven days, and use an httpOnly, SameSite=Lax cookie; `Secure` is set when `APP_URL` is HTTPS.
- Mutations check the request origin and role.
- Zod rejects unknown fields at every API boundary.
- Retailer scope comes from the session, never from a client-supplied ID.
- Rate limits are in-process fixed windows, adequate for a single-instance demo but not a distributed deployment.
- CSP, HSTS in production, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy` are set in `next.config.ts`.
- Logs do not include raw order text, phone numbers, or OTPs.

---

## Documentation

- [`PRD.md`](./PRD.md) — product requirements and user stories
- [`architecture.md`](./architecture.md) — modules, data model, flows, decisions
- [`deployment.md`](./deployment.md) — deployment, migrations, demo checklist
- [`ROADMAP.md`](./ROADMAP.md) — delivery plan and scope
- [`memory.md`](./memory.md) — chronological change log and current state
- [`plans/2026-11-02-sahaj-order-implementation-v1.md`](./plans/2026-11-02-sahaj-order-implementation-v1.md) — implementation checklist

---

## Known limitations

- The AI provider path is implemented behind an adapter but the demo default is the deterministic parser; evaluation against a live provider depends on a key and quota.
- The rate limiter is per process, not shared across serverless instances.
- There is no admin CRUD; master data is seeded.
- Catalogue search runs in the database over the seeded 33 SKUs; it is not designed for a large catalogue yet.
- Tally XML has not been validated against a live Tally installation.
- There is no payment ledger, delivery tracking, or GST e-invoicing.

These are deliberate scope choices for a seven-day core slice, not hidden gaps.
