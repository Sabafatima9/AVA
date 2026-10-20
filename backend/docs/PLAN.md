# Execution Plan: Agentic Support Backend

| Field | Value |
|---|---|
| Owner | ADMIN (appointed by the human on 2026-10-10) |
| Spec | `backend/docs/SRS.md` (v0.4) |
| Applies to | BUILDER (backend-agent-1), SUPERVISOR (backend-agent-2) |
| Status | Active. Current milestone: **M1 Foundation** |

This file is the schedule and the work orders. The SRS says *what* to build; this file says *in what order*, *what counts as done*, and *how it is checked*. If the two disagree, ask ADMIN in `COMMS.md`. Do not pick one yourself.

---

## 1. Roles

| Role | Who | Does | Does not |
|---|---|---|---|
| ADMIN | Planner appointed by the human | Owns `docs/SRS.md` and `docs/PLAN.md`. Issues work orders, answers `QUESTION`s, approves scope changes, relays human decisions, runs the milestone gate. | Write source code, tests, or migrations. |
| BUILDER | backend-agent-1 | Implements work orders. Owns every other file in `backend/` except `agent.md`. | Change requirements, thresholds, or this plan. Propose changes with a `QUESTION` to ADMIN instead. |
| SUPERVISOR | backend-agent-2 | Verifies each work order by running its checks. Posts `VERDICT`. Owns `backend/agent.md`. | Edit builder files. |

Precedence: a SUPERVISOR `VERDICT: ISSUE` stays blocking. If BUILDER disagrees with an issue, it posts a `QUESTION` to ADMIN, and ADMIN decides. ADMIN can also post a blocking `VERDICT: ISSUE` at a gate.

## 2. Workflow per work order (WO)

1. BUILDER posts a short `PLAN` naming the WO id, files it will touch, and any choice the WO leaves open. No code before this entry.
2. BUILDER implements the WO. One WO at a time, in the order listed.
3. BUILDER posts `STATUS`: the WO id, files changed, the pinned dependency versions added (with publish dates), and the exact verify commands.
4. SUPERVISOR **runs** the verify commands (not just reads), checks every acceptance item, and posts `VERDICT: OK` or `VERDICT: ISSUE` within ~5 minutes.
5. On `OK`, BUILDER starts the next WO. On `ISSUE`, BUILDER fixes the issue, posts `ACK` listing each point, and waits for a new `VERDICT`.
6. After the last WO of a milestone, ADMIN runs the gate (§5) and posts `GATE: PASS` or `GATE: FAIL`. Do not start the next milestone before `GATE: PASS`.

## 3. Rules that apply to every WO

| # | Rule |
|---|---|
| G1 | **Dependencies:** pin exact versions (no `^` or `~`). Each version must be published at least 7 days before it is added (`npm view <pkg> time`). Example: `hono` 4.13.13 (2026-10-08) is too new, so take the newest release from 2026-10-03 or earlier. List versions and dates in the STATUS entry. |
| G2 | **Secrets:** never in code, tests, fixtures, logs, `COMMS.md`, or `.env.example`. Real values only in `backend/.env` (gitignored). Recorded Drex fixtures must not contain the API key. |
| G3 | **Tests:** `npm test` runs unit tests only. It needs no network and no Docker. Database tests go in `npm run test:integration` (local Supabase). Live API tests go in `npm run test:live` (needs `NACE_LIVE=1`). |
| G4 | **Traceability:** every `describe` title names the SRS ids it covers, for example `describe('FR-VER-3 generic lookup failure', ...)` (NFR-MAINT-6). |
| G5 | **Scope:** only files inside `backend/`. `backend/agent.md`, `docs/SRS.md`, and `docs/PLAN.md` are read-only for BUILDER. |
| G6 | **COMMS discipline:** re-read the whole file right before appending. Append by anchoring on the file's current last lines, never in the middle. If two entries collide on a SEQ number, the next author notes it in a new entry; nobody edits old entries. |
| G7 | **Portability:** `src/app.ts` and everything under `src/` except `src/server.ts` and `scripts/` must not import Node-only modules directly (`node:fs`, `node:net`, and so on). Inject them (NFR-PORT-1). |
| G8 | **No silent spec changes:** if something in the SRS turns out to be wrong or impossible, stop and ask ADMIN. |

## 4. Human dependencies

| Needed for | Item | Status | Fallback until answered |
|---|---|---|---|
| M1 WO-1.5 to WO-1.7 database checks | Docker Desktop running (needed for `supabase start`) | **Running** (Docker 29.5.2, checked by ADMIN on 2026-10-10) | |
| M2 live demo | OQ-1 LLM provider + key | **Decided (SRS v0.4):** Google AI Studio, `gemma-4-31b-it`, no fallback, thinking off by default (SRS §6.4.1). **Key is in** `backend/.env`. | `ScriptedProvider` (deterministic) for all tests |
| M2 WO-2.3 | OQ-2 website schema | Open | Default mapping = SRS §7.2 |
| M3 real codes | OQ-4 email provider | Open | `console` email sender |
| M4 refunds | OQ-3 payment provider | Open | `manual` (`pending_manual`) |
| M4 policies | OQ-5 business defaults | Open | SRS §9 defaults |
| M5 handoff | OQ-6 escalation destination | Open | Webhook + admin API |

---

## 5. Milestones and gates

| Milestone | Work orders | Gate check (run by ADMIN) |
|---|---|---|
| M1 Foundation | WO-1.1 to WO-1.7 | `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `NACE_LIVE=1 npm run test:live`, `npx supabase db reset`, `npm run test:integration`, `npm run doctor` |
| M2 Conversations | WO-2.1 to WO-2.8 | M1 checks + scenarios S02, S03, S08 (same-turn escalation), S09 (tone and timeline part) |
| M3 Verification | WO-3.1 to WO-3.5 | + S01, S05, S12 (scope part), S04 and S06 up to L2 |
| M4 Decisions and actions | WO-4.1 to WO-4.7 | + S04, S06, S07, S09 (goodwill), S10, S13, S14, S15 |
| M5 Escalation and admin | WO-5.1 to WO-5.9 | + S08 (full packet), S11, S16 |
| M6 Hardening | WO-6.1 to WO-6.9 | SRS §13.5 definition of done |

M1 and M2 work orders are fully specified below. M3 to M6 are listed with scope and key checks; ADMIN adds full acceptance items at each gate, using what earlier milestones show.

---

## 6. M1 Foundation

Order: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7. WO-1.4 does not need Docker; do it before the database work if Docker is still down.

### WO-1.1 Project scaffold

- **Files:** `package.json`, `package-lock.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `.env.example`, `README.md`.
- **Do:**
  - Node 22, `"type": "module"`, TypeScript strict with `noUncheckedIndexedAccess`, module `NodeNext`.
  - Scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`, `test:integration`, `test:live`, `doctor`, `db:grants`, `db:set-role-password`.
  - `.env.example` lists every variable in SRS §13.3 plus `DATABASE_ADMIN_URL`, with placeholder values only.
  - Rewrite `README.md` as UTF-8. The current file is UTF-16 and contains only `# Shahzeb`. Add setup and run steps.
- **Accept:** `npm ci` is clean; typecheck, lint, and test pass, and at least one real test exists; `backend/.env` is still ignored.
- **Verify:** `cd backend && npm ci && npm run typecheck && npm run lint && npm test && git check-ignore .env`

### WO-1.2 Config and logger

- **Files:** `src/config/env.ts`, `src/observability/logger.ts`, `tests/unit/config.test.ts`, `tests/unit/logger.test.ts`.
- **Do:**
  - Zod schema for SRS §13.3 with defaults (`NACE_MODEL=drex-v1.5`, `NACE_MAX_IN_FLIGHT=8`, `NACE_RPM=120`, `PORT=8787`).
  - Required variables are declared per feature. Startup fails with the **names** of missing variables, never their values.
  - pino logger with redaction for `authorization`, `x-customer-token`, and any key matching `/key|token|secret|password|pepper/i`. A value guard masks any string containing `nace_sk_` or `sb_secret_`.
- **Accept:** a test proves a missing variable throws with its name; a test proves `nace_sk_...` and `sb_secret_...` never appear in log output. (NFR-SEC-2)
- **Verify:** `npm test`

### WO-1.3 HTTP skeleton

- **Files:** `src/app.ts`, `src/server.ts`, `src/api/middleware/{request-id,error,cors,security-headers}.ts`, `src/api/routes/system.ts`, `tests/unit/app.test.ts`.
- **Do:**
  - `createApp(deps)`, where `deps` contains a config and a `dbPing()` function.
  - `x-request-id` on every response. Error envelope per SRS Appendix A. CORS allowlist from `ALLOWED_ORIGINS`. Headers per NFR-SEC-8.
  - `GET /health` returns 200 `{ "status": "ok" }`. `GET /ready` returns 200 when `dbPing` succeeds, otherwise 503 `unavailable`.
  - `server.ts` handles graceful shutdown (NFR-REL-5).
- **Accept** (tested with `app.request()`):
  - Headers are present.
  - A disallowed origin gets no `access-control-allow-origin`.
  - An unknown route returns the 404 envelope.
  - A thrown error returns the 500 envelope with `request_id`.
  - `/ready` returns 503 when the ping fails.
- **Verify:** `npm test`; `npm run dev` and `curl -i http://localhost:8787/health`

### WO-1.4 Drex client

- **Files:** `src/nace/drex-client.ts`, `src/nace/schemas.ts`, `tests/unit/drex-client.test.ts`, `tests/live/drex.live.test.ts`.
- **Do:** implement SRS IF-DREX-1 to IF-DREX-8.
  - `evaluate({ state, questions, mode: 'interactive' | 'background', signal? })` returns typed answers plus `meta`: `request_id`, `model`, `input_tokens`, `evaluation_time_ms`, `round_trip_ms`, `attempts`.
  - `listModels()`.
  - Typed errors: `DrexAuthError` (401), `DrexCreditError` (402), `DrexInvalidRequestError` (422, with `issues`), `DrexRateLimitError` (429), `DrexOverloadedError` (529), `DrexUnavailableError` (timeout, network, budget).
  - Validate before sending (SRS C3): 1–512 questions, body ≤ 1 MiB, non-empty ids, a `noul` has instructions or criteria, a `choice` has a non-empty criteria object, a `score` has ≥ 2 levels, no `data:` media URLs.
- **Accept** (mocked `fetch`, fake timers):
  - 429, 500, 529, and network errors retry and honor `retry-after-ms`.
  - 401, 402, and 422 are never retried.
  - Interactive mode enforces the 6 s total budget and retries only when the wait fits.
  - Background mode makes 3 attempts with backoff.
  - The semaphore caps concurrency at `NACE_MAX_IN_FLIGHT`; the RPM guard works.
  - A missing answer id raises an error; the response is Zod-validated.
  - Logs carry `request_id`; the key is never logged.
  - Live test: `/v1/models` lists `drex-v1.5`, and one `noul` call returns a value in [0, 1].
- **Verify:** `npm test`; `NACE_LIVE=1 npm run test:live`

### WO-1.5 Supabase project and `support` schema

- **Files:** `supabase/config.toml`, `supabase/migrations/*_support_schema.sql`, `*_support_roles.sql`, `*_support_defaults.sql`, `supabase/seed.sql`, `tests/integration/schema.test.ts`.
- **Do:**
  - Every table in SRS §7.3 except the catalog views (those are generated in WO-1.6), with check constraints for enum values, indexes, and foreign keys within `support`.
  - RLS enabled on every `support` table, with no policies.
  - `support.audit_log` is append-only: revoke UPDATE, DELETE, and TRUNCATE, and add a trigger that raises an error on UPDATE or DELETE.
  - Roles `support_agent` and `support_catalog_ro` are created with no password (it is set by script).
  - `support` is not listed in `config.toml` API schemas.
  - Defaults migration: a v1 row in `support.policies` for every decision type in SRS §9.3, plus `support.settings` defaults (SRS §9; assistant "Ava").
  - `seed.sql` is for dev and test only. It creates the reference store (SRS §7.2) and fixtures with fake data. A header comment maps each fixture to the scenarios S01–S16 that use it.
  - Fixtures must include:
    - Customers: a good-history customer, a customer with 3 not-received claims in 12 months, and a guest-only email.
    - Orders: unfulfilled; processing; shipped inside the grace period; shipped 3+ days past ETA; delivered inside the return window; delivered outside it; cancelled; one order with a duplicate captured payment.
    - Knowledge articles: shipping, returns, warranty, payment methods.
- **Accept:**
  - `npx supabase db reset` succeeds twice in a row.
  - RLS is on for every `support` table.
  - UPDATE on `support.audit_log` fails.
  - The `anon` and `authenticated` roles cannot select from `support.*`.
  - Every policy decision type has an active v1 row.
- **Verify:** Docker running, then `npx supabase start && npx supabase db reset && npm run test:integration`

### WO-1.6 Mapping and grant scripts

- **Files:** `config/commerce-mapping.json`, `src/commerce/mapping.ts`, `scripts/db-grants.ts`, `scripts/db-set-role-password.ts`, `tests/unit/mapping.test.ts`, `tests/integration/grants.test.ts`.
- **Do:**
  - The default mapping follows SRS §7.2, including the status map. The Zod schema rejects unknown keys.
  - Identifiers must match `^[a-z_][a-z0-9_]*$` and are always double-quoted.
  - `db-grants` generates:
    - SELECT on mapped columns.
    - Column-level UPDATE only on `orders.status`, `cancelled_at`, `cancel_reason`, `shipping_address` (and `payment_status` if mapped).
    - INSERT on refunds, returns, discount codes, and order notes; INSERT on orders and order items for replacements.
    - The `support.v_catalog_*` views, with SELECT on them for `support_catalog_ro` only.
  - `db-grants` prints SQL by default; `--apply` runs it through `DATABASE_ADMIN_URL`.
  - `db-set-role-password` reads the passwords from env and never prints them.
- **Accept:**
  - A bad mapping fails with a clear message.
  - After `--apply`, `support_agent` can read `orders`, cannot read `auth.users`, and cannot update `orders.total`.
  - The catalog role can read only `v_catalog_*`.
- **Verify:** `npm test`; Docker running, then `npm run db:grants -- --apply && npm run test:integration`

### WO-1.7 Doctor

- **Files:** `scripts/doctor.ts`, `src/ops/doctor.ts` (reused later by `GET /v1/admin/doctor`), `tests/unit/doctor.test.ts`.
- **Do:** print one line per check, marked PASS, WARN, or FAIL:
  - env valid;
  - DB connects as `support_agent`;
  - support migrations present;
  - every mapped table and column exists;
  - grants sufficient;
  - Drex `GET /v1/models` accepts the key and lists `NACE_MODEL` (no credit spent);
  - Supabase Auth reachable (WARN if not configured);
  - LLM reachable (WARN "not configured" until OQ-1).
  
  Exit 0 only if there is no FAIL.
- **Accept:** DB down → FAIL and exit 1; bad NACE key → FAIL; no secret printed.
- **Verify:** `npm run doctor`

---

## 7. M2 Conversations

### WO-2.1 Security utilities

Masking for emails, phones, and street addresses (best effort); PAN detection with a Luhn check and redaction; client token generation and SHA-256 hashing; HMAC helper; constant-time compare.
**Covers:** FR-CONV-13, NFR-PRIV-1, NFR-SEC-5, NFR-SEC-6.
**Accept:** a PAN never survives into stored text, logs, or outbound payloads.

### WO-2.2 Support repositories

Repositories for conversations, messages, signals, tool calls, and audit. Per-conversation sequence numbers, `client_message_id` idempotency, and serialization of concurrent turns on one conversation.
**Covers:** FR-CONV-3, FR-CONV-4, FR-CONV-10.
**Accept:** a re-sent `client_message_id` returns the original result without a second turn.

### WO-2.3 Commerce adapter, read side

Canonical types; the Supabase adapter (postgres.js, `prepare: false`); orders, items, shipments, payments, refunds, products, variants; customer profile in ≤ 3 queries. A required `Scope` object on every customer-data method, so scope is enforced in SQL.
**Covers:** FR-DATA-1 to FR-DATA-5, FR-DATA-7, FR-VER-8, FR-SIG-6.
**Accept:** an out-of-scope order returns `not_found`; injection strings in every argument are inert.

### WO-2.4 QS-TURN and analyzer

The `turn.v1` state builder and question set (SRS §8.2); normalized signals (intent margin, p2 + p3, trends); degraded neutral defaults. Capture live fixtures with `NACE_LIVE=1` into `tests/fixtures/drex/` (redacted, no key).
**Covers:** FR-SIG-1 to FR-SIG-4, FR-SIG-7, FR-SIG-9.
**Accept:** builder snapshot tests pass; a Drex failure yields a `degraded` row, not an error.

### WO-2.5 LLM adapter

The `LlmProvider` interface (SRS §6.4.1), an OpenAI-compatible implementation, and a `ScriptedProvider` that replays deterministic tool-call scripts for tests.

Target: Google AI Studio, `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, `POST /chat/completions`, model `LLM_MODEL=gemma-4-31b-it`, no fallback (`LLM_FALLBACK_MODEL` empty), `LLM_THINKING=off` by default.

- **Thinking off by default** (SRS §6.4.1). Every request carries `extra_body.google.thinking_config.thinking_level`: `minimal` when `LLM_THINKING=off`, `high` when `on`. Never send `reasoning_effort` or `thinking_budget`.
- Strip any `<thought>…</thought>` block from `content` before emitting text deltas, including blocks split across chunks. Never store or log thought text. Count thought tokens as `total - prompt - completion` in usage.
- Streaming with tool calls. Tool-call arguments may arrive in fragments; assemble them before the Zod check. Keep each tool call's `extra_content` (thought signature) and send it back unchanged in the history.
- Usage comes in the final stream chunk (`stream_options.include_usage: true`); record it per call.
- Errors may arrive as an array-wrapped Google envelope (`[{ "error": { code, message, status } }]`) as well as the OpenAI shape; parse both. On 5xx or timeout, retry once on the primary, then once on the fallback model if one is set. Never retry 4xx.
- Small models sometimes emit bad JSON for tool arguments. On a Zod failure, return the validation error to the model as the tool result once so it can correct itself. If it fails again, stop the tool loop and use a safe reply plus a human offer.
- Live test `tests/live/llm.live.test.ts`, runs only with `LLM_LIVE=1`:
  1. `GET /models` lists `models/gemma-4-31b-it`.
  2. One streamed call with one tool and thinking off returns a valid tool call, and usage shows 0 thought tokens. If the model cannot call tools, report it to ADMIN with a `QUESTION`; do not switch models yourself.
  3. A tool round trip (assistant tool call with its `extra_content`, then the tool result) returns a text reply with no `<thought>` in it.
- Unit tests (mocked `fetch`): the thinking field is sent on every request for both `off` and `on`; a `<thought>` block split across chunks never reaches a text delta.

**Accept:** the orchestrator tests run entirely on `ScriptedProvider`; the live test passes; thought text never reaches a text delta, a stored message, or a log; the API key never appears in logs.

### WO-2.6 L0/L1 tools and registry

The tools `search_policies`, `search_products`, `get_product_availability`, `verify_order`, `get_order`, `get_tracking`, plus a minimal `escalate_to_human` (row + state only; the full packet comes in M5). The registry filters tools by verification level and state. Arguments are Zod-validated, and results include a `display` field.
**Covers:** FR-KB-1 to FR-KB-3, FR-VER-2, FR-VER-3, FR-VER-6, SRS §6.4.2.

### WO-2.7 Orchestrator

The turn pipeline (SRS §3.2), prompt assembly (SRS §6.4.1), mood directives (SRS §9.4), slot tracking, stall detector, caps, state machine, rolling summary, and escalation triggers E1, E4, and E7.
**Covers:** FR-CONV-6 to FR-CONV-9, FR-CONV-12, FR-SIG-5.

### WO-2.8 Public API

The endpoints in SRS §6.1.2 (except the verification and auth endpoints, which come in M3); SSE events (SRS §6.1.4); long polling; rate limits (SRS §6.1.6); CSAT; close; AI disclosure in the greeting.
**Covers:** FR-CONV-1, FR-CONV-2, FR-CONV-5, FR-CONV-7, FR-CONV-11, FR-CONV-14.

**M2 gate scenarios:** S02, S03, S08 (escalated in the same turn, email not asked again), and S09 (fast-lane tone and timeline, no goodwill yet).

---

## 8. M3 to M6 (scope; acceptance detail added at each gate)

### M3 Verification

| WO | Scope | Covers |
|---|---|---|
| 3.1 | Session verification: `getClaims()` with legacy fallback, JWKS cache, `X-Customer-Token`, `/auth` endpoint | FR-VER-1 |
| 3.2 | `EmailSender` interface + `console` implementation, `verification_code` template | FR-NOT-1 (part) |
| 3.3 | One-time codes: email on file only, email-only path, endpoints and tools | FR-VER-4, FR-VER-5 |
| 3.4 | Rate limits, lockouts, timing equalization, audit events, human offer on failure | FR-VER-3, FR-VER-7, FR-VER-11, FR-VER-12 |
| 3.5 | L2 tools (`list_my_orders`) + security suite (scope escape, enumeration) | FR-VER-8, FR-VER-9 |

### M4 Decisions and actions

| WO | Scope | Covers |
|---|---|---|
| 4.1 | Policy and settings loader, versioning | FR-DEC-8 |
| 4.2 | Hard rules (SRS §9.2) + `check_eligibility` tool | FR-DEC-4 |
| 4.3 | Decision sets NR, DMG, CANCEL, ADDR, GOODWILL + live fixtures; re-check SRS §9.3 thresholds against the fixtures and report to ADMIN | FR-DEC-5 |
| 4.4 | Engine: thresholds, uncertainty rule, intent consistency, caps, degraded → review, persistence | FR-DEC-1 to 3, 6, 7, 9 to 12, 14 |
| 4.5 | Proposals and confirmation (structured, and `confirms_pending_action` ≥ 0.90) | FR-ACT-1 to FR-ACT-3 |
| 4.6 | Executor (one transaction, `FOR UPDATE`, idempotency) + all action handlers + `manual` payment adapter | FR-ACT-4 to FR-ACT-8 |
| 4.7 | Basic outbox + confirmation and address-change emails | FR-ACT-9, FR-ACT-10, FR-NOT-2 |

### M5 Escalation and admin

| WO | Scope | Covers |
|---|---|---|
| 5.1 | Triggers E1–E9, handoff packet, priority | FR-ESC-2, FR-ESC-3, FR-ESC-9 |
| 5.2 | Escalated-state behavior, human replies, handback | FR-ESC-4 to 6, FR-ESC-8 |
| 5.3 | Review queue and UC-11 flows | FR-ESC-7 |
| 5.4 | Admin API (SRS §6.2) | FR-ADM-1 to 5, FR-ADM-7 |
| 5.5 | Webhook signing + outbox worker | FR-NOT-2 to FR-NOT-4 |
| 5.6 | Metrics | FR-ANA-1, FR-ANA-2 |
| 5.7 | Decision replay | FR-DEC-13 |
| 5.8 | Privacy export, erasure, and retention job | FR-ADM-8, NFR-PRIV-2, NFR-PRIV-3 |
| 5.9 | Template mode for LLM outage (SRS §12) | S16 |

### M6 Hardening

| WO | Scope |
|---|---|
| 6.1 | Full scenario suite S01–S16 green on `ScriptedProvider` |
| 6.2 | Fault-injection suite (Drex 429/529/timeout/402, LLM down, DB failure during an action) |
| 6.3 | Security suite complete (SRS §11, T1–T12) |
| 6.4 | OpenAPI at `/v1/openapi.json` |
| 6.5 | Dockerfile + README run guide |
| 6.6 | Coverage thresholds enforced in `vitest.config.ts` (NFR-MAINT-4) |
| 6.7 | `npm audit --omit=dev` clean; secret scan of git history |
| 6.8 | FR-SQL guarded catalog query (go/no-go decided at the M5 gate) |
| 6.9 | QS-CSAT predicted satisfaction (Should) |

---

## 9. Plan log

| Date | Change |
|---|---|
| 2026-10-10 | Plan created by ADMIN. Moved S01 from M2 to M3 (it needs session verification). Added `DATABASE_ADMIN_URL` (setup only) for grant scripts. |
| 2026-10-10 | Docker running, so WO-1.5 to 1.7 are unblocked. LLM decided: Command Code + `deepseek/deepseek-v4-flash`, fallback `gpt-6-luna`; WO-2.5 updated. TypeScript stays on 5.x (5.9.3) per SRS §13.1. |
| 2026-10-10 | Human changed OQ-1: Google AI Studio, `gemma-4-31b-it`, no fallback, thinking off by default (`LLM_THINKING`). SRS v0.4; WO-2.5 updated. Key placed in `backend/.env`. |
