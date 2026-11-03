# Sahaj Order Implementation Plan

## Objective

Ship the core distributor order-capture slice end to end in seven days: retailer catalogue with the retailer's own price, stock, and schemes; a cart and order flow; AI capture from a pasted text order with human review; and an order desk that can place credit holds, confirm orders, and export to Tally. The app must run on a phone at 360px, handle loading, empty, and error states, enforce retailer and desk roles, work on realistic seeded data, and be deployed with a Technical Design Document and `deployment.md`. The product requirements are in `PRD.md`; the milestone view is in `ROADMAP.md`.

## Implementation Plan

- [ ] 1. Create the application foundation, design tokens, layout shell, and CI pipeline
  - Create a public repository with a README, `.gitignore`, `.env.example` names only, and a clear first commit.
  - Scaffold a Next.js App Router application in TypeScript with Tailwind, a small design-token layer, accessible Radix or shadcn primitives, fonts, and a responsive layout shell.
  - Add lint, typecheck, unit-test, build, and format scripts, plus a CI workflow that runs them on every push.
  - Add environment validation so a missing database or auth secret fails fast with a readable message.
  - Rationale: one deployable application keeps auth, database, and UI in one place and leaves time for the product.
  - Dependencies: none.
  - Key considerations: pinned tool versions, a public repository from the start, and no secret values in the repository.

- [ ] 2. Define the database schema, migrations, and deterministic seed data
  - Model users, retailers, sessions, OTP challenges, brands, categories, products, retailer prices, schemes, orders, order items, AI captures, AI capture lines, aliases, exports, and audit logs.
  - Store money as integer paisa, quantities as integer cases, and timestamps in UTC with Asia/Kolkata display.
  - Add enums for order status, credit status, AI capture status, scheme type, and user role.
  - Write an idempotent seed with four brands, about 32 SKUs including the three sample SKUs, ten fictional retailers, three desk users, one admin, six schemes, twenty past orders, and the brief's raw message.
  - Rationale: the demo must not look empty, and tests need stable fixtures.
  - Dependencies: task 1.
  - Key considerations: fictional PII only, GST-inclusive dealer prices by default, one expired scheme, out-of-stock tea, and a second message with an unclear unit.

- [ ] 3. Build phone OTP authentication, database sessions, and role guards
  - Add OTP request and verify endpoints with a six-digit code, five-minute expiry, five attempts, and a 60-second resend cooldown.
  - Hash OTP codes with a server pepper; never store or log plaintext codes.
  - Create opaque database sessions stored in httpOnly, secure, SameSite cookies, with rotation on login and revocation on logout.
  - Add retailer, desk, and admin roles, redirect each role to the right home, and protect every route and mutation with a role guard.
  - Add the login screen with phone entry, OTP entry, resend timer, error states, and demo credentials for seeded numbers.
  - Rationale: sign-in and access control are must-haves and the foundation for retailer isolation.
  - Dependencies: task 2.
  - Key considerations: rate limits, session expiry, no OTP in logs, and retailer ID derived from the session rather than the request body.

- [ ] 4. Build the retailer catalogue and product presentation
  - Add a catalogue read model that resolves the retailer's price override, GST inclusion, stock status, and active scheme.
  - Build search, category and brand filters, product cards with a consistent packshot, pack size, case size, price, stock pill, and scheme badge.
  - Add a product detail sheet with the scheme explanation, case information, and quantity stepper.
  - Add loading skeletons, empty results, and an error state with retry.
  - Rationale: the catalogue is the retailer's primary screen and the first performance impression.
  - Dependencies: tasks 2 and 3.
  - Key considerations: 360px first, 44px tap targets, optimized images, Hindi aliases, and a first-load budget under three seconds on throttled 3G.

- [ ] 5. Build and test the pure scheme engine
  - Support buy-X-get-Y and slab-percent rules with active dates, eligibility, one best scheme per SKU, free-stock capping, and clear explanations.
  - Compute free goods from paid quantity only, apply slabs to the paid line subtotal, and never let free goods trigger another scheme.
  - Round money half-up at line level, reconcile the order total, and return the quantity gap for near-miss nudges.
  - Write a test matrix covering exact threshold, one below, overlapping rules, expired rules, free-stock shortfall, rounding, and multiple lines of the same SKU.
  - Rationale: the scheme engine is the brief's hard part and the most valuable deterministic logic to test.
  - Dependencies: task 2.
  - Key considerations: no database dependency, integer paisa, the sample biscuit and detergent cases, and an explanation for every applied or skipped scheme.

- [ ] 6. Build the cart, server re-pricing, and credit checks
  - Add a persistent client cart with quantity steppers, remove, free-good lines, scheme nudges, savings, subtotal, GST note, credit bar, and order note.
  - Use the same pure pricing rules for the retailer preview, but make the server the final authority at checkout.
  - Add a checkout endpoint that re-prices lines, checks stock, reserves stock atomically, checks available credit, and returns a clear domain error for stale prices, stock, or credit.
  - Add an idempotency key so a retried checkout does not create a duplicate order.
  - Rationale: this closes the retailer's core ordering loop and prevents the most common demo failures.
  - Dependencies: tasks 4 and 5.
  - Key considerations: free goods excluded from the payable credit check, stock restored on cancellation, and no silent quantity or price changes.

- [ ] 7. Build order creation, confirmation, history, and repeat order
  - Create orders in a transaction with a readable order number, status, totals, source, and audit entry.
  - Add a confirmation screen with order number, status, totals, GST breakup, and next step.
  - Add order history and order detail with a status timeline, line items, free goods, and scheme explanations.
  - Add one-tap repeat order that rebuilds the cart from a past order and re-validates current prices and stock.
  - Add cancellation before export with stock restoration and an audit record.
  - Rationale: the retailer needs to know the order reached the desk and to reuse regular orders.
  - Dependencies: task 6.
  - Key considerations: only valid status transitions, no hard deletion, and retailer-scoped history.

- [ ] 8. Build the AI capture pipeline with a deterministic fallback
  - Add a provider-agnostic AI adapter that requests strict structured output for raw line text, product words, quantity, unit, and confidence.
  - Send only the order text to the provider; never send phone, address, credit, or other retailer data.
  - Add a timeout, one retry, schema validation, input length limits, and provenance fields for model, prompt version, and raw text.
  - Build a deterministic fallback that extracts quantities and units and matches aliases, normalized names, fuzzy tokens, and past orders.
  - Implement high, medium, low, and unit-unclear confidence bands, with two ranked alternatives for uncertain lines.
  - Build a ten-message evaluation set including the brief's sample, a Hinglish variant, an unclear unit, an out-of-stock item, and a nonsense line.
  - Rationale: the AI must work when it is right, visibly fail when it is unsure, and still work when the provider is down.
  - Dependencies: tasks 2 and 4.
  - Key considerations: discard hallucinated SKUs, ground every candidate in the catalogue, and never auto-place an order.

- [ ] 9. Build the AI review, alternatives, and alias-learning UI
  - Add a paste box with example message chips and a clear privacy note.
  - Show each line with the original words, matched SKU, quantity, unit, confidence chip, two alternatives, and out-of-stock flag.
  - Ask case or piece when the unit is unclear; explain the case size and do not guess.
  - Allow edit, remove, and manual SKU search for low-confidence lines.
  - Add a single confirmation action that adds reviewed lines to the cart; never create an order from this screen.
  - Save retailer corrections as retailer-scoped aliases and expose the same correction path on the desk.
  - Add fallback and provider-error states that lead to manual catalogue ordering.
  - Rationale: human confirmation is the core safety requirement for the AI feature.
  - Dependencies: task 8.
  - Key considerations: no dead end, accessible line controls, no order before confirmation, and corrections that visibly help the next capture.

- [ ] 10. Build the order desk queue, detail, and credit decisions
  - Add a queue with status tabs, counts, filters for status, retailer, and date, and a compact row showing retailer, total, age, source, and credit flag.
  - Build an order detail with retailer terms, line items, scheme explanations, totals, credit position, raw message beside parsed lines, and an audit timeline.
  - Highlight low-confidence AI lines and allow the desk to correct a line, reject a line, or save an alias.
  - Add credit hold with a reason, approve or reject the hold, confirm, and cancel actions with role checks.
  - Rationale: the desk is the second core role and the place where AI mistakes are caught.
  - Dependencies: tasks 7 and 9.
  - Key considerations: desk-only actions, reasons on every decision, stock restoration on reject or cancel, and a layout that works on desktop and mobile.

- [ ] 11. Build the Tally export and export audit log
  - Generate Tally Prime XML sales vouchers from confirmed orders, with party ledger, order reference, item lines, quantities, rates, discounts, GST, and free goods.
  - Provide a CSV fallback with the same fields and document the format assumption.
  - Reject mixed selections, export only confirmed orders, sort lines deterministically, and reconcile totals.
  - Record format, file name, order count, checksum, actor, and timestamp; block a second export of the same order.
  - Authorize downloads to desk and admin only.
  - Rationale: replacing manual Tally entry is a core client ask and a concrete demo artifact.
  - Dependencies: task 10.
  - Key considerations: well-formed XML, escaping, paisa rounding, duplicate protection, and a downloadable file a reviewer can inspect.

- [ ] 12. Add optional depth behind feature flags only after the MVP is green
  - Timebox each stretch item and keep it independently shippable: photo capture, voice capture, offline salesman mode, van loading list, inactive-retailer dashboard, and admin CRUD.
  - Choose the highest-value item that fits the remaining time; do not start if the core is not deployed and documented.
  - Rationale: the brief rewards extra depth, but only when the core works and the submission is safe.
  - Dependencies: tasks 1 through 11 and a green deployed MVP.
  - Key considerations: no fake features, no regressions, and a clear note in the TDD about what was attempted and what was cut.

- [ ] 13. Polish the UI, states, accessibility, and PWA
  - Do a full design pass for spacing, type, colour, card hierarchy, price numerals, sticky cart, bottom navigation, and desk layout.
  - Verify every screen at 360px and on a desktop; add skeletons, empty states, error states, offline banner, success toasts, and disabled-button reasons.
  - Add the PWA manifest, icons, and installability; keep offline caching optional.
  - Add and verify a Hindi/English toggle for retailer-facing screens and key labels; verify Hindi and Hinglish AI input.
  - Check contrast, focus, labels, keyboard operation, and live announcements for async results.
  - Rationale: design counts as much as features, and the brief explicitly asks for a polished phone experience.
  - Dependencies: all core screens.
  - Key considerations: no dead buttons, no generic template look, and a calm palette with one accent.

- [ ] 14. Harden authorization, validation, rate limits, and secrets
  - Enforce the authorization matrix on every route and mutation, with retailer scoping derived from the session.
  - Validate every request body, query, and route parameter and reject unknown fields.
  - Add origin checks and SameSite cookies for mutation CSRF protection.
  - Add rate limits for OTP request, OTP verify, AI capture, and order creation.
  - Add security headers, redact phone numbers and order text from logs, scan for secrets, and audit dependencies.
  - Rationale: basic security is a must-have and role isolation is a demo requirement.
  - Dependencies: tasks 3 through 11.
  - Key considerations: negative tests for retailer cross-access and desk actions, no secrets in history, and no PII in the repository.

- [ ] 15. Write unit, integration, and end-to-end tests
  - Add Vitest unit tests for the scheme engine, pricing, GST, credit, AI normalization, alias matching, and the Tally builder.
  - Add integration tests for OTP, sessions, role guards, order lifecycle, idempotency, AI capture resolution, and export duplicate prevention.
  - Add Playwright end-to-end tests for the retailer manual order, the retailer AI order, the desk confirm and export flow, and cross-retailer isolation.
  - Add a deterministic fixture factory and validate that the seed produces the expected stock, prices, schemes, and credit positions.
  - Add a Lighthouse mobile check and the ten-message AI evaluation.
  - Rationale: tests protect the core logic and give the TDD concrete evidence.
  - Dependencies: the core features.
  - Key considerations: assert external behaviour, not private functions; run against a production build; keep CI fast enough to use daily.

- [ ] 16. Deploy, seed the demo environment, and verify the full flow
  - Deploy the app and managed Postgres, run migrations, run the idempotent seed, and configure environment variables by name only.
  - Create demo retailer and desk accounts, a fixed demo OTP for non-production, and a health check.
  - Smoke-test login, catalogue, manual order, AI order, credit hold, confirm, export, and repeat order on the production URL.
  - Check logs, error reporting, and cold-start behaviour; write a rollback note.
  - Rationale: a live app a reviewer can try is stronger than a local-only submission.
  - Dependencies: tasks 1 through 15.
  - Key considerations: no production secrets in the repository, seed idempotency, and a demo path that does not need database access.

- [ ] 17. Write the Technical Design Document, deployment.md, demo script, and submission ZIP
  - Put the GitHub URL at the top of the TDD and the live app URL beside it.
  - Cover architecture and rationale, data model, main flows, AI behaviour and failure handling, UI decisions, security, tests, what was cut, and what comes next.
  - Label every assumption from the PRD and roadmap, including GST treatment, case units, Tally format, and mock OTP.
  - Write `deployment.md` with local steps, deployment steps, environment variable names only, and demo login details.
  - Rehearse the three-minute demo, capture screenshots, create the ZIP with the TDD and `deployment.md`, and verify it is under 25 MB.
  - Rationale: the submission is judged on the documents as much as the code, and missing URLs or demo details are common failure modes.
  - Dependencies: all previous tasks.
  - Key considerations: public repository, readable commit history, no secrets, and a final production smoke test.

## Verification Criteria

- A retailer can log in with the demo phone and OTP, browse the catalogue, add 10 biscuit cases, see 1 free case, place an order, and see it in history in under 60 seconds.
- The sample message produces the correct biscuit, detergent, and tea lines; the tea line is flagged out of stock; an unclear unit asks for clarification instead of guessing.
- No order is created from an AI capture until a person confirms the reviewed lines.
- The scheme engine passes exact-threshold, one-below, overlap, expiry, free-stock-cap, rounding, and multiple-line tests with zero failures.
- A retailer cannot read or mutate another retailer's prices, credit, or orders, and receives 403 on confirm and export.
- The desk can place an order on credit hold, approve it, confirm it, export it to Tally, and see the export in the log.
- A second export of the same order is blocked, and the Tally XML is well-formed with totals matching the order.
- Every core screen has a loading, empty, and error state; every visible button works or is disabled with a reason.
- The layout works at 360px and on a desktop, with 44px tap targets and readable contrast.
- A retailer can switch retailer-facing screens between Hindi and English, and the choice persists for the session.
- Lighthouse mobile performance is at least 85; LCP is under 3 seconds on Slow 3G and under 2.5 seconds on 4G.
- OTP, AI, and order endpoints are rate-limited; malformed and oversized requests are rejected.
- No secrets or real personal data are in the repository, and logs do not contain phone numbers or raw order text.
- Unit, integration, and end-to-end tests pass in CI against a production build.
- The production demo login and the three-minute script work without manual database changes.
- The submission ZIP contains the TDD and `deployment.md`, is under 25 MB, and the TDD has the GitHub URL and live app URL.

## Potential Risks and Mitigations

1. **Scheme-engine edge cases consume a full day**
   - Impact: the cart and desk screens slip, and the demo loses its core flow.
   - Likelihood: Medium.
   - Mitigation: limit the MVP to two rule types, write the precedence rules and test matrix before the UI, and keep the engine pure and database-free.
   - Contingency: cut flat discounts and retailer-segment rules; ship only the sample buy-X-get-Y and slab cases.

2. **AI accuracy on Hindi and Hinglish is poor**
   - Impact: the AI feature looks fake or unusable, which hurts the strongest part of the submission.
   - Likelihood: Medium.
   - Mitigation: build a ten-message evaluation set on Day 4, use aliases and past orders, show two alternatives, and calibrate confidence honestly.
   - Contingency: run the deterministic parser as the primary path and present the LLM as an enhancement; manual review always remains.

3. **Scope creep from the must-have list**
   - Impact: no finished core, which is the most common failure mode in the brief.
   - Likelihood: High.
   - Mitigation: publish the cut list, gate every stretch item behind a green deployed MVP, and use feature flags.
   - Contingency: cut stretch items in the listed order and spend the time on tests and polish.

4. **Product imagery looks generic or mismatched**
   - Impact: the catalogue loses the designed, trustworthy feel the brief asks for.
   - Likelihood: Medium.
   - Mitigation: use one consistent illustrated packshot system with controlled colours, pack sizes, and typography.
   - Contingency: switch to clean typographic pack cards with strong price hierarchy.

5. **Slow 3G performance misses the budget**
   - Impact: the first-load requirement fails and the demo feels sluggish.
   - Likelihood: Medium.
   - Mitigation: server-render the catalogue, optimize images and fonts, split bundles, and measure on Day 2 and Day 6.
   - Contingency: reduce the first screen to a lighter catalogue and lazy-load below-the-fold images.

6. **Auth and OTP take longer than expected**
   - Impact: every retailer flow is blocked.
   - Likelihood: Low.
   - Mitigation: mock SMS from Day 1, use database sessions, and keep the flow to request, verify, and logout.
   - Contingency: use a fixed demo OTP for seeded numbers and defer production SMS entirely.

7. **The Tally format is wrong for the client's version**
   - Impact: the export is not usable, which weakens a core requirement.
   - Likelihood: Medium.
   - Mitigation: ship both XML and CSV, validate well-formedness and totals, and label the format assumption clearly.
   - Contingency: the reviewer can use the CSV fallback and the TDD explains the assumption.

8. **The AI provider key, quota, or latency fails during the demo**
   - Impact: the headline feature appears broken.
   - Likelihood: Medium.
   - Mitigation: abstract the provider, test the fallback path, and deploy early to catch quota and network issues.
   - Contingency: run the demo on the deterministic fallback and state honestly that the provider is unavailable.

9. **A security or authorization bug leaks another retailer's data**
   - Impact: a critical trust failure in a product handling prices and credit.
   - Likelihood: Low.
   - Mitigation: write the authorization matrix on Day 1, derive retailer scope from the session, and add negative tests for every role.
   - Contingency: fix before any polish work and cut non-core features to buy the time.

10. **Production deployment or migration fails on Day 7**
    - Impact: the live demo is unavailable and the submission is weaker.
    - Likelihood: Low.
    - Mitigation: deploy a preview on Day 1, run migrations and seed early, and keep a local Docker Compose path.
    - Contingency: fall back to a local demo with a recorded walkthrough and document the limitation honestly.

## Alternative Approaches

1. **Separate single-page app and API service**
   - Description: a React SPA served separately from an Express or Fastify API.
   - Pros: clean frontend and backend separation, independent scaling, familiar to some teams.
   - Cons: two deployments, CORS, duplicated auth handling, more configuration, and slower iteration in a seven-day build.
   - Recommendation: not chosen. The Next.js monolith gives server rendering, one auth boundary, and one deploy for the same product.

2. **Server-side draft cart instead of a client cart with server re-pricing**
   - Description: persist every cart mutation as a draft order on the server.
   - Pros: cross-device continuity, simpler server authority, easier recovery.
   - Cons: more endpoints, more state, more failure modes, and unnecessary for a single-phone retailer in the MVP.
   - Recommendation: not chosen for the MVP. A local cart with server re-pricing at checkout is simpler and still safe; a server draft is a natural next step.

3. **LLM-first AI capture with the model choosing SKUs directly**
   - Description: send the catalogue and message to the model and accept its SKU choices.
   - Pros: less matching code, potentially better language understanding.
   - Cons: hallucinated SKUs, poor catalogue grounding, unpredictable cost, and weak confidence calibration.
   - Recommendation: not chosen. The hybrid approach uses the model for messy language and a deterministic matcher for catalogue truth, with human confirmation as the final gate.

4. **CSV-only Tally export**
   - Description: export a flat CSV that the office maps into Tally manually.
   - Pros: simple, portable, easy to inspect.
   - Cons: still requires manual mapping, weaker demonstration of automation.
   - Recommendation: not chosen as the primary path. XML is the primary export and CSV is the fallback because the exact Tally format is an assumption.

5. **Prisma instead of Drizzle**
   - Description: use Prisma for schema, migrations, and a generated client.
   - Pros: mature tooling, familiar developer experience, strong studio.
   - Cons: heavier runtime, less direct SQL control, and slower cold starts in some deployments.
   - Recommendation: Drizzle is chosen for a small schema, SQL-like control, and a light runtime. The choice is reversible and not visible to users.

6. **Build an admin CMS before the core flow**
   - Description: give the office a full CRUD interface for products, prices, stock, and schemes.
   - Pros: master data can be maintained without a developer.
   - Cons: large surface, many forms, and not part of the core slice; seed data already proves the flow.
   - Recommendation: not chosen for the MVP. Seed the data and leave admin CRUD as a stretch item.

## Assumptions

- The seven-day build starts on 2 November 2026 and the submission is due on 8 November 2026; the real deadline may differ.
- One developer, solo, with AI assistance.
- The core slice is the priority; all optional depth is stretch and may be cut.
- Dealer prices are GST-inclusive by default, with a per-product flag to show an exclusive price if needed.
- The ordering unit is the case; "peti" maps to case. Piece-level ordering is explained but not supported in the MVP.
- Out-of-stock lines are blocked at checkout and flagged in AI review rather than silently accepted.
- Credit limit and outstanding are seeded; an over-limit order becomes a credit hold with no payment ledger.
- Tally export assumes Tally Prime XML, with a CSV fallback because the exact format is not specified.
- OTP delivery is mocked, with a fixed demo OTP for seeded numbers outside production.
- Retailer-facing core screens support a Hindi/English toggle; desk and admin screens remain English, and full content translation is stretch.
- The catalogue is expanded from three sample SKUs to about 32 realistic, fictional SKUs across four brands.
- All seed names, phone numbers, addresses, and orders are fictional.
- Deployment uses Vercel and a managed Postgres, with a local Docker Compose option.
- The scheme engine supports buy-X-get-Y and slab percent only.
- Stock is reserved at order placement and restored on cancellation; desk confirmation does not reserve it again.

## Dependencies

- Node.js and a package manager available on the development machine.
- PostgreSQL, either managed or through Docker Compose.
- An AI provider API key and model name, configured through environment variables.
- A GitHub account and a public repository for the submission.
- A Vercel account and a managed Postgres account for the live demo.
- A mock SMS path for OTP; no real SMS provider is required for the demo.
- Fictional product images or locally generated packshots.
- A browser and Lighthouse for the performance check.

## Notes

- Commit in small, meaningful steps after each task so the repository history tells the story.
- Deploy a preview on Day 1 and redeploy after every milestone; do not leave deployment to Day 7.
- Keep the scheme engine and AI matcher free of database and UI dependencies so they stay fast to test.
- Record the ten-message AI evaluation as a repeatable test, not a one-off manual check.
- The demo script is a product requirement: if a flow cannot be shown in three minutes, simplify it.
- If a stretch item starts to threaten the core, stop and update the TDD's cut list instead of rushing it.
- The final submission needs the GitHub URL at the top of the TDD and a working demo login; verify both before zipping.
