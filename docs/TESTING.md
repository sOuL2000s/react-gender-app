# 🧪 Testing Guide

> Part of [Project Documentation](./README.md). See also: [BACKEND-API.md §3](./BACKEND-API.md#3-api-contract), [RUNBOOK.md Appendix D](./RUNBOOK.md#appendix-d--troubleshooting--common-scenarios).

## Table of contents
1. [Manual QA — Frontend](#1-manual-qa--frontend)
2. [Manual QA — Backend (per mode)](#2-manual-qa--backend-per-mode)
3. [Integration scenarios](#3-integration-scenarios)
4. [Suggested automated tests](#4-suggested-automated-tests)
5. [Known Limitations & Recommended Improvements](#5-known-limitations--recommended-improvements)
6. [Appendix E — Definition of Done](#appendix-e--definition-of-done-per-feature)
7. [Appendix I — Onboarding Path](#appendix-i--onboarding-path-new-contributor-30-minutes)

---

## 1. Manual QA — Frontend

### Routing
- [ ] `/` redirects to `/register` (URL changes; replace, not push).
- [ ] `/register` renders the Create Account form.
- [ ] `/login` renders the Sign In form.
- [ ] Clicking "Sign In" on Register navigates to `/login`; clicking "Create Account" on Login navigates to `/register`.
- [ ] Unknown route (e.g. `/foo`) → blank page (no 404 route yet).

### Register page
- [ ] All six fields render: First Name, Last Name, Email, Password, Age, Gender.
- [ ] All are `required`; empty submit is blocked.
- [ ] Email uses `type=email` → invalid emails blocked.
- [ ] Age uses `type=text` + `pattern="[0-9]*"` → non-digit input blocked on submit.
- [ ] Gender is a `<select>` with empty placeholder + Male/Female/Other.
- [ ] Submit with backend up (DB mode) → status `Registration successful!` and all fields clear.
- [ ] Submit with backend up (no-DB mode) → status `Registration successful!` and all fields clear. ✅ *(CORS headers are now set by `simpleHandler`.)*
- [ ] Backend down → status `Error: Failed to fetch`.
- [ ] Backend returns non-2xx → status `Error: HTTP <code>`.
- [ ] Status message persists until next submit.

### Login page
- [ ] Email + Password + Sign In render.
- [ ] Required-field validation blocks empty submit.
- [ ] Submit → status shows `Logging in...` then `Login successful!` after ~1s.
- [ ] **No network request** is made on submit (verify in DevTools → Network).
- [ ] Stays on `/login` after success (no redirect).

### Styling / theming
- [ ] Split-panel layout with purple branding on left, white form on right.
- [ ] Background is dark slate gradient; card has rounded corners and deep shadow.
- [ ] At ≤768px, panels stack vertically; card max-width 440px.
- [ ] Focus states on inputs show purple border + glow.
- [ ] Subtitle/status/footer colors legible in both light and dark OS themes.
- [ ] **Conflict check:** page text alignment and `#root` width consistent (index.css vs App.css overlap — see §5 item 12).

### Build & lint
- [ ] `npm run lint` exits 0.
- [ ] `npm run build` produces `dist/` with `index.html`, hashed JS/CSS, `favicon.svg`, `icons.svg`.
- [ ] `npm run preview` serves the build; routes `/register` and `/login` work (needs history fallback — verify on your host).

## 2. Manual QA — Backend (per mode)

### No-DB mode (`DATABASE_URL` unset)
- [ ] Server logs `DATABASE_URL not set, using simple handler (no DB)`.
- [ ] Logs `Listening on :8080 (no DB)`.
- [ ] `POST /register` valid JSON → `200 {"status":"ok","name":…}`.
- [ ] `POST /api/user` valid → `200 {"status":"ok","name":…}` (alias).
- [ ] `GET /register` → `405 method not allowed`.
- [ ] `OPTIONS /register` with `Origin` → `204` + `Access-Control-Allow-Origin: *`.
- [ ] Invalid JSON → `400 bad json`.
- [ ] `age` as string/empty → `400 bad json`.
- [ ] `GET /health` → **404**.
- [ ] Response headers include `Access-Control-Allow-Origin: *` (verifies inline CORS in `simpleHandler`).

### DB mode (`DATABASE_URL` set, reachable)
- [ ] Server logs `Listening on :8080` (no "no DB" suffix).
- [ ] Table `users` exists (`\d users` in psql) after first start.
- [ ] `POST /register` valid → `200 {"status":"ok","id":<int>,"name":…}`.
- [ ] `POST /api/user` valid → same shape (alias).
- [ ] `GET /health` → `200 {"status":"healthy"}`.
- [ ] `OPTIONS /register` with `Origin` → `204` + expected CORS headers.
- [ ] `FRONTEND_URL` respected in `Access-Control-Allow-Origin`; unset → `*`.
- [ ] `GET /register` → `405`.
- [ ] Invalid JSON → `400`.
- [ ] Row is actually inserted:
  ```sql
  SELECT id, name, age, gender, created_at FROM users ORDER BY id DESC LIMIT 5;
  ```
- [ ] Simulate insert failure → `500 internal server error` + backend log `DB insert error: …`.

### DB connect fails mode
- [ ] Set `DATABASE_URL=postgres://bad@nowhere:1/x` → server logs `DB connection failed: … using simple handler on :8080`.
- [ ] Behaves like no-DB mode (no `/health`).
- [ ] CORS still applied by `simpleHandler` (origin `*`).

## 3. Integration scenarios

| Scenario | Expected |
|----------|----------|
| **DB mode + valid register** | UI: status `Registration successful!`, form clears; backend: `200 {status,id,name}`; DB: one new row with matching name/age/gender. |
| **DB mode + backend down** | UI: status `Error: Failed to fetch`; no DB row. |
| **DB mode + `age` empty (client bypass)** | Backend `400 bad json`; UI shows `Error: HTTP 400`. |
| **DB mode + mismatched `FRONTEND_URL`** | Browser blocks response (CORS error in console); request still reaches server (visible in backend logs). |
| **DB mode + `/health` probe** | `200 {"status":"healthy"}` — safe for LB/k8s probes. |
| **No-DB mode + register from UI** | UI: status `Registration successful!`, form clears; backend: `200 {"status":"ok","name":…}`. ✅ *(CORS headers are sent by `simpleHandler`.)* |
| **No-DB mode + curl register** | `200 {"status":"ok","name":…}`. |
| **No-DB mode + `/health`** | `404`. |
| **No-DB mode + `OPTIONS` preflight** | `204` + `Access-Control-Allow-Origin: *` (from `simpleHandler`). |
| **DB connect fails + register via curl** | `200 {"status":"ok","name":…}` (simple handler); **no row** in DB. |
| **Login page submit** | No network request; status transitions `Logging in...` → `Login successful!`; stays on `/login`. |
| **SPA deep link (prod)** | Direct visit to `/register` loads the app (requires history fallback on the host). |
| **Email/password submitted** | Backend ignores them; they do **not** appear in `users` table. |
| **`FRONTEND_URL` in no-DB mode** | Ignored — origin is always `*` in that branch (see §5 item 1). |

## 4. Suggested automated tests

### Backend (Go `net/http/httptest`)
- `simpleHandler`:
  - POST valid → 200, body `{status:"ok",name}`.
  - GET → 405 `method not allowed`.
  - Malformed JSON → 400 `bad json`.
  - `age` as string → 400.
  - OPTIONS → 204 with `Access-Control-Allow-Origin: *`.
  - POST response also has `Access-Control-Allow-Origin: *`.
- `userHandler(db)` (needs a Postgres test container, e.g. `testcontainers-go` or CI service):
  - POST valid → 200, body includes `id` and `name`; row exists.
  - POST with DB failure → 500.
- CORS wrapper (DB mode): `OPTIONS` → 204 + `Access-Control-Allow-Origin` reflects `FRONTEND_URL`.
- `healthHandler` → 200 `{"status":"healthy"}`.
- `ensureTable` on empty DB → table exists; second call is idempotent.

### Frontend (Vitest + React Testing Library)
- Router: `/` redirects to `/register`; `/login` renders Sign In.
- `RegisterPage`: typing updates inputs; submit calls `fetch` with expected URL/headers/body; success clears fields; error shows `Error:`.
- `LoginPage`: submit triggers 1s delay then success; **asserts `fetch` is NOT called**.
- Age coercion: empty `age` → payload `age` should ideally be a number or omitted (current: `""`).
- Nav links between pages work.

### Contract test (protects the field mismatch)
- Parse `backend/main.go` (or a duplicated JSON schema) and assert:
  - Frontend payload keys ⊆ backend `UserRequest` keys **OR** that `email`/`password` are intentionally dropped.
  - If/when you add email/password persistence, this test fails — forcing a coordinated change.

## 5. Known Limitations & Recommended Improvements

| # | Area | Issue | Recommendation |
|---|------|-------|----------------|
| 1 | **Backend / CORS hardening** | `simpleHandler` (no-DB and connect-fail branches) hardcodes `Access-Control-Allow-Origin: *` and ignores `FRONTEND_URL`. Functionally works, but origin is unrestricted and inconsistent with DB mode. | Extract CORS to a reusable wrapper, honor `FRONTEND_URL` in all branches (default `*` for dev), and drop the inline headers from `simpleHandler`. |
| 2 | Backend / Frontend | Frontend sends `email` + `password` but backend `UserRequest` has no such fields → silently dropped | Add fields + `password_hash` column; or remove them from frontend UI (a login/register without credentials is misleading) |
| 3 | Frontend | `age` sends `""` when empty → backend `400 bad json` | Coerce `age` to number or omit; add required positive integer |
| 4 | Backend | `Login` has no server-side counterpart — not real auth | Add `POST /login`, password hashing (bcrypt/argon2), sessions/JWT; or clearly label the page as a demo |
| 5 | Backend | `userHandler` **does not validate** name/age/gender | Add validation (name length, age range 0–120, gender enum) |
| 6 | Backend | `Response.ID` `omitempty` means ID=0 rows omit `id` — can't happen with SERIAL, but be aware | Drop `omitempty` on `id` or use `*int` |
| 7 | Backend | `ensureTable` is not a migration system; schema changes need manual SQL | Adopt `golang-migrate` or `goose` |
| 8 | Backend | `pgx.Connect` (single conn) — no pool, no retry, no timeouts | Use `pgxpool.Pool`; wrap connect in retry/backoff; add `http.Server` timeouts; `http.MaxBytesReader` |
| 9 | Backend | No graceful shutdown | Handle SIGINT/SIGTERM; `server.Shutdown(ctx)` |
| 10 | Backend | `backend/testbin` binary committed | Remove + add `testbin` to `backend/.gitignore` |
| 11 | Frontend | `src/mainApp.jsx` is a dead alternate entry (also imports a **named** `Register` that doesn't exist) | Delete it |
| 12 | Frontend | `src/index.css` (legacy theme) and `src/App.css` (current theme) both style `body`, `#root`; conflicting variables unused | Consolidate: drop or refactor `index.css` to only what's used; consider CSS Modules |
| 13 | Frontend | Unused assets (`hero.png`, `react.svg`, `vite.svg`, `icons.svg`) | Remove to shrink repo/bundle noise |
| 14 | Frontend | No 404 route | Add `<Route path="*" element={<NotFound/>}/>` |
| 15 | Frontend | `Login` shows fake success — misleading to users | Label as demo or wire to real API |
| 16 | Frontend | No loading spinner / disabled submit during request | Add `isSubmitting` state, disable button, spinner |
| 17 | Frontend | Status message is generic (`Error: HTTP 400`); server error body not shown | Parse `res.text()` on error and surface a friendly message |
| 18 | Ops | No CI, no Dockerfile in repo, no `.env.example` | Add `.github/workflows/ci.yml`, `Dockerfile`, `.env.example` (CI scaffold is in [RUNBOOK.md Appendix H](./RUNBOOK.md#appendix-h--suggested-ci-pipeline-scaffold)) |
| 19 | Ops | No logging structure (plain `log` package) | Consider `slog` for structured JSON logs (Go 1.21+) |
| 20 | Docs | `README.md` is template-heavy | Point readers to `docs/` |
| 21 | Testing | No automated tests | Add Go `httptest` + Vitest/RTL (see §4) |
| 22 | Security | No rate limiting, no auth, no CSRF, no HTTPS assumption | Add at the edge (LB/WAF), and password hashing for real auth |
| 23 | Version drift | `go.mod` declares `go 1.25.0` — ensure the build image uses ≥ 1.25 | Pin `golang:1.25` in Dockerfile; update CI matrix |
| 24 | Deps | `pgx/v5` pulls `golang.org/x/text` indirect — keep `go mod tidy` in CI | Add `go mod tidy -diff` check |
| 25 | Backend / formatting | `main.go` DB-connect-failure branch is under-indented (cosmetic) | Run `gofmt -w backend/`; CI enforces via `gofmt check` ([RUNBOOK.md Appendix H](./RUNBOOK.md#appendix-h--suggested-ci-pipeline-scaffold)) |
| 26 | Backend / CORS parity | `simpleHandler` (no-DB) → `*`; CORS wrapper (DB) → `FRONTEND_URL`. Behavior differs by mode — subtle. | Unify: same helper, same source (`FRONTEND_URL`), same default. Documented in [ARCHITECTURE.md §6](./ARCHITECTURE.md#6-cross-cutting-gaps-read-first) and [BACKEND-API.md §6](./BACKEND-API.md#6-cors). |

## Appendix E — Definition of Done (Per Feature)

- [ ] Code merged to main; `npm run lint` passes; `go vet ./...` passes; `go build ./...` passes.
- [ ] `gofmt -l backend/` prints nothing (or the CI `gofmt check` step passes).
- [ ] Frontend and backend production builds succeed (`npm run build`, `go build -o … .`).
- [ ] **Both** backend modes tested (no-DB **and** DB) — see §2.
- [ ] If a new env var was added, documented in [BACKEND-API.md §7](./BACKEND-API.md#7-environment-variables) and [RUNBOOK.md Appendix C](./RUNBOOK.md#appendix-c--environment-variable-reference-all-contexts).
- [ ] API Reference Card ([BACKEND-API.md Appendix B](./BACKEND-API.md#appendix-b--api-reference-card)) updated for endpoint/schema changes.
- [ ] Manual QA checklists (§1, §2, §3) re-run and passed.
- [ ] New automated tests added and green in CI.
- [ ] [RUNBOOK.md Appendix D](./RUNBOOK.md#appendix-d--troubleshooting--common-scenarios) updated for new failure modes.
- [ ] [NON-TECHNICAL.md](./NON-TECHNICAL.md) updated if user-facing behavior changed.
- [ ] If DB schema changed: migration added (not only `ensureTable`).
- [ ] If new npm/Go deps: `package-lock.json` (or `npm install` note) and `go.sum` updated.

## Appendix I — Onboarding Path (New Contributor, 30 minutes)

1. **Read** [ARCHITECTURE.md §1–§4](./ARCHITECTURE.md) (10 min) — overall shape + dual backend modes + data flow + CORS story.
2. **Run** [RUNBOOK.md §1 Option B](./RUNBOOK.md#option-b--postgres-mode-recommended-for-anything-resembling-prod) (10 min) — DB mode gives the smoothest end-to-end path.
3. **Skim** [FRONTEND.md §3](./FRONTEND.md#3-pages) (Register + Login) and [BACKEND-API.md §5](./BACKEND-API.md#5-handler-logic) (simple vs DB handlers) (5 min).
4. **Skim** [BACKEND-API.md Appendix B](./BACKEND-API.md#appendix-b--api-reference-card) and [RUNBOOK.md Appendix C](./RUNBOOK.md#appendix-c--environment-variable-reference-all-contexts) (5 min) — full contract surface.
5. **Pick a task** from §5 above and follow Appendix E when done.
