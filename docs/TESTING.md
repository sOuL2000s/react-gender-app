# 🧪 Testing Guide

> Part of [Project Documentation](./README.md). See also: [BACKEND-API.md §3](./BACKEND-API.md#3-api-contract), [RUNBOOK.md Appendix D](./RUNBOOK.md#appendix-d--troubleshooting--common-scenarios).

## Table of contents
1. [Manual QA checklist (Frontend)](#1-manual-qa-checklist-frontend)
2. [Manual QA checklist (Backend)](#2-manual-qa-checklist-backend)
3. [Suggested automated tests](#3-suggested-automated-tests)
4. [Known Limitations & Recommended Improvements](#4-known-limitations--recommended-improvements)
5. [Appendix E — Definition of Done (Per Feature)](#appendix-e--definition-of-done-per-feature)
6. [Appendix I — Onboarding Path (New Contributor)](#appendix-i--onboarding-path-new-contributor-30-minutes)

---

## 1. Manual QA checklist (Frontend)

- [ ] Page loads at :3000 with title `react-gender-app`.
- [ ] Favicon loads (`/favicon.svg`).
- [ ] Form renders with Name, Age (number), Gender, Submit button.
- [ ] All fields required — empty submit is blocked by browser.
- [ ] Live JSON preview updates as you type.
- [ ] Submit happy path → status "Sent successfully!".
- [ ] Backend stopped → status starts with "Error:".
- [ ] Wrong endpoint (set `VITE_API_URL` to a 404) → status "Error: HTTP 404".
- [ ] Dark OS theme → UI switches colors sensibly.
- [ ] Responsive at ≤1024px and mobile widths (card remains centered, max-width 420px).
- [ ] `npm run lint` exits 0.

## 2. Manual QA checklist (Backend)

- [ ] `go run main.go` starts on :8080.
- [ ] `POST /api/user` valid → `200 {status:"ok", name:...}`.
- [ ] `GET /api/user` → `405 method not allowed`.
- [ ] Invalid JSON → `400 bad json`.
- [ ] `age` as string/empty → `400 bad json`.
- [ ] `OPTIONS /api/user` → `204` + CORS headers.
- [ ] `FRONTEND_URL` env respected in `Access-Control-Allow-Origin`.
- [ ] Missing `FRONTEND_URL` → header is `*`.
- [ ] `PORT` env respected.
- [ ] Server logs `Received user: ...` per request.

## Integration test (end-to-end)
- Run both. Submit form. Verify backend log line matches form values and frontend status success.

## 3. Suggested automated tests

**Backend unit tests** (`main_test.go`) using `httptest.NewRequest`/`NewRecorder`:
- Happy path → `200` + expected JSON body.
- Wrong method → `405`.
- Bad JSON → `400`.
- CORS preflight → `204` + expected headers.
- `FRONTEND_URL` set → header reflects it; unset → `*`.

**Frontend tests** with Vitest + React Testing Library:
- Input changes update the preview.
- Submit calls `fetch` with the expected URL, headers, and body.
- Error path (non-2xx) renders error status.
- Success path renders "Sent successfully!".

**Contract test:**
- Ensure the frontend `age` coercion always yields a number in the payload (currently `''` risk — see §4 item 1).

## 4. Known Limitations & Recommended Improvements

| # | Area | Issue | Recommendation |
|---|------|-------|----------------|
| 1 | Frontend | `age` can be `''` (empty string) in payload → backend 400 | Coerce only valid number, or send `null`; or validate before send. |
| 2 | Backend | No input validation (names, age range, gender enumeration) | Add validation (e.g. age 0–120, gender in set, name length). |
| 3 | Backend | No body size limit | `http.MaxBytesReader` (e.g. 1 MiB). |
| 4 | Backend | No server timeouts / graceful shutdown | Use `http.Server` with timeouts + signal handling. |
| 5 | Backend | No health endpoint | Add `GET /healthz`. |
| 6 | Backend | CORS `*` fallback in prod risk | Require `FRONTEND_URL` in prod, fail fast if missing. |
| 7 | Backend | Errors from `Encode` ignored | Log them. |
| 8 | Frontend | CSS `index.css` and `App.css` both style `body`/`#root` — conflicts | Consolidate into one global + scoped CSS (or CSS Modules). |
| 9 | Frontend | Unused assets (`hero.png`, `react.svg`, `vite.svg`, `icons.svg`) | Remove or use them; reduces bundle/repo noise. |
| 10 | Frontend | No loading spinner, no reset, doesn't show server response body | Improve UX; show returned name. |
| 11 | Testing | No automated tests | Add Go `httptest` tests + Vitest/RTL tests + CI. |
| 12 | Ops | No containerization / CI config | Add Dockerfile, GitHub Actions (lint + build + test). |
| 13 | Docs | README is template-heavy | Trim to project-specific docs (or point to `docs/`). |
| 14 | Security | No rate limiting / auth | For demo only; add auth + rate limit if exposed publicly. |

---

## Appendix E — Definition of Done (Per Feature)

Use this checklist when extending the project (e.g., adding validation, persistence, auth):

- [ ] Code merged to main; lint (`npm run lint`) passes; `go vet ./...` passes.
- [ ] Frontend and backend builds succeed (`npm run build`, `go build ./...`).
- [ ] Env vars documented in [RUNBOOK.md Appendix C](./RUNBOOK.md#appendix-c--environment-variable-reference-all-contexts) if any were added.
- [ ] API Reference Card ([BACKEND-API.md Appendix B](./BACKEND-API.md#appendix-b--api-reference-card)) updated for any endpoint/schema change.
- [ ] Manual QA checklists (§1, §2 above) re-run and passed.
- [ ] New automated tests added (Go `httptest`, Vitest/RTL) and green in CI.
- [ ] [RUNBOOK.md Appendix D](./RUNBOOK.md#appendix-d--troubleshooting--common-scenarios) updated for new failure modes.
- [ ] [NON-TECHNICAL.md](./NON-TECHNICAL.md) updated if user-facing behavior changed.

---

## Appendix I — Onboarding Path (New Contributor, 30 minutes)

1. **Read** [ARCHITECTURE.md §1, §2, §3](./ARCHITECTURE.md) (10 min) — understand the shape of the app and the data flow.
2. **Run** [RUNBOOK.md §1](./RUNBOOK.md#1-local-development-setup) (10 min) — both servers up, submit a form, see the log line.
3. **Skim** [FRONTEND.md §3](./FRONTEND.md#3-component-appjsx-the-user-form) (`App.jsx` walkthrough) and [BACKEND-API.md §5](./BACKEND-API.md#5-handler-logic-userhandler) (`userHandler` walkthrough) (5 min) — these are the two files that hold all the logic.
4. **Skim** [BACKEND-API.md Appendix B](./BACKEND-API.md#appendix-b--api-reference-card) (API card) and [RUNBOOK.md Appendix C](./RUNBOOK.md#appendix-c--environment-variable-reference-all-contexts) (env vars) (5 min) — you now know the entire contract surface.
5. **Pick a task** from §4 above and follow Appendix E (Definition of Done) when done.

By the end of this path a new developer, tester, or DevOps engineer can navigate, run, and safely change the project.
