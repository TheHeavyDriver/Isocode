# Deployment — Sahaj Order

This guide covers the local demo, a Vercel + managed PostgreSQL deployment, release steps, environment variables, and the checks to run before handing the app over.

The application is a standard Next.js 16 server app. It needs a Node.js 22 runtime and a PostgreSQL 15+ database. There is no background worker, queue, object store, or cron job.

---

## 1. Deployment shape

```text
Browser
  │ HTTPS
  ▼
Next.js on Vercel
  ├── server components and route handlers
  ├── static assets and PWA manifest
  ├── PostgreSQL (Neon, Supabase, or another managed provider)
  └── AI provider (optional, server-side only)
```

- **Recommended:** Vercel for the app, Neon or Supabase for PostgreSQL.
- **Alternative:** any Node.js 22 host that can run `pnpm build` and `pnpm start`, plus a managed PostgreSQL instance.
- **Demo-only:** Docker Compose PostgreSQL from `docker-compose.yml`.

---

## 2. Local demo deployment

### Start the database

```bash
docker compose up -d
docker compose ps
```

The Compose file exposes PostgreSQL on `localhost:5435` and stores data in a named volume. It is configured for local development only.

### Configure

```bash
cp .env.example .env.local
```

Fill the three secrets with long random values:

```bash
openssl rand -base64 32
```

Local demo values:

```dotenv
DATABASE_URL=postgres://sahaj:sahaj@localhost:5435/sahaj_order
AUTH_SECRET=<random>
OTP_PEPPER=<random>
EXPORT_SIGNING_SECRET=<random>
DEMO_OTP=123456
SMS_PROVIDER=mock
AI_PROVIDER=mock
APP_URL=http://localhost:3000
```

### Prepare and run

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm build
pnpm start
```

Open <http://localhost:3000>. Check <http://localhost:3000/api/health>; it returns `{"status":"ok","database":"ok"}` when the app and database are reachable.

### Reset the demo

```bash
pnpm db:reset
```

This drops the `public` and Drizzle journal schemas, runs all migrations, and reseeds. It refuses a non-local `DATABASE_URL` unless `ALLOW_DB_RESET=1` is set. Do not use it against production.

---

## 3. Vercel deployment

### 3.1 Create the database

Create a Neon or Supabase project and copy two connection strings if the provider offers them:

- **Pooled** connection for the app runtime.
- **Direct** connection for migrations, if the provider recommends one.

The app reads one variable, `DATABASE_URL`. A pooled URL is fine for normal traffic. For the one-off migration and seed, set `DATABASE_URL` to the direct URL in the shell that runs the commands, or temporarily swap the value.

### 3.2 Create the Vercel project

1. Push the repository to GitHub.
2. Import it in Vercel.
3. Framework preset: Next.js.
4. Install command: `pnpm install --frozen-lockfile`.
5. Build command: `pnpm build`.
6. Node.js version: 22.x.
7. Do not add a database migration to the build command. Run migrations as a separate release step.

### 3.3 Set environment variables

Set these in Vercel for Preview and Production as appropriate:

| Name                    | Required  | Notes                                                             |
| ----------------------- | --------- | ----------------------------------------------------------------- |
| `DATABASE_URL`          | Yes       | Pooled PostgreSQL URL at runtime                                  |
| `AUTH_SECRET`           | Yes       | 32+ random bytes                                                  |
| `OTP_PEPPER`            | Yes       | 32+ random bytes, different from `AUTH_SECRET`                    |
| `EXPORT_SIGNING_SECRET` | Yes       | 32+ random bytes                                                  |
| `APP_URL`               | Yes       | Exact public origin, for example `https://sahaj-order.vercel.app` |
| `DEMO_OTP`              | Demo only | `123456` while reviewing; remove for real users                   |
| `SMS_PROVIDER`          | No        | `mock` in the demo                                                |
| `SMS_API_KEY`           | No        | Reserved                                                          |
| `AI_PROVIDER`           | No        | `mock` by default; `openai` or `anthropic` to use a provider      |
| `AI_MODEL`              | No        | Provider model name                                               |
| `AI_API_KEY`            | No        | Server-side only; never expose with `NEXT_PUBLIC_`                |

`APP_URL` must be HTTPS in production. It controls the `Secure` session cookie and the origin check for mutations.

### 3.4 Migrate and seed production

From a trusted machine with the production `DATABASE_URL`:

```bash
pnpm install --frozen-lockfile
DATABASE_URL='<direct-url>' pnpm db:migrate
DATABASE_URL='<direct-url>' pnpm db:seed
```

The seed is deterministic and idempotent: it upserts master data and sample records, and does not duplicate orders or items when re-run. It contains fictional retailers, orders, and phone numbers only.

For a real launch, replace the demo seed with real master data and remove `DEMO_OTP`. The current slice has no admin CRUD, so catalogue, prices, schemes, and retailers are seeded or changed directly in the database in this release.

### 3.5 Deploy and verify

```bash
# after the Vercel deployment is ready
curl -fsS https://<app-origin>/api/health
```

Expected:

```json
{ "status": "ok", "database": "ok", "time": "..." }
```

Then run the demo checklist in section 6.

---

## 4. AI provider configuration

The default parser needs no external service:

```dotenv
AI_PROVIDER=mock
```

To use a provider:

```dotenv
AI_PROVIDER=openai
AI_MODEL=<model-name>
AI_API_KEY=<server-side-key>
```

or `AI_PROVIDER=anthropic`. The adapter has a timeout and falls back to the deterministic parser on error. The fallback reason is stored on the capture; the raw order text is never written to application logs.

Provider calls are made only from server code. Do not add the key to a `NEXT_PUBLIC_` variable or the client bundle.

---

## 5. Tally export assumptions

The export is a downloadable file, not a live Tally connection. The primary format is a Tally Prime XML import envelope; CSV is the fallback.

Assumptions to validate with the client before handover:

1. **Company:** `Sahaj Distributors` in `SVCURRENTCOMPANY`.
2. **Voucher:** `Sales` voucher type, one voucher per order, `ACTION="Create"`.
3. **Party ledger:** created with the same name as the retailer's shop name.
4. **Sales ledger:** named `Sales`; **GST ledger:** named `Output GST`.
5. **Stock items:** item names equal product names; item codes equal `SKU-*`.
6. **Quantity:** cases. Free goods are zero-value inventory lines, included in the voucher narration.
7. **Amounts:** GST-inclusive dealer prices; taxable value and GST are derived by the pricing engine.
8. **Duplicates:** once an order is exported it cannot be exported again, in either format.

If the real Tally company uses different ledger names, voucher types, units, or GST setup, update `lib/exports/tally.ts` and its fixtures, then re-run `pnpm test`.

The XML has been structurally tested and downloaded successfully from the app, but it has **not** been imported into a live Tally installation. Perform one supervised import with a sample order before relying on it for accounting.

---

## 6. Pre-handover checklist

### Build and tests

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test` (45 tests)
- [ ] `pnpm build`
- [ ] `pnpm start` serves the app in production mode
- [ ] `GET /api/health` returns 200 and `database: ok`

### Demo flow

- [ ] Retailer 1 signs in with `+919000000001` / `123456`.
- [ ] Catalogue, search, filters, stock badges, and scheme badges render.
- [ ] Cart preview applies free goods and slab discounts; totals match the server.
- [ ] Checkout creates one order; a retry with the same idempotency key does not duplicate it.
- [ ] Retailer history and detail show timeline, items, free goods, totals, and AI provenance.
- [ ] Repeat order pre-fills the cart; cancel works only for `pending` and `credit_hold`.
- [ ] AI capture accepts Hindi text, shows alternatives and confidence, and accepts only after review.
- [ ] Accepted AI lines create a normal cart, not an order.
- [ ] Retailer 9 order above available credit lands on `credit_hold`.
- [ ] Desk approves the hold, confirms, and audits the actions.
- [ ] Tally XML and CSV exports download; a duplicate export returns `409 ALREADY_EXPORTED`.
- [ ] Retailer 2 cannot see, cancel, or download Retailer 1's order (404/403/empty list).
- [ ] Language toggle persists after reload.
- [ ] Mobile layout at 360px has no horizontal overflow.

### Security and data

- [ ] `DEMO_OTP` is removed or documented before real users.
- [ ] The three secrets are unique, random, and not in the repository.
- [ ] `APP_URL` is the exact HTTPS origin.
- [ ] No real personal data or order text is in the seed.
- [ ] Session cookie is `Secure` in production.
- [ ] Database backups are enabled.
- [ ] Rate limits are understood as per-instance demo guards.

---

## 7. Operations

### Health check

`GET /api/health` runs a lightweight database query and returns a minimal JSON status. It does not expose credentials or table contents.

### Logs

Application logs contain provider/reason metadata for AI fallbacks, not raw order text, phone numbers, or OTPs. Database audit entries record order actions, actor, timestamp, and safe metadata.

### Migrations

- Migrations are versioned SQL files in `drizzle/`.
- Run `pnpm db:migrate` as a release step, before routing traffic to the new build.
- Never rely on `pnpm db:reset` outside a local demo.
- For a destructive schema change, take a database snapshot first.

### Rollback

1. Roll back the application to the previous Vercel deployment.
2. Only reverse the last migration if it is backward compatible; otherwise restore the pre-release snapshot.
3. Re-run `GET /api/health` and the sign-in smoke test.
4. Export records and audit entries are append-only; do not delete them to "clean up" a failed release.

### Scaling notes

The current limiter is an in-process fixed window. If the app runs on multiple instances or serverless functions, replace it with a shared store (for example Upstash Redis) before relying on the limits for abuse protection. Catalogue queries and order creation are already database-backed and safe across instances; order creation uses row locks and a unique idempotency key.

---

## 8. Known deployment limitations

- No live Tally integration; export is file-based.
- No payment ledger or delivery tracking.
- No admin CRUD; master data is seeded.
- No service worker; the app is installable but not offline-first.
- AI quality depends on the configured provider; the deterministic parser is the guaranteed fallback.
- The Tally XML format is an assumption until validated with the client's installation.
