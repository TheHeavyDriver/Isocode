# Agent Instructions — Sahaj Order

## Read before working

At the start of every session, read:

1. `memory.md` — current state, change log, decisions, open questions, next actions.
2. `architecture.md` — module boundaries, data model, flows, and trade-offs.
3. `PRD.md` — product requirements and scope.

## Keep memory current

- After every material change, add a new `CHG-####` row at the top of the change log in `memory.md`. Do not wait for the user to ask.
- Include the date, type, summary, files, rationale, verification, and architecture impact.
- Update "Current state", "Open questions", and "Next actions" when they change.
- If the change affects module boundaries, the data model, external dependencies, deployment, or a key decision, update `architecture.md` in the same task and note it in the memory entry.
- Do not rewrite past entries. If a correction is needed, append a new entry that references the original.
- Include a verification note for every change: a command, a test, or a manual check.

## Project guardrails

- The chosen problem is **A — distributor order capture**. Do not re-open the choice.
- Build the core slice first. Photo/voice capture, offline salesman mode, van loading, the 14-day dashboard, and admin CRUD are stretch items.
- Keep the scheme engine, pricing, AI matcher, and Tally builder pure and testable.
- The server is authoritative for prices, stock, credit, and totals.
- No AI-created order may exist without human confirmation.
- Retailer data is always scoped from the session, never from client-supplied IDs.
- Do not put secrets or real personal data in the repository.
- No feature is done without loading, empty, and error states where it applies.
- Commit in small, meaningful steps.

## Useful commands

The application is not scaffolded yet. Once it is, the expected commands will be documented in `README.md` and `deployment.md`. Until then, the planning documents are the source of truth.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
