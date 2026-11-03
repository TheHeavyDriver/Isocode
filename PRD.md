# PRD — Sahaj Order

**Working name:** Sahaj Order (सहज ऑर्डर)  
**Status:** Draft for build  
**Date:** 2 November 2026  
**Source briefs:** `a.md`, `brief.md`  
**Build window:** 7 days, solo  
**Core roles:** Retailer, Order desk

---

## 1. Problem Statement

Company A is a packaged food and home care distributor in Jabalpur. It serves 1,800 kirana shops with 70 staff, including 18 salesmen, and earns ₹85–100 crore a year.

Today, orders arrive in whatever form the retailer finds easiest: a notebook entry with the salesman, a WhatsApp text, a photo of a handwritten list, or a Hindi voice note. Six office staff retype roughly 600 orders a day into Tally the next morning. Salesmen cannot see live stock, the retailer's price, or the current scheme at the counter, so lines are cut or corrected after the order is taken.

The cost is concrete:

- 5% of orders have a wrong item or quantity, causing returns or redelivery: about ₹31.5 lakh a year.
- Six order-entry staff cost about ₹15.6 lakh a year.
- Stock-outs discovered after ordering lose about 1% of sales at 6% margin: about ₹5.4 lakh a year.
- Total leakage: about ₹52.5 lakh a year.

The deeper problem is not that retailers lack an app. It is that every order arrives in a different format, so the desk has to reinterpret it. The product must make the retailer's order structured at the source, and make AI capture safe enough that the desk only has to check it.

**Core slice for this release:** retailer catalogue with prices and schemes, cart and order, AI capture from a text order, and an order desk with Tally export. Roles: retailer and order desk. Hard part: the scheme engine. All other must-haves are optional depth.

---

## 2. Solution

Sahaj Order is an installable, mobile-first B2B ordering app with two role-specific experiences and one shared order record.

**Retailer experience**

- Phone + OTP sign-in, with no password.
- A Hindi/English toggle on the retailer-facing screens, with Hindi product aliases and Hindi example messages.
- Personalised catalogue: the retailer's own price, GST treatment, live stock status, and active schemes.
- Search and browse by category, brand, SKU name, or Hindi alias.
- Cart with case-level quantities, automatic free goods, slab discounts, scheme nudges, and a credit-limit check.
- Order confirmation, order history, and one-tap repeat order.
- AI order capture: paste a WhatsApp message in Hindi, English, or Hinglish, review the suggested lines, fix anything uncertain, and add the confirmed lines to the cart.

**Order desk experience**

- Queue of incoming orders with status counts and filters.
- Order detail with the original message beside the parsed lines, retailer terms, scheme calculations, and credit position.
- Credit hold, approve/reject, confirm, and cancel actions with a reason and audit trail.
- Tally export for confirmed orders, with an export log and duplicate protection.

**Shared foundations**

- A deterministic scheme engine that explains every discount and free item.
- A human-in-the-loop AI pipeline that never places an order by itself.
- Role-scoped data access so a retailer sees only their own prices, credit, and orders.
- Realistic seed data based on the brief's sample SKUs, schemes, and raw order message.
- A calm, minimal UI designed for a low-end phone on slow 3G.

**What this release deliberately does not include:** photo or voice AI capture, offline salesman mode, van loading lists, the 14-day inactive-retailer dashboard, real SMS/WhatsApp delivery, payments, delivery tracking, GST e-invoicing, and two-way Tally sync. These are stretch items for later.

**Success for this submission**

- A retailer can place a normal order in under 60 seconds.
- The sample Hindi message is captured into correct lines, with uncertain lines visibly flagged.
- No AI-captured order reaches the desk without human confirmation.
- The scheme engine passes a matrix of buy-X-get-Y, slab, cap, and rounding tests.
- The desk can confirm and export an order to Tally without retyping.
- A retailer cannot see another retailer's prices, credit, or orders.
- First catalogue load is under 3 seconds on a throttled 3G profile.

---

## 3. Users and Jobs

| User                               | Context                                             | Job to be done                                                                                     |
| ---------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Retailer (shop owner)              | Low-end phone, slow 3G, ordering between customers  | See my price, stock, and scheme; build a correct order in under a minute; know it reached the desk |
| Order desk user                    | Desktop or laptop in the office, processing a queue | Check what the retailer meant, resolve AI uncertainty, manage credit, confirm, and export to Tally |
| Salesman (stretch)                 | In the shop, sometimes without signal               | Take an order during a visit without losing it when the network drops                              |
| Owner-director (stretch)           | Reviewing business performance                      | See which retailers have stopped ordering and where the desk is stuck                              |
| Admin (internal, seed-only in MVP) | Maintains master data                               | Keep products, prices, stock, schemes, and retailers current                                       |

The MVP is built for the retailer and the order desk. Salesman mode, the owner dashboard, and admin CRUD are stretch items only.

---

## 4. User Stories

### Access, roles, and device

1. As a retailer, I want to sign in with my phone number and a one-time code, so that I do not have to remember a password.
2. As a retailer, I want the app to keep me signed in for a short period, so that I do not enter an OTP every time I open it.
3. As a retailer, I want to see only my shop's prices, credit, and orders, so that my commercial terms stay private.
4. As an order desk user, I want to sign in with my phone and OTP, so that I can process orders from an office device.
5. As an order desk user, I want to see all retailers' orders, so that I can clear the queue.
6. As a retailer, I want to be blocked from desk actions, so that I cannot confirm or export my own order.
7. As a user, I want my session to expire and to be able to log out, so that a shared phone does not leak my account.
8. As a retailer, I want to install the app on my home screen, so that it opens quickly and feels like an app.
9. As a retailer on a slow 3G phone, I want the first catalogue screen in under three seconds, so that I can order between customers.
10. As a retailer, I want large tap targets and readable text, so that I can use the app one-handed.
11. As a retailer, I want to type product names in Hindi or Hinglish, so that I can find what I mean.
12. As a retailer, I want a Hindi/English toggle on the retailer screens, so that I can use the app in the language I read most comfortably.

### Catalogue, price, and stock

13. As a retailer, I want to browse products by category and brand, so that I can find a product quickly.
14. As a retailer, I want to search by SKU name or a Hindi alias, so that I do not need to know the exact English name.
15. As a retailer, I want to see the pack size and case count, so that I order the right unit.
16. As a retailer, I want to see my dealer price and whether GST is included, so that there is no surprise at billing.
17. As a retailer, I want to see stock status as in stock, low, or out of stock, so that I do not order what cannot ship.
18. As a retailer, I want to see the current scheme on a product card, so that I can take advantage of it.
19. As a retailer, I want to see a clear product image, so that I recognise the pack.
20. As a retailer, I want an out-of-stock product to be clearly marked and not silently added, so that the order is not cut later.
21. As a retailer, I want to see the GST and price breakup on an order, so that I can reconcile it with my books.
22. As a retailer, I want to see my credit limit and outstanding amount, so that I know how much I can order.
23. As a retailer, I want to see my past orders, so that I can repeat a regular order.
24. As a retailer, I want to repeat a past order in one tap, so that a weekly order takes seconds.
25. As a retailer, I want to see the status of each order, so that I know whether it is pending, confirmed, or on credit hold.
26. As a retailer, I want to see the order number and total after placing an order, so that I have a reference.

### Schemes

27. As a retailer, I want a buy-10-get-1 scheme to add the free case automatically, so that I get the scheme without calculating.
28. As a retailer, I want a slab discount to apply only when I reach the threshold, so that the discount is correct.
29. As a retailer, I want to see why a scheme applied or did not apply, so that I trust the total.
30. As a retailer, I want free goods shown as separate zero-value lines, so that the delivery is clear.
31. As a retailer, I want a nudge such as "add 3 more cases for 3% off", so that I can decide whether to increase the order.
32. As a retailer, I want only the best scheme per SKU to apply, so that stacking rules do not create a confusing total.
33. As a retailer, I want expired schemes not to apply, so that I am not promised an old offer.
34. As a retailer, I want a free-goods promise to be capped by actual free stock, so that the order can be fulfilled.
35. As an order desk user, I want every scheme calculation to be deterministic and explained, so that I can defend it to a retailer.

### Cart and ordering

36. As a retailer, I want to add products in cases with a quantity stepper, so that ordering is fast.
37. As a retailer, I want to change or remove a line before checkout, so that I can correct myself.
38. As a retailer, I want my cart to survive an accidental app close, so that I do not lose the order.
39. As a retailer, I want a clear cart total with subtotal, discount, free goods, and GST, so that I know what I am paying.
40. As a retailer, I want to see a warning before I exceed my credit limit, so that I can adjust the order.
41. As a retailer, I want to add a note to the order, so that I can explain a special request.
42. As a retailer, I want to place the order and receive an order number, so that I know it reached the desk.
43. As a retailer, I want the server to re-check price, stock, and schemes at checkout, so that I am not charged a stale price.
44. As a retailer, I want a clear error if checkout fails, so that I can retry without duplicating the order.
45. As a retailer, I want an empty-cart state that tells me what to do, so that I am not stuck.
46. As a retailer, I want loading states while the catalogue and orders load, so that I know the app is working.

### AI capture

47. As a retailer, I want to paste a WhatsApp order in Hindi, English, or Hinglish, so that I do not have to hunt for each product.
48. As a retailer, I want every AI line to show the original words, so that I can see what the app understood.
49. As a retailer, I want a confidence indicator on each line, so that I know where to look.
50. As a retailer, I want two alternative SKUs for an uncertain line, so that I can fix it in one tap.
51. As a retailer, I want the app to ask "case or piece?" when the unit is unclear, so that it does not guess.
52. As a retailer, I want to edit the quantity or SKU before accepting, so that I stay in control.
53. As a retailer, I want to remove a line that is wrong, so that it does not enter my cart.
54. As a retailer, I want no order to be placed until I confirm, so that an AI mistake never becomes a real order.
55. As a retailer, I want out-of-stock AI lines flagged, so that I can choose a substitute or remove them.
56. As a retailer, I want the AI to use my past orders and corrections, so that it gets better for my shop.
57. As a retailer, I want a clear fallback when the AI is unavailable, so that I can still order manually.
58. As a retailer, I want low-confidence lines to require my choice, so that the app does not silently pick a wrong SKU.
59. As a retailer, I want the AI to receive only the order text, not my phone or address, so that my personal data is minimised.
60. As an order desk user, I want to see the raw message beside the parsed lines, so that I can check the AI in seconds.
61. As an order desk user, I want low-confidence lines highlighted, so that I review the right ones.
62. As an order desk user, I want my correction to become an alias for that retailer, so that the same mistake does not repeat.
63. As an order desk user, I want to reject an AI line and confirm the rest, so that one bad line does not block the order.

### Order desk and Tally

64. As an order desk user, I want a queue of new orders with counts by status, so that I know what needs attention.
65. As an order desk user, I want to filter the queue by status, retailer, and date, so that I can find an order.
66. As an order desk user, I want an order detail with retailer, lines, schemes, totals, and credit, so that I can decide.
67. As an order desk user, I want to put an order on credit hold with a reason, so that the retailer knows why.
68. As an order desk user, I want to approve or reject a credit hold, so that the order can move or stop.
69. As an order desk user, I want to confirm a checked order, so that it becomes ready for dispatch and export.
70. As an order desk user, I want to export confirmed orders to Tally, so that I do not retype them.
71. As an order desk user, I want an export log with file, time, user, and order count, so that I can trace what was sent.
72. As an order desk user, I want a repeated export to be blocked or clearly marked, so that I do not create duplicate vouchers.
73. As an order desk user, I want an audit trail of confirmations, holds, and exports, so that changes are accountable.
74. As an order desk user, I want a van loading list for confirmed orders, so that the warehouse can load the right cases. _(Stretch.)_
75. As the owner-director, I want a dashboard of retailers with no order in 14 days, so that the team can follow up. _(Stretch.)_

### Quality, security, and admin

76. As a user, I want meaningful empty and error states, so that I am never staring at a blank screen.
77. As a user, I want inline validation messages, so that I can fix a mistake without guessing.
78. As a user, I want the app to work at 360px width, so that it fits my phone.
79. As a user, I want accessible contrast, focus, and labels, so that the app is usable with a keyboard or screen reader.
80. As an admin, I want to manage products, prices, stock, schemes, and retailers, so that master data stays current. _(Stretch; seed-only in MVP.)_
81. As a reviewer, I want seeded demo accounts and data, so that I can test the product without setup.
82. As the client, I want no secrets or real personal data in the repository, so that the handover is safe.

---

## 5. Implementation Decisions

### 5.1 Architecture

- **One Next.js App Router application in TypeScript**, deployed as a single service, with PostgreSQL.
- **Server Components** for read-heavy screens such as the catalogue, order history, and desk queue. **Route Handlers or Server Actions** for mutations, all validated with Zod.
- **Why a monolith:** the 7-day constraint rewards the smallest operational surface. One auth boundary, one deploy, one database, and no cross-service latency. The catalogue can be server-rendered for slow 3G, and the desk can be a client-heavy table inside the same app.
- **Why not a separate SPA and API:** two deployments, CORS, duplicated auth, and more moving parts for no benefit at this size.
- **UI:** Tailwind CSS with a small set of custom design tokens, Radix/shadcn primitives for accessible dialogs, menus, and tabs, and Lucide icons. No heavy chart or table library in the MVP.
- **Database:** PostgreSQL with Drizzle ORM and SQL migrations. A deterministic, idempotent seed script creates the demo world.
- **Authentication:** phone OTP with a database-backed session cookie. Roles are `retailer`, `desk`, and `admin`.
- **AI:** a provider-agnostic adapter that requests structured JSON, with a deterministic matcher as a fallback. The AI is never the only path to a correct order.
- **Tally export:** Tally Prime XML sales vouchers, with a CSV fallback. Both are generated from the same confirmed-order data.
- **Deployment:** Vercel plus Neon or Supabase Postgres. A Docker Compose Postgres option is documented for local development. Environment variable names are documented; values never enter the repository.

### 5.2 Modules

| Module            | Responsibility                                                                            | Interface                                                  | Tested in isolation |
| ----------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------- |
| Auth and RBAC     | OTP challenge, session, role guards, retailer scoping                                     | Request OTP, verify OTP, current user, require role        | Yes                 |
| Catalogue         | Products, categories, brands, retailer price resolution, stock status, scheme badges      | Query catalogue for a retailer, get product by SKU         | Yes                 |
| Scheme Engine     | Pure calculation of scheme eligibility, free goods, slab discounts, savings, explanations | Price a set of cart lines against active schemes and stock | Yes, heavily        |
| Cart and Checkout | Cart state, server re-pricing, stock reservation, credit check, order creation            | Price cart, place order, validate idempotency              | Yes                 |
| Orders            | Order lifecycle, status transitions, history, repeat order, audit                         | Create, list, get, confirm, hold, cancel, repeat           | Yes                 |
| AI Capture        | Text extraction, SKU candidate generation, confidence policy, review state, provenance    | Capture text, resolve line, accept capture                 | Yes, with fixtures  |
| Alias Resolver    | Exact, normalized, fuzzy, and past-order matching; learn retailer-scoped aliases          | Resolve a raw term to ranked SKU candidates                | Yes                 |
| Desk              | Queue, filters, detail view, credit decisions, confirmation                               | List queue, get order, hold, approve, reject, confirm      | Yes                 |
| Tally Export      | Build Tally XML or CSV from confirmed orders, log export, prevent duplicates              | Export orders, download export, list exports               | Yes                 |
| Admin             | Master data CRUD                                                                          | Products, prices, stock, schemes, retailers                | Stretch             |
| Shared            | Database, environment validation, logging, rate limiting, error handling                  | Shared primitives                                          | Yes                 |

The two deep modules worth protecting from churn are the **Scheme Engine** and the **AI Capture pipeline**. Both should be callable without a database or a UI, and both should have their own test suites.

### 5.3 Data Model

| Entity        | Key fields                                                                                                                                                              | Notes                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| User          | id, phone, name, role, retailerId, active                                                                                                                               | Retailer users link to exactly one retailer; desk users have no retailer              |
| Retailer      | id, shopName, ownerName, phone, address, creditLimit, outstanding, language                                                                                             | Credit limit and outstanding are seeded; payment allocation is out of scope           |
| Session       | id, userId, tokenHash, expiresAt, createdAt, revokedAt                                                                                                                  | Opaque token in an httpOnly cookie; hash stored in the database                       |
| OtpChallenge  | id, phone, codeHash, expiresAt, attempts, consumedAt                                                                                                                    | Codes are hashed; attempts and resends are limited                                    |
| Brand         | id, name                                                                                                                                                                | Four brands in the seed                                                               |
| Category      | id, name, slug                                                                                                                                                          | Food, home care, tea, biscuits, etc.                                                  |
| Product       | id, skuCode, name, hindiAliases, brandId, categoryId, packSize, caseSize, unit, gstRate, dealerPrice, priceIncludesGst, stockCases, lowStockThreshold, imageUrl, active | SKU code is unique; `caseSize` is pieces per case                                     |
| RetailerPrice | retailerId, productId, price, validFrom, validTo                                                                                                                        | Optional override; falls back to the product dealer price                             |
| Scheme        | id, name, type, productId, freeProductId, buyQty, freeQty, minQty, percent, startsAt, endsAt, priority, active                                                          | MVP types: buy-X-get-Y and slab percent                                               |
| Order         | id, orderNo, retailerId, createdById, source, status, subtotal, discount, tax, total, creditStatus, notes, aiCaptureId, idempotencyKey, confirmedAt, exportedAt         | Status is an enum; totals are stored in paisa; idempotency key is unique per retailer |
| OrderItem     | id, orderId, productId, qtyCases, unitPrice, discount, lineTotal, isFree, schemeId, schemeExplanation                                                                   | Free goods are separate lines at zero value                                           |
| AiCapture     | id, retailerId, rawText, model, promptVersion, status, createdAt, parsedJson, error                                                                                     | Provenance for every AI attempt                                                       |
| AiCaptureLine | id, captureId, rawText, productId, qty, unit, confidence, alternatives, needsClarification, resolution                                                                  | Alternatives are a ranked list of SKU IDs                                             |
| Alias         | id, retailerId, rawTerm, productId, createdById, createdAt                                                                                                              | Unique per retailer and raw term                                                      |
| Export        | id, format, fileName, orderCount, checksum, createdById, createdAt                                                                                                      | Batch header; orders are linked through ExportOrder                                   |
| ExportOrder   | exportId, orderId                                                                                                                                                       | Unique on orderId; an order can be exported at most once                              |
| AuditLog      | id, actorId, action, entityType, entityId, metadata, createdAt                                                                                                          | Append-only                                                                           |

**Money:** stored as integer paisa, never floating point. **Weights/quantities:** integer cases in the MVP; pieces are explained but not ordered. **Dates:** UTC in the database, displayed in Asia/Kolkata.

### 5.4 Order Lifecycle

- `pending` — the retailer has placed the order; it is waiting for desk review.
- `credit_hold` — the payable total exceeds the retailer's available credit; the desk must approve or reject.
- `confirmed` — the desk has checked the order; it is ready for dispatch and export.
- `exported` — the order has been included in a successful Tally export.
- `cancelled` — the desk or retailer has cancelled before export; stock is restored.

**Rules**

- Stock is checked and decremented atomically when the order is placed, including free goods. Cancellation restores it. This prevents overselling between order placement and desk confirmation.
- Credit is checked against the payable total, which excludes free goods. If the total exceeds the available limit, the order is created as `credit_hold` and stock remains reserved while the desk decides.
- A retailer can cancel only while the order is `pending` or `credit_hold`.
- The desk can confirm only `pending` or an approved `credit_hold`.
- Only `confirmed` orders can be exported.
- Every status change writes an audit entry with actor, reason, and timestamp.
- An idempotency key supplied by the client prevents duplicate orders on retry.
- Order numbers use a readable format such as `SO-20261102-0042`; the exact format is an assumption to confirm.

### 5.5 Scheme Engine

**Rule types in the MVP**

| Type         | Inputs                                  | Calculation                                                                   | Example                                      |
| ------------ | --------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------- |
| Buy X get Y  | buyQty, freeQty, optional freeProductId | Free quantity = floor(paid quantity / buyQty) × freeQty, capped by free stock | Buy 10 cases of glucose biscuits, get 1 free |
| Slab percent | minQty, percent                         | If paid quantity ≥ minQty, discount = line subtotal × percent                 | 3% off 5 or more cases of detergent          |

**Precedence**

1. Ignore schemes that are inactive, outside their date window, or not eligible for the retailer.
2. Resolve the retailer's price for each line.
3. Choose at most one scheme per SKU: the one with the highest saving; ties break on lower priority number.
4. Compute free goods from the paid quantity only. Free goods do not count toward another scheme.
5. Apply a slab discount to the paid quantity's line subtotal only.
6. Cap free goods at available free stock and explain any shortfall.
7. Round money half-up to the nearest paisa at line level, then reconcile the order total.
8. Return an explanation for every applied and near-miss scheme, including the quantity gap for a nudge.
9. The server recalculates everything at checkout. The client preview is indicative and never authoritative.

**Sample-data behaviour**

- 10 cases of SKU-BS-075 → 1 free case, saving shown.
- 5 cases of SKU-DT-1KG → 3% off.
- 2 cases of SKU-DT-1KG → no discount, nudge "add 3 more cases for 3% off".
- Any quantity of SKU-TE-250 → out of stock; blocked at checkout and flagged in AI review.

**Edge cases to test:** exact threshold, one below threshold, free stock lower than the earned free quantity, expired scheme, overlapping schemes, zero-price free line, rounding at half-paisa, multiple lines of the same SKU, and an order that exceeds credit because of a slab discount changing the total.

### 5.6 AI Capture

**Pipeline**

1. Validate the input: trim, cap at 2,000 characters, reject empty or oversized input.
2. Send only the order text to the LLM with a low-temperature prompt and a strict JSON schema. The prompt asks for raw line text, product words, quantity, unit, and a confidence score. It never receives the retailer's phone, address, or credit data.
3. Validate the LLM output against the catalogue. Any hallucinated SKU is discarded.
4. Run the deterministic matcher: exact alias, normalized name, token overlap, fuzzy match, and the retailer's past-order frequency. Merge and rank the candidates.
5. Apply the confidence policy.
6. Present the review UI. The retailer resolves units, picks alternatives, edits quantities, or removes lines.
7. On acceptance, create a cart payload and let the normal server checkout revalidate price, stock, schemes, and credit.
8. Store the raw text, model, prompt version, confidence, alternatives, and correction for audit.

**Confidence policy**

| Band         | Score          | UI behaviour                                                  | Can be accepted without a choice? |
| ------------ | -------------- | ------------------------------------------------------------- | --------------------------------- |
| High         | 0.85 and above | Preselected SKU, confidence chip, still requires confirmation | Yes, after reviewing              |
| Medium       | 0.60–0.84      | Two alternatives shown, preselected best guess                | Yes, after choosing               |
| Low          | Below 0.60     | No preselection; manual SKU search                            | No                                |
| Unit unclear | Any            | Asks case or piece; explains the case size                    | No, until resolved                |

**Failure behaviour**

- If the LLM times out or errors, show a clear banner and fall back to a deterministic parser plus alias matching. All fallback lines are low confidence and require manual review.
- If the AI is unavailable entirely, the retailer can always use the catalogue manually. The AI screen is never a dead end.
- If a line is out of stock, it is flagged and cannot enter the cart until removed or replaced.
- If a retailer's correction differs from the AI, the correction is saved as a retailer-scoped alias. Desk corrections use the same mechanism. Global aliases require admin approval and are out of scope.

**Why hybrid:** LLMs are good at messy Hindi/Hinglish phrasing and quantities; they are bad at knowing the actual catalogue. The deterministic matcher grounds every SKU in real data. The human confirmation gate is the safety net for both.

### 5.7 Pricing and GST

- A product can declare whether its dealer price includes GST. The seed treats dealer prices as GST-inclusive, matching the brief's "prices must show clearly whether GST is included".
- The UI shows an "incl. GST" badge next to prices, and the order detail shows taxable value, GST amount, and total.
- Retailer-specific prices override the dealer price when active.
- Discounts apply to the taxable line value; GST is computed on the discounted value.
- Free goods are zero-value lines with a scheme explanation. Their GST treatment is documented as an assumption and reflected consistently in the Tally export.
- All money is integer paisa. Rounding is half-up at line level, then the order total is reconciled.
- The server is the only authority for final totals.

### 5.8 Tally Export

- Export only `confirmed` orders. A mixed selection is rejected with a clear message.
- Generate one Tally Prime XML file per export batch, containing one sales voucher per confirmed order, with party ledger, order reference, item lines, quantities, rates, discounts, GST, and free goods.
- Provide a CSV fallback with the same fields for reviewers or Tally versions that do not accept the XML.
- Record every export: format, file name, order count, checksum, actor, and timestamp.
- Prevent duplicate export of the same order. If an order was already exported, show the previous export and block a second one.
- Download is authorized to desk and admin roles only, and the file is generated on demand from stored data.
- The exact Tally format is not specified in the brief, so the XML structure is an explicit assumption. Tests assert well-formed XML, correct totals, and stable line ordering.

### 5.9 Auth, Roles, and Security

**Authentication**

- Six-digit OTP, five-minute expiry, five attempts, 60-second resend cooldown.
- OTP codes are hashed with a server-side pepper; plaintext codes are never stored or logged.
- A demo OTP is enabled only in non-production or for seeded demo phone numbers.
- Sessions use a random opaque token in an httpOnly, secure, SameSite=Lax cookie. Only the token hash is stored. Sessions expire after seven days and are revoked on logout.
- Login rotates the session token.

**Authorization matrix**

| Action                            | Retailer | Desk                         | Admin         |
| --------------------------------- | -------- | ---------------------------- | ------------- |
| View own catalogue and prices     | Yes      | Yes, all retailers           | Yes           |
| View own credit and orders        | Yes      | Yes, all retailers           | Yes           |
| Place an order                    | Yes      | No (MVP)                     | No            |
| Capture an order with AI          | Yes      | Yes, on behalf of a retailer | Yes           |
| Confirm, hold, or cancel an order | No       | Yes                          | Yes           |
| Export to Tally                   | No       | Yes                          | Yes           |
| Manage master data                | No       | No                           | Yes (stretch) |

**Controls**

- Every query and mutation derives the retailer ID from the session, never from client input.
- Zod validates every request body, query string, and route parameter. Unknown fields are rejected.
- Origin checks and SameSite cookies protect mutations against CSRF.
- Rate limits cover OTP requests, OTP verification, AI capture, and order creation.
- No secrets in the repository. `.env.example` lists names only.
- Seed data is fictional. Phone numbers are reserved demo numbers. Logs redact phone numbers and order text.
- Security headers include CSP, HSTS, X-Content-Type-Options, and Referrer-Policy.
- Desk actions and exports write audit entries. Authentication failures are logged without sensitive values.

### 5.10 UI and Design

**Design direction:** a calm, warm, paper-like interface with ink text and one deep green accent. Amber for low stock, red for out-of-stock, and a restrained neutral palette everywhere else. Large numerals for prices, generous spacing, subtle borders, and no decorative gradients or generic AI styling. The product should feel like a well-run Indian wholesale ledger, not a SaaS template.

**Core screens (7)**

| Screen                       | Purpose                        | Key elements                                                                                          |
| ---------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Login / OTP                  | Retailer and desk sign-in      | Phone input, OTP input, resend timer, demo hint                                                       |
| Catalogue                    | Find and add products          | Search, category chips, product cards, stock pill, scheme badge, price, stepper                       |
| Cart / checkout              | Review and place the order     | Line items, free goods, scheme nudges, savings, GST note, credit bar, place order                     |
| AI capture and review        | Turn a message into lines      | Paste box, example chips, raw text per line, confidence, alternatives, unit question, add to cart     |
| Order confirmation / history | See what happened              | Order number, status, totals, timeline, repeat order                                                  |
| Desk queue                   | Triage incoming orders         | Status tabs, counts, filters, retailer, total, age, credit flag                                       |
| Desk order detail / export   | Check, decide, confirm, export | Raw vs parsed, line detail, scheme explanation, credit panel, hold/confirm/export actions, export log |

**Mobile rules**

- Design at 360px first; the desk screen adapts to desktop.
- Bottom navigation for Shop, Orders, and Account.
- A sticky cart bar shows item count and total.
- Minimum 44px tap targets; 16px body text; 24px+ price numerals.
- One primary action per screen.
- Product images are consistent packshots, not mismatched stock photos.

**States**

- Skeleton cards for catalogue and orders.
- Empty states with a single next action: no products, empty cart, no orders, no AI lines.
- Error states with a retry action and a human-readable message.
- Offline banner if the network drops; the app does not pretend to be offline-first.
- Inline validation, disabled buttons with a reason, and success toasts.
- No dead buttons. Every control either works or is visibly disabled with an explanation.

**Accessibility**

- Contrast at least 4.5:1 for body text.
- Visible focus rings, labelled inputs, semantic headings, and keyboard-operable dialogs.
- `aria-live` for async results such as AI capture and order placement.
- Reduced motion respected.

**Copy**

- Plain language, short sentences.
- "Incl. GST", "1 case = 96 packs", "Add 5 more for 1 free".
- Hindi/English toggle on retailer screens, with Hindi product aliases and Hindi example messages; desk and admin content remain English.

### 5.11 Performance

- Server-render the catalogue and order history; avoid shipping a large client bundle.
- Optimize images and use a consistent local packshot set; lazy-load below the fold.
- Subset fonts and preload only the body font.
- Split the desk bundle from the retailer bundle.
- Use route-level caching only where prices and stock cannot go stale; revalidate on mutation.
- Budgets: LCP under 3 seconds on Slow 3G, under 2.5 seconds on 4G; initial JS under 200 KB gzipped; Lighthouse mobile performance at least 85.
- Test with Chrome DevTools throttling and a real mid-range Android profile, not just desktop.

### 5.12 API Contracts

| Area      | Endpoint                                 | Role                  | Purpose                                                   |
| --------- | ---------------------------------------- | --------------------- | --------------------------------------------------------- |
| Auth      | POST /api/auth/otp                       | Public                | Request an OTP for a registered phone                     |
| Auth      | POST /api/auth/verify                    | Public                | Verify the OTP and create a session                       |
| Auth      | POST /api/auth/logout                    | Authenticated         | Revoke the session                                        |
| Auth      | GET /api/auth/me                         | Authenticated         | Return the current user and role                          |
| Catalogue | GET /api/catalogue                       | Retailer, desk        | List products with the viewer's price, stock, and schemes |
| Catalogue | GET /api/catalogue/:sku                  | Retailer, desk        | Product detail                                            |
| AI        | POST /api/ai/captures                    | Retailer, desk        | Capture a raw text order                                  |
| AI        | GET /api/ai/captures/:id                 | Owner or desk         | Fetch a capture and its lines                             |
| AI        | PATCH /api/ai/captures/:id/lines/:lineId | Owner or desk         | Resolve a SKU, quantity, or unit                          |
| AI        | POST /api/ai/captures/:id/accept         | Owner or desk         | Accept the reviewed lines and return a cart payload       |
| AI        | POST /api/ai/captures/:id/aliases        | Desk                  | Save a retailer-scoped correction                         |
| Orders    | POST /api/orders                         | Retailer              | Place an order with server re-pricing and idempotency     |
| Orders    | GET /api/orders                          | Authenticated, scoped | List the viewer's orders                                  |
| Orders    | GET /api/orders/:id                      | Owner or desk         | Order detail                                              |
| Orders    | POST /api/orders/:id/hold                | Desk                  | Put an order on credit hold with a reason                 |
| Orders    | POST /api/orders/:id/confirm             | Desk                  | Confirm a checked order                                   |
| Orders    | POST /api/orders/:id/cancel              | Owner or desk         | Cancel before export and restore stock                    |
| Exports   | POST /api/exports                        | Desk                  | Export confirmed orders                                   |
| Exports   | GET /api/exports                         | Desk                  | List export history                                       |
| Exports   | GET /api/exports/:id/download            | Desk                  | Download the generated file                               |
| Admin     | CRUD /api/admin/...                      | Admin                 | Master data management (stretch)                          |
| Health    | GET /api/health                          | Public                | Liveness and database check                               |

The exact request and response shapes are implementation details, but the role and purpose columns are fixed contracts.

### 5.13 Configuration and Deployment

Environment variable names only:

- `DATABASE_URL`
- `AUTH_SECRET`
- `OTP_PEPPER`
- `DEMO_OTP` (non-production only)
- `SMS_PROVIDER`
- `SMS_API_KEY`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_API_KEY`
- `APP_URL`
- `EXPORT_SIGNING_SECRET`
- `SENTRY_DSN` (optional)

Deployment target: Vercel for the app and Neon or Supabase for Postgres, with migrations and an idempotent seed run once per environment. A Docker Compose Postgres path is documented for local development. Deploy a preview on Day 1 so environment problems surface early.

### 5.14 Observability

- Structured JSON logs with request ID, route, status, duration, and a hashed user reference.
- No order text, phone numbers, OTPs, or secrets in logs.
- A user-facing error boundary with a retry path.
- An audit log for business actions, separate from application logs.
- A health endpoint that checks the database.
- Optional Sentry for exceptions; not required for the demo.

---

## 6. Testing Decisions

**What makes a good test:** it asserts external behaviour that a user or another module can observe. It does not reach into private functions, assert implementation details, or depend on seed ordering. Fixtures are explicit and deterministic.

**Unit tests**

- Scheme Engine: exact threshold, one below, multiple schemes, expired scheme, free-stock cap, rounding, free-line pricing, explanation text.
- Pricing: retailer override, GST-inclusive and exclusive paths, line and order rounding, discount on taxable value.
- Credit: available limit, exact limit, over-limit hold, free goods excluded.
- AI normalization: quantity and unit extraction, Hindi/Hinglish tokens, empty input, oversized input.
- Alias Resolver: exact match, normalized match, fuzzy match, past-order preference, retailer scoping.
- Tally builder: well-formed XML, correct totals, stable ordering, free lines, CSV parity.

**Integration tests**

- OTP request, verify, session, logout, and rate limits.
- Role guards: retailer cannot confirm, export, or read another retailer's order.
- Order lifecycle: place, hold, approve, confirm, export, cancel, stock restoration.
- Idempotency: a repeated checkout with the same key returns the same order.
- AI capture: capture, resolve, accept, and alias creation.
- Export: only confirmed orders, duplicate prevention, authorized download.

**End-to-end tests**

- Retailer logs in, browses, adds 10 biscuit cases, sees 1 free, places an order, and sees it in history.
- Retailer pastes the sample Hindi message, resolves the tea out-of-stock line, confirms the rest, and places the order.
- Desk logs in, opens the AI order, sees the raw message, approves a credit hold, confirms, and exports.
- Retailer A cannot see Retailer B's prices, credit, or orders.
- AI provider failure shows the fallback and still allows a manual order.
- Empty and error states render without a crash.

**Security tests**

- Authorization matrix for every role and endpoint.
- OTP brute-force and resend limits.
- Input validation for malformed and oversized payloads.
- No secrets in the repository; dependency audit clean of critical issues.
- Logs do not contain phone numbers or raw order text.

**Performance tests**

- Lighthouse mobile run on the catalogue and cart.
- A seeded catalogue of at least 32 SKUs with images.
- A 360px viewport check.
- Slow 3G throttling for LCP and first load.

**Tooling:** Vitest for unit and integration tests, Playwright for end-to-end, a lightweight factory for fixtures, and CI that runs lint, typecheck, unit tests, and build on every push. End-to-end runs against a preview deployment or a local production build.

**Prior art:** greenfield repository; there is no existing test suite to mirror. The scheme engine and export builder set the pattern: pure input/output tests, fixed fixtures, no database.

---

## 7. Out of Scope

The following are deliberately excluded from this release. Some are stretch items if the core is green; none block submission.

- Photo-based order capture and Hindi voice-note capture.
- Offline salesman mode with conflict resolution.
- Van loading lists.
- The 14-day inactive-retailer dashboard.
- Admin CRUD screens; master data is seeded in the MVP.
- Real SMS, WhatsApp, or notification delivery; OTP is mocked.
- Payments and credit-ledger reconciliation.
- Delivery tracking.
- GST e-invoicing; it stays in Tally.
- Two-way Tally sync; export is one-way.
- Returns and credit notes.
- Multi-warehouse or multi-company support.
- Native Android or iOS apps.
- Full translation of desk, admin, and long-form content; the retailer-facing core screens have a Hindi/English toggle.
- Advanced analytics, forecasting, or route optimisation.
- Salesman assignment and beat plans.

---

## 8. Further Notes

### Assumptions (to label in the TDD)

1. The 7-day build starts on 2 November 2026 and the submission is due on 8 November 2026. The actual deadline may differ.
2. One developer, solo, with AI assistance.
3. The core slice is the priority. Photo/voice capture, offline salesman mode, van loading, the 14-day dashboard, and admin CRUD are stretch.
4. The brief's dealer prices are treated as GST-inclusive. Products carry a GST rate; the UI shows "incl. GST" and a breakup. If the client's real prices are exclusive, a product flag flips the display.
5. "Case" is the ordering unit. "Peti" maps to case. Piece-level ordering is explained but not supported in the MVP.
6. A retailer can order an out-of-stock item only after removing or substituting it; out-of-stock lines are blocked at checkout and flagged in AI review.
7. Credit limit and outstanding are seeded. An order above the available limit goes to `credit_hold`; the desk can approve or reject. There is no payment ledger.
8. Tally export assumes Tally Prime XML sales vouchers. A CSV fallback is provided because the exact format is not specified.
9. OTP delivery is mocked. A fixed demo OTP is available for seeded demo numbers in non-production.
10. The retailer-facing core screens support a Hindi/English toggle. Desk and admin screens remain English, and full content translation is stretch. Hindi product aliases and Hindi AI input are MVP.
11. The demo catalogue extends the three sample SKUs to about 32 realistic SKUs across four brands, with fictional names, prices, stock, and images.
12. All seed names, phone numbers, addresses, and orders are fictional. No real personal data is used.
13. Deployment is Vercel plus a managed Postgres. A local Docker Compose option is documented.
14. The scheme engine supports buy-X-get-Y and slab percent. Flat discounts and retailer-segment schemes are future work.
15. Stock is reserved at order placement and restored on cancellation. The desk confirmation does not reserve stock again.

### Open decisions

- Which AI provider and model are available for the build? The adapter should make this swappable.
- Is a live deployment required, or is a local demo acceptable? The plan assumes a live app because it strengthens the submission.
- Should the MVP include a minimal admin screen, or is seed-only master data enough? The plan favours seed-only and uses the time for polish and tests.
- How much Hindi UI is required for the demo? The plan assumes a Hindi/English toggle on retailer screens, Hindi aliases, and Hindi AI input; desk screens remain English.

### Success metrics (from the brief)

- 50% of orders placed in the app or captured by AI within four months.
- Order errors from 5% to under 1%.
- Order-entry team from 6 to 3.
- For this submission: a demo order in under 60 seconds, AI lines visibly reviewable, zero unconfirmed AI orders, and a Tally file the desk can use.

### Demo data

- Four brands, about 32 SKUs, including the three sample SKUs.
- Ten retailers with fictional shop names, phones, credit limits, and outstanding balances.
- Three desk users and one admin.
- Six schemes: at least two buy-X-get-Y and two slab discounts, with one expired scheme to prove date handling.
- Twenty past orders across retailers and statuses.
- The brief's raw message as a seeded AI example: "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti".
- A second message with an unclear unit to exercise the clarification path.

### Submission constraints

- One ZIP up to 25 MB containing the Technical Design Document and `deployment.md`.
- The TDD must have the GitHub URL at the top and, if deployed, the live app URL.
- The repository stays public until review is complete.
- Commit history is part of the assessment; commit in small, meaningful steps.
- No secrets or real personal data in the repository.
- `deployment.md` lists local steps, deployment steps, environment variable names only, and demo login details.
