# Sahaj Order — 7-Day Roadmap

**Goal:** Ship the core slice of the distributor order-capture app end to end: retailer catalogue with prices and schemes, cart and order, AI capture from a text order, and an order desk with Tally export.

**Product requirements:** [`PRD.md`](./PRD.md)  
**Source briefs:** [`a.md`](./a.md), [`brief.md`](./brief.md)  
**Build window:** Day 1 Monday 2 November 2026 → Day 7 Sunday 8 November 2026 _(assumed; adjust if the actual deadline differs)_  
**Team:** Solo, with AI assistance  
**Guiding rule:** Core first. No stretch feature starts until the MVP is green, deployed, and documented.

---

## 1. Scope

### Must ship (MVP)

- Phone OTP sign-in and two roles: retailer and order desk.
- Retailer catalogue: own price, GST treatment, stock status, scheme badges, search, categories.
- Hindi/English toggle on retailer-facing screens, with Hindi product aliases and Hindi example messages.
- Cart with case quantities, automatic free goods, slab discounts, scheme nudges, totals, and a credit check.
- Order placement with server-side re-pricing, stock reservation, idempotency, confirmation, history, and repeat order.
- AI capture from a pasted text order (Hindi, English, Hinglish): raw line text, confidence, two alternatives, unit clarification, edit/remove, and human confirmation.
- Deterministic scheme engine with explanations and a strong test matrix.
- Order desk queue, order detail, raw message beside parsed lines, credit hold, approve/reject, confirm, cancel.
- Tally export for confirmed orders with an export log and duplicate protection.
- Realistic seed data, responsive UI, loading/empty/error states, PWA installability, basic security, tests, deployment, TDD, and `deployment.md`.

### Stretch (only after MVP is green)

- Photo-based order capture.
- Hindi voice-note capture.
- Offline salesman mode with sync and conflict handling.
- Van loading lists.
- 14-day inactive-retailer dashboard.
- Admin CRUD for products, prices, stock, schemes, and retailers.
- Full translation of desk, admin, and long-form content.
- Order notifications via mocked SMS/WhatsApp.

### Not this release

Payments, delivery tracking, GST e-invoicing, two-way Tally sync, returns and credit notes, multi-warehouse, native apps, advanced analytics, salesman beat plans, and real SMS/WhatsApp delivery.

---

## 2. Milestones

| Milestone                          | Day / date       | Outcome                                                                                 | Exit gate                                                                       |
| ---------------------------------- | ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| M0 — Foundation and auth           | Day 1, Mon 2 Nov | Repo, design system, database, seed skeleton, OTP login, roles, preview deploy          | Retailer and desk can log in; seeded catalogue API responds; CI is green        |
| M1 — Catalogue and scheme engine   | Day 2, Tue 3 Nov | Retailer catalogue with own price, stock, schemes; tested scheme engine                 | Scheme test matrix passes; catalogue works at 360px; performance budget drafted |
| M2 — Cart and orders               | Day 3, Wed 4 Nov | Cart, server re-pricing, credit check, order creation, history, repeat order            | Manual order works end to end; credit-hold path works; order history is correct |
| M3 — AI capture                    | Day 4, Thu 5 Nov | Text capture pipeline, review UI, confidence, alternatives, unit clarification, aliases | Sample Hindi message parsed; no auto-order; provider-failure fallback works     |
| M4 — Desk and Tally                | Day 5, Fri 6 Nov | Desk queue, detail, credit decisions, confirmation, Tally export, audit                 | Desk processes an AI order and exports it; re-export is blocked                 |
| M5 — Polish, security, performance | Day 6, Sat 7 Nov | Mobile design pass, states, PWA, accessibility, authorization, rate limits, Lighthouse  | Lighthouse mobile ≥ 85; E2E green; no cross-retailer leaks; no dead buttons     |
| M6 — QA, deploy, docs, submit      | Day 7, Sun 8 Nov | Production deployment, final QA, TDD, deployment.md, demo script, ZIP                   | Live app and demo login work; docs complete; ZIP is under 25 MB                 |

---

## 3. Day-by-Day Plan

### Day 1 — Foundation, data, and auth

**Goal:** A deployable skeleton with real seeded data and working role-based login.

**Morning**

- Create the public repository with a README, `.gitignore`, `.env.example`, and a clear commit history from the first commit.
- Scaffold the Next.js App Router application with TypeScript, Tailwind, a small design-token layer, fonts, and a responsive layout shell.
- Add lint, typecheck, unit-test, and build scripts, plus a CI workflow.
- Define the database schema and migrations for users, retailers, sessions, OTP challenges, brands, categories, products, retailer prices, schemes, orders, order items, AI captures, aliases, exports, and audit logs.
- Build the seed skeleton with categories, brands, and the three sample SKUs.

**Afternoon**

- Build OTP request and verify with hashed codes, expiry, attempt limits, resend cooldown, database sessions, and httpOnly cookies.
- Add role-based guards and the login screen for retailer and desk.
- Seed demo users and a first catalogue read endpoint.
- Deploy a preview environment to catch environment and database problems early.

**Deliverable:** Retailer and desk demo accounts log in; a seeded catalogue API returns products; CI passes.

**Exit criteria:** No secrets in the repo; role redirects work; preview deployment is reachable.

---

### Day 2 — Catalogue and scheme engine

**Goal:** The retailer can find products and see the correct price, stock, and scheme; the hard calculation is tested.

**Morning**

- Build the catalogue screen: search, category chips, product cards with image, pack size, price, "incl. GST" badge, stock pill, scheme badge, and quantity stepper.
- Add a product detail sheet with pack and case information, scheme explanation, and stock.
- Add loading, empty, and error states.
- Seed the full catalogue: four brands, about 32 SKUs, realistic prices, stock levels, Hindi aliases, and packshot images.

**Afternoon**

- Build the pure scheme engine: buy-X-get-Y, slab percent, eligibility dates, one best scheme per SKU, free-stock cap, rounding, and explanations.
- Write the scheme test matrix: exact threshold, one below, overlapping schemes, expired scheme, free-stock cap, rounding, and multiple lines of the same SKU.
- Build the pricing service: retailer price override, GST-inclusive and exclusive handling, line totals, and order totals.
- Check the first mobile performance budget with throttling.

**Deliverable:** Catalogue works on a 360px screen, and the scheme test matrix is green.

**Exit criteria:** Buy 10 biscuits adds 1 free; 5 detergent cases get 3% off; 2 cases show a nudge; tea at zero stock is blocked; all scheme tests pass.

---

### Day 3 — Cart and orders

**Goal:** A retailer can build and place an order, and see it afterwards.

**Morning**

- Build cart state with local persistence, quantity stepper, remove, free-good lines, scheme nudges, savings, subtotal, GST note, credit bar, and order note.
- Use the same pure pricing functions for the client preview and the server authority, or call a server pricing endpoint to avoid drift.
- Add the empty-cart and checkout-error states.

**Afternoon**

- Build the checkout endpoint: validate the cart, re-price on the server, check stock, reserve stock atomically, check credit, create the order with an idempotency key, and return the order number.
- Build the confirmation screen, order history, order detail, and repeat order.
- Implement the credit-hold path: order above available credit is created on hold with a reason; stock remains reserved.
- Add audit entries for order creation and cancellation.

**Deliverable:** Manual retailer order works end to end, including history and repeat order.

**Exit criteria:** Order placement is idempotent; a stale price or stock error is clear; a credit hold is visible to the retailer; cancellation restores stock.

---

### Day 4 — AI capture

**Goal:** A pasted WhatsApp order becomes reviewed cart lines without ever placing an order automatically.

**Morning**

- Build the AI adapter: provider abstraction, strict JSON schema, low-temperature prompt, timeout, one retry, and provenance storage.
- Build the deterministic fallback: quantity and unit extraction, alias dictionary, normalized matching, fuzzy matching, and past-order preference.
- Implement the confidence policy: high, medium, low, and unit-unclear.
- Build a 10-message evaluation set, including the brief's sample and an unclear-unit case.

**Afternoon**

- Build the AI capture and review screen: paste box, example chips, line cards with original words, confidence chip, two alternatives, unit question, edit/remove, and "add to cart".
- Enforce that no order is created until the retailer confirms the reviewed lines.
- Flag out-of-stock lines and prevent them from entering the cart.
- Save retailer corrections as aliases; expose the same correction path to the desk.
- Test the provider-failure path and the low-confidence path.

**Deliverable:** The sample message is captured into reviewable lines; the fallback works when the provider fails.

**Exit criteria:** AI never places an order; low-confidence lines require a choice; unit ambiguity is asked, not guessed; all lines trace back to raw text.

---

### Day 5 — Order desk and Tally export

**Goal:** The desk can process, decide, confirm, and export orders without retyping.

**Morning**

- Build the desk queue with status tabs, counts, filters, retailer, total, age, and credit flag.
- Build the order detail with the raw message beside parsed lines, scheme explanations, totals, credit panel, and audit timeline.
- Add credit hold, approve, reject, confirm, and cancel with reasons.
- Add low-confidence highlighting and a correction-to-alias action.

**Afternoon**

- Build the Tally export: confirmed orders only, Tally Prime XML sales vouchers, CSV fallback, stable line ordering, totals reconciliation, checksum, export log, and duplicate prevention.
- Authorize downloads to desk and admin only.
- Test well-formed XML, totals, free lines, and re-export blocking.
- Add the desk empty and error states.

**Deliverable:** An AI-captured order can be checked, put on hold, approved, confirmed, and exported.

**Exit criteria:** The XML is well-formed and totals match; a second export of the same order is blocked; the export log shows actor and time.

---

### Day 6 — Polish, security, and performance

**Goal:** The product feels designed, behaves safely, and loads on a slow phone.

**Morning**

- Do a full design pass: spacing, type scale, colour, card hierarchy, price numerals, sticky cart, bottom navigation, and desk layout.
- Verify every screen at 360px and on a desktop.
- Add skeletons, empty states, error states, offline banner, success toasts, and disabled-button reasons.
- Add the PWA manifest and installability; keep offline caching optional.
- Add and verify the Hindi/English toggle for retailer screens and Hindi product aliases; verify Hindi and Hinglish AI input.
- Check accessibility: contrast, focus, labels, keyboard, and `aria-live`.

**Afternoon**

- Run the authorization matrix over every role and endpoint.
- Add OTP, AI, and order rate limits; validate all inputs; add security headers; scan for secrets.
- Run Lighthouse mobile and fix the largest performance issues.
- Run the Playwright end-to-end suite and fix regressions.
- Click every button and remove or disable anything that is not real.

**Deliverable:** A polished, safe, fast MVP.

**Exit criteria:** Lighthouse mobile ≥ 85; E2E green; no cross-retailer access; no dead buttons; no secrets.

---

### Day 7 — QA, deploy, and submit

**Goal:** A calm, complete submission with no last-minute feature work.

**Morning**

- Fix only blocking defects; freeze features.
- Deploy production, run migrations, seed idempotently, and create demo accounts.
- Smoke-test the full demo script on the production URL.
- Check error logs and health endpoint.

**Afternoon**

- Write the Technical Design Document: GitHub URL at the top, live app URL, architecture and rationale, data model, main flows, AI behaviour and failure handling, UI decisions, what was cut, and what comes next.
- Write `deployment.md`: local steps, deployment steps, environment variable names only, demo login details.
- Record or rehearse the three-minute demo.
- Create the ZIP with the TDD and `deployment.md`; verify it is under 25 MB.
- Run the final submission checklist.

**Deliverable:** Live app, public repository, TDD, `deployment.md`, and ZIP.

**Exit criteria:** A reviewer can log in with the demo details and complete the core flow without help.

---

## 4. Workstreams and Dependencies

| Workstream | Covers                                                | Depends on                |
| ---------- | ----------------------------------------------------- | ------------------------- |
| Foundation | Repository, design tokens, database, auth, deployment | Nothing                   |
| Retailer   | Catalogue, cart, orders, AI review                    | Foundation, scheme engine |
| AI         | Capture pipeline, matcher, confidence, aliases        | Catalogue and seed data   |
| Desk       | Queue, detail, credit, confirm, export                | Orders and AI capture     |
| Quality    | Design, tests, security, performance, docs            | All core workstreams      |

**Critical path:** schema → seed → auth → catalogue → scheme engine → cart/checkout → orders → AI capture → desk → Tally export → polish → deploy → docs.

If a dependency slips, cut scope from the cut list rather than compressing testing and security.

---

## 5. Definition of Done

- The main flows work on realistic seeded data, with no dead buttons.
- A retailer can log in, browse, see their own price, stock, and scheme, build a cart, and place an order.
- A retailer can paste a Hindi/English/Hinglish order, review AI lines with confidence and alternatives, resolve an unclear unit, and add the confirmed lines to the cart.
- A retailer can switch the core screens between Hindi and English.
- The scheme engine correctly handles buy-X-get-Y, slab discounts, free-stock caps, expiry, and rounding, with tests.
- The desk can see the raw message, review the parsed lines, place an order on credit hold, approve it, confirm it, and export it to Tally.
- A retailer cannot see another retailer's prices, credit, or orders, and cannot perform desk actions.
- Loading, empty, and error states exist on every core screen.
- The layout works at 360px and on a desktop.
- OTP, AI, and order endpoints are rate-limited and validated.
- No secrets or real personal data are in the repository.
- Unit, integration, and end-to-end tests pass in CI.
- The app is deployed with demo accounts; the TDD and `deployment.md` are complete.

---

## 6. Verification Criteria

- Retailer places a normal order in under 60 seconds on a 360px viewport.
- A retailer can switch the retailer-facing screens between Hindi and English, and the choice persists for the session.
- The sample message produces three lines with the correct SKUs and quantities; the tea line is flagged out of stock; the detergent line has a unit check if the unit is ambiguous.
- No order is created from an AI capture until the retailer confirms.
- 10 biscuit cases produce exactly 1 free case; 5 detergent cases produce exactly 3% off; 2 cases produce no discount and a nudge.
- Scheme test matrix and pricing tests pass with zero failures.
- A retailer cannot read or mutate another retailer's order, price, or credit.
- A retailer receives 403 on desk confirm and export actions.
- The desk can confirm and export a `confirmed` order; a second export is blocked.
- The Tally XML is well-formed and its totals match the order.
- Lighthouse mobile performance is at least 85; LCP is under 3 seconds on Slow 3G and under 2.5 seconds on 4G.
- Every core screen has a loading, empty, and error state; every visible button works or is disabled with a reason.
- The full Playwright suite passes against the production build.
- The production demo login and the three-minute script work without manual database changes.

---

## 7. Risks and Mitigations

| Risk                                     | Likelihood | Impact | Mitigation                                                                                                       | Contingency                                                                      |
| ---------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Scheme engine edge cases consume a day   | Medium     | High   | Limit to two rule types, define precedence up front, write the test matrix before the UI                         | Cut flat discounts and retailer-segment schemes; keep only the sample rules      |
| AI accuracy on Hindi/Hinglish is poor    | Medium     | High   | Build a 10-message evaluation set on Day 4, use aliases and past orders, always show alternatives and confidence | Fall back to the deterministic parser and manual review; the product still works |
| Scope creep from must-have items         | High       | High   | Publish the cut list, gate stretch features behind a green MVP, use feature flags                                | Cut stretch items in the listed order                                            |
| Product images look generic              | Medium     | Medium | Use one consistent illustrated packshot system, not mismatched stock photos                                      | Use clean typographic pack cards with colour and pack size                       |
| Slow 3G performance misses the budget    | Medium     | Medium | Server-render, optimize images and fonts, split bundles, measure on Day 2 and Day 6                              | Reduce the first screen to a lighter catalogue and lazy-load images              |
| OTP/auth takes longer than expected      | Low        | High   | Mock SMS from Day 1, use database sessions, keep the flow small                                                  | Use a seeded demo OTP and disable production SMS until after submission          |
| Tally format is wrong                    | Medium     | Medium | Ship XML and CSV, assert well-formedness and totals, label the assumption                                        | Reviewer can use the CSV fallback; document the format assumption clearly        |
| AI provider key or quota fails           | Medium     | High   | Abstract the provider, deploy early, test the fallback path                                                      | Run the demo on the deterministic fallback and state it honestly                 |
| Security or authorization bug            | Low        | High   | Write the authorization matrix on Day 1 and test every role; review queries for retailer scoping                 | Fix before polish; cut non-core features to buy time                             |
| Deployment or migration failure on Day 7 | Low        | High   | Deploy a preview on Day 1, run migrations and seed early, keep a local Docker path                               | Fall back to a local demo with a recorded walkthrough and document it            |

---

## 8. Cut List (in order)

If the schedule slips, cut from the top. Never cut from the "never cut" list.

1. Full translation of desk, admin, and long-form content (keep the retailer Hindi/English toggle, aliases, and AI input).
2. PWA offline caching (keep the installable manifest).
3. Order-history filters and sorting.
4. Product detail page (use a bottom sheet instead).
5. Credit-hold approval workflow (keep a hard block at checkout and a desk note).
6. Tally CSV fallback (keep XML if it validates).
7. Search synonyms and fuzzy catalogue search (keep exact and alias search).
8. Desk audit timeline UI (keep audit records in the database).
9. Order notes.
10. Repeat order (keep order history).

**Never cut:** human confirmation before an AI order, scheme correctness and tests, Tally export, role scoping, OTP security, mobile layout, loading/empty/error states, seed data, deployment, TDD, and `deployment.md`.

---

## 9. Three-Minute Demo Script

1. **Retailer login:** open the app on a phone-sized viewport, enter the demo phone, receive the demo OTP, and land on the catalogue.
2. **Catalogue:** show the retailer's price, "incl. GST", stock pill, and scheme badge. Add 10 cases of glucose biscuits; show 1 free case. Add 5 cases of detergent; show 3% off. Add 2 cases first to show the "add 3 more" nudge, then increase.
3. **Cart:** show the free line, savings, GST note, credit bar, and order note. Place the order and show the order number.
4. **AI capture:** paste the brief's message. Show the three suggested lines, raw words, confidence, the tea out-of-stock flag, and the alternative SKUs. Resolve one line, add the confirmed lines to the cart, and place the order.
5. **Desk:** switch to the desk account. Open the AI order, show the raw message beside the parsed lines, put it on credit hold, approve it, confirm it, and export to Tally. Show the export log and the blocked second export.
6. **Retailer history:** switch back and show the order status and repeat order.
7. **Close:** show the mobile layout and the Lighthouse score. State the cuts and the next steps honestly.

---

## 10. Submission Checklist

- [ ] Public GitHub repository with the full commit history.
- [ ] GitHub URL at the top of the TDD.
- [ ] Live app URL in the TDD, if deployed.
- [ ] TDD covers architecture, data model, main flows, AI behaviour and failure handling, UI decisions, cuts, and next steps.
- [ ] Every assumption is labelled in the TDD.
- [ ] `deployment.md` has local steps, deployment steps, environment variable names only, and demo login details.
- [ ] Demo retailer and desk accounts work on the deployed app.
- [ ] Seed data is present and realistic.
- [ ] Unit, integration, and end-to-end tests pass.
- [ ] No secrets, real personal data, or API keys in the repository.
- [ ] ZIP contains the TDD and `deployment.md`, is under 25 MB, and opens cleanly.
- [ ] Final demo run on the production URL, not just localhost.

---

## 11. Metrics to Report

| Metric                                            | Target                                      |
| ------------------------------------------------- | ------------------------------------------- |
| Time to place a normal order                      | Under 60 seconds                            |
| AI line accuracy on the 10-message evaluation set | 90% or better, with uncertain lines flagged |
| Unconfirmed AI orders                             | Zero                                        |
| Scheme test matrix                                | 100% pass                                   |
| Retailer cross-access                             | Zero                                        |
| Lighthouse mobile performance                     | 85 or better                                |
| LCP on Slow 3G                                    | Under 3 seconds                             |
| LCP on 4G                                         | Under 2.5 seconds                           |
| Tally export validation                           | Well-formed XML, totals match               |
| End-to-end suite                                  | Green on the production build               |
