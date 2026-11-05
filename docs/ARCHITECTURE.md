# 🏛 Architecture

> Part of [Project Documentation](./README.md). See also: [FRONTEND.md](./FRONTEND.md), [BACKEND-API.md](./BACKEND-API.md).

## Table of contents
1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend Modes (No-DB vs Postgres)](#3-backend-modes-no-db-vs-postgres)
4. [End-to-End Data Flow](#4-end-to-end-data-flow)
5. [Repository Structure (Annotated)](#5-repository-structure-annotated)
6. [Cross-Cutting Gaps (Read First)](#6-cross-cutting-gaps-read-first)

---

## 1. Project Overview

The **React Gender App** (UI branded "Inovix Labs") is a small full-stack demo that lets users **register** with personal details (name, age, gender — plus email/password in the UI) and navigate to a **login** page.

- **Frontend:** React 19 + Vite 8 + React Router 7. Two pages: `/register` (default) and `/login`. A shared branded auth layout (dark slate + purple gradient split panel).
- **Backend:** Go 1.25 HTTP API with **two operating modes**:
  - **No-DB mode** (default when `DATABASE_URL` is unset) — in-memory, log-only. **CORS is applied inline inside `simpleHandler`** (allows `*`). No `/health` endpoint.
  - **Postgres mode** (when `DATABASE_URL` is set and the connection succeeds) — persists registrations to a `users` table via `pgx/v5`, adds `/health`, wraps the mux in a CORS middleware that respects `FRONTEND_URL`.

**What it is NOT (yet):**
- Not real authentication — `Login` is simulated client-side; there is no session, JWT, or password verification.
- Passwords and emails are **sent** by the frontend but **not stored** by the backend (`UserRequest` has no fields for them).
- No input validation, no rate limiting, no email verification.

**Key characteristics:**

| Aspect | Value |
|--------|-------|
| Frontend dev port | `3000` (`vite.config.js`) |
| Backend default port | `8080` (`PORT` env) |
| Backend endpoints | `/api/user`, `/register`, `/health` (health only in DB mode) |
| DB (optional) | Postgres via `pgx/v5`; table `users` auto-created |
| Auth | None (simulated on login page) |
| CORS | Always sent — `*` in no-DB mode; `FRONTEND_URL or *` in DB mode |

---

## 2. High-Level Architecture

### 2a. No-DB mode (default; what you get if you just `go run main.go`)

```
┌────────────────────────┐     POST /register (JSON)      ┌────────────────────────┐
│ React (Vite :3000)     │  ──────────────────────────►   │ Go (net/http :8080)    │
│  /register, /login     │   + CORS headers (from handler)│  simpleHandler         │
│  BrowserRouter         │  ◄──────────────────────────   │  (no-op: no log, no DB)│
└────────────────────────┘   200 {status:"ok", name}      └────────────────────────┘
```

- CORS is applied **inline** in `simpleHandler` with `Access-Control-Allow-Origin: *`.
- `OPTIONS` preflight → `204 No Content`.

### 2b. Postgres mode (when `DATABASE_URL` is set and reachable)

```
┌────────────────────────┐     POST /register (JSON)      ┌────────────────────────┐
│ React (Vite :3000)     │  ──────────────────────────►   │ Go (net/http :8080)    │
│                        │   + CORS preflight (OPTIONS)   │  CORS wrapper          │
│                        │  ◄──────────────────────────   │  userHandler(db)       │
│                        │  200 {status,id,name}          │  GET /health           │
└────────────────────────┘                                └──────────┬─────────────┘
                                                                      │ INSERT INTO users
                                                                      ▼
                                                          ┌────────────────────────┐
                                                          │ PostgreSQL             │
                                                          │ users(id,name,age,     │
                                                          │ gender,created_at)     │
                                                          └────────────────────────┘
```

**Startup decision tree (from `main`):**

```
START
 └─ DATABASE_URL set?
     ├─ NO  → simpleHandler on /api/user + /register; CORS from handler (allows *); no /health; listen.
     └─ YES → pgx.Connect()
               ├─ FAIL → log; simpleHandler; CORS from handler (allows *); no /health; listen.
               └─ OK   → ensureTable(); userHandler(db) on /api/user + /register;
                          /health; CORS wrapper (respects FRONTEND_URL); listen.
```

---

## 3. Backend Modes (No-DB vs Postgres)

| Concern | No-DB mode | Postgres mode |
|---------|-----------|----------------|
| Trigger | `DATABASE_URL` empty OR connect fails | `DATABASE_URL` set + connect OK |
| Persistence | None (log only) | `INSERT INTO users` |
| Response body | `{"status":"ok","name":<name>}` | `{"status":"ok","id":<int>,"name":<name>}` |
| `/health` endpoint | ❌ not registered (404) | ✅ `{"status":"healthy"}` |
| CORS headers | ✅ **always `*`** (set inside `simpleHandler`) | ✅ reflects `FRONTEND_URL` or `*` |
| CORS configurable via `FRONTEND_URL`? | ❌ **no** — always `*` | ✅ yes |
| Tables created | — | `users` via `CREATE TABLE IF NOT EXISTS` |
| Dev impact | Works cross-origin from `:3000` (browser won't block) | Same |

> **Note:** In no-DB mode the browser will **not** block cross-origin requests (the handler sets `Access-Control-Allow-Origin: *`), but the origin restriction is hardcoded. `FRONTEND_URL` only affects DB mode. See [TESTING.md §5 item 1](./TESTING.md#5-known-limitations--recommended-improvements) for the recommended hardening.

---

## 4. End-to-End Data Flow

### 4a. Register flow (both modes)
1. User opens `http://localhost:3000` → `App` redirects `/` → `/register`.
2. `pages/Register.jsx` renders the form (First Name, Last Name, Email, Password, Age, Gender).
3. User submits → `handleSubmit` builds:
   ```json
   {
     "firstName": "John", "lastName": "Doe", "name": "John Doe",
     "email": "john@example.com", "password": "••••",
     "age": 25, "gender": "male"
   }
   ```
4. `fetch(POST, API_ENDPOINT)` where `API_ENDPOINT = VITE_API_URL || "http://localhost:8080/register"`.
5. **DB mode:** browser sends OPTIONS preflight → CORS wrapper → 204; then POST → `userHandler` inserts row → `200 {status:"ok",id,name}`. Register clears the form on success.
6. **No-DB mode:** browser sends POST (handler also answers OPTIONS with 204 + CORS) → `simpleHandler` returns `{status:"ok",name:<req.Name>}`. Form clears on success.

### 4b. Login flow (client-only, no API)
1. Navigate to `/login` (via link on Register page).
2. Fill email + password → submit.
3. `handleSubmit` runs `await new Promise(r => setTimeout(r, 1000))` and then sets status **"Login successful!"**.
4. No backend call is made. No session is stored. This is a **UI placeholder**.

---

## 5. Repository Structure (Annotated)

```
.
├── backend/                     # Go API server
│   ├── .gitignore               # ⚠️ Copied from frontend: ignores .env, dist/, node_modules/, package.json
│   │                            #    (irrelevant to Go) and does NOT ignore testbin. Should be rewritten.
│   ├── testbin                  # ⚠️ committed build artifact — NOT in backend/.gitignore today. Remove + ignore.
│   ├── go.mod                   # module github.com/example/user-api; go 1.25.0; pgx/v5
│   │                            # ⚠️ pgx/v5 is a DIRECT import but marked // indirect — run `go mod tidy`
│   ├── go.sum                   # Checksums for pgx and transitive deps
│   └── main.go                  # Dual-mode server: simpleHandler (with inline CORS) OR userHandler(db)
│
├── src/                         # React frontend source
│   ├── assets/                  # Images & SVGs bundled by Vite
│   │   ├── hero.png             # Unused hero image
│   │   ├── react.svg            # React logo (unused)
│   │   └── vite.svg             # Vite logo (unused)
│   ├── pages/                   # Routed pages
│   │   ├── Login.jsx            # UI-only login (simulated success)
│   │   └── Register.jsx         # Registration form → POST /register
│   ├── main.jsx                 # Entry: StrictMode + BrowserRouter + <App/>
│   ├── mainApp.jsx              # ⚠️ alternate entry rendering <Register/> (unused)
│   ├── App.jsx                  # Router: / → /register, /register, /login
│   ├── App.css                  # Auth split-panel theme (Inovix Labs)
│   └── index.css                # Global vars / dark mode (legacy theme)
│
├── public/                      # Copied verbatim into dist/
│   ├── icons.svg                # SVG sprite (unused by app)
│   └── favicon.svg              # Browser tab icon
│
├── docs/                        # 📚 You are here
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── FRONTEND.md
│   ├── BACKEND-API.md
│   ├── RUNBOOK.md
│   ├── TESTING.md
│   └── NON-TECHNICAL.md
│
├── index.html                   # Vite HTML entry — <title> is "Test App" (NOT "react-gender-app")
├── dist/                        # ⚠️ COMMITTED stale build: hardcodes http://localhost:8080/api/user
│                                #    (ignores VITE_API_URL), title "react-gender-app". Rebuild before deploy.
├── vite.config.js               # React plugin; dev port 3000; no proxy
├── .oxlintrc.json               # Oxlint rules (React + Oxc)
├── .gitignore                   # Ignores node_modules, dist, logs, .env, editors
├── package.json                 # Adds react-router-dom@^7.18.5
└── README.md                    # Short project README (links to docs/)
```

---

## 6. Cross-Cutting Gaps (Read First)

These affect everyone, so they are surfaced at the top level:

1. **Origin hardening in no-DB mode** — `simpleHandler` always emits `Access-Control-Allow-Origin: *`, ignoring `FRONTEND_URL`. This is a *security/consistency* gap (not a browser-blocks you gap like before). Mitigation: wrap no-DB mux in the same CORS function used in DB mode and drop `*`. Also add `Vary: Origin` in the DB-mode wrapper (missing today) so CDNs don't cache a response for the wrong origin.
2. **Frontend/backend field mismatch** — frontend sends `email` & `password`; backend `UserRequest` ignores both. Don't assume they're persisted.
3. **`age` may be `''`** when the form is empty (frontend), causing `400 bad json` from the backend.
4. **Two UIs coexisting** — `index.css` (legacy) vs `App.css` (current theme). Both target `body`, `#root`; visual conflicts possible.
5. **`src/mainApp.jsx` and `backend/testbin`** are stray/leftover files — should be removed or gitignored.
6. **Inconsistent formatting** — `main.go` DB-connect-failure branch is under-indented; run `gofmt -w backend/`. See [TESTING.md §5 item 25](./TESTING.md#5-known-limitations--recommended-improvements).
7. **Committed `dist/` is stale and mis-targeted** — built from an older `Register.jsx`; hardcodes `http://localhost:8080/api/user`, ignores `VITE_API_URL`; title is `react-gender-app` (root is `Test App`). Deploying it as-is hits the alias endpoint on localhost. Rebuild (`npm run build`) before any deploy; consider removing `dist/` from VCS.
8. **`simpleHandler` "log-only" is actually a no-op** — the comments/docs say "log-only" but the handler contains no `log.Print`. Data is silently dropped. Either add a log line or rename the description everywhere.
9. **`go.mod` marks `pgx/v5` as `// indirect`** though `main.go` imports it directly. `go mod tidy` would correct this; the suggested CI (`go mod tidy` + `git diff --exit-code go.mod go.sum`, RUNBOOK Appendix H) fails today.
10. **`backend/.gitignore` is a copy of the frontend's** — ignores `package.json`, `node_modules/`, `dist/` (irrelevant to Go) and does **not** ignore `testbin`.

---

> **File ownership & change frequency:** see [FRONTEND.md Appendix A](./FRONTEND.md#appendix-a--file-by-file-reference-matrix) and [BACKEND-API.md Appendix A](./BACKEND-API.md#appendix-a--file-by-file-reference-matrix).
