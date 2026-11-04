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
  - **No-DB mode** (default when `DATABASE_URL` is unset) — in-memory, log-only, no CORS, no `/health`.
  - **Postgres mode** (when `DATABASE_URL` is set and the connection succeeds) — persists registrations to a `users` table via `pgx/v5`, adds `/health`, enables CORS.

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

---

## 2. High-Level Architecture

### 2a. No-DB mode (default; what you get if you just `go run main.go`)

```
┌────────────────────────┐     POST /register (JSON)      ┌────────────────────────┐
│ React (Vite :3000)     │  ──────────────────────────►   │ Go (net/http :8080)    │
│  /register, /login     │     (no CORS middleware!)      │  simpleHandler         │
│  BrowserRouter         │  ◄──────────────────────────   │  (log-only, no DB)     │
└────────────────────────┘   200 {status:"ok", name}      └────────────────────────┘
```

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
     ├─ NO  → simpleHandler on /api/user + /register; no CORS; no /health; listen.
     └─ YES → pgx.Connect()
               ├─ FAIL → log; simpleHandler; no CORS; no /health; listen.
               └─ OK   → ensureTable(); userHandler(db) on /api/user + /register;
                          /health; CORS wrapper; listen.
```

---

## 3. Backend Modes (No-DB vs Postgres)

| Concern | No-DB mode | Postgres mode |
|---------|-----------|----------------|
| Trigger | `DATABASE_URL` empty OR connect fails | `DATABASE_URL` set + connect OK |
| Persistence | None (log only) | `INSERT INTO users` |
| Response body | `{"status":"ok","name":<name>}` | `{"status":"ok","id":<int>,"name":<name>}` |
| `/health` endpoint | ❌ not registered (404) | ✅ `{"status":"healthy"}` |
| CORS headers | ❌ **none** (browser will block cross-origin!) | ✅ reflects `FRONTEND_URL` or `*` |
| Tables created | — | `users` via `CREATE TABLE IF NOT EXISTS` |
| Implication for dev | Works **same-origin only** (e.g. Vite proxy) or if you don't care about browser CORS errors | Works cross-origin from `:3000` |

> **⚠️ Critical dev ergonomics:** In no-DB mode the frontend at `:3000` calling backend at `:8080` **will fail in the browser** with a CORS error, because the fallback branch registers handlers on a bare `http.ServeMux` with **no CORS middleware**. Either (a) set `DATABASE_URL` (even to a throwaway Postgres), or (b) add a Vite dev proxy, or (c) patch the backend to apply CORS in all branches. See [TESTING.md §4](./TESTING.md#4-known-limitations--recommended-improvements) item 1.

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
5. **DB mode:** browser sends OPTIONS preflight → CORS middleware → 204; then POST → `userHandler` inserts row → `200 {status:"ok",id,name}`. Register clears the form on success.
6. **No-DB mode:** browser sends POST (no preflight allowed → browser blocks unless same-origin) → `simpleHandler` returns `{status:"ok",name:<req.Name>}`.

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
│   ├── .gitignore               # Ignores .env, dist, node_modules, package.json
│   ├── testbin                  # ⚠️ committed build artifact (should be gitignored)
│   ├── go.mod                   # module github.com/example/user-api; go 1.25.0; pgx/v5
│   ├── go.sum                   # Checksums for pgx and transitive deps
│   └── main.go                  # Dual-mode server: simpleHandler OR userHandler(db)
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
├── index.html                   # Vite HTML entry
├── vite.config.js               # React plugin; dev port 3000; no proxy
├── .oxlintrc.json               # Oxlint rules (React + Oxc)
├── .gitignore                   # Ignores node_modules, dist, logs, .env, editors
├── package.json                 # Adds react-router-dom@^7.18.5
└── README.md                    # Short project README (links to docs/)
```

---

## 6. Cross-Cutting Gaps (Read First)

These affect everyone, so they are surfaced at the top level:

1. **CORS missing in no-DB fallback** — browser calls from `:3000` to `:8080` will be blocked in that mode. Mitigations: set a `DATABASE_URL`, add a Vite proxy, or patch `main.go` to always wrap in CORS.
2. **Frontend/backend field mismatch** — frontend sends `email` & `password`; backend ignores both. Don't assume they're persisted.
3. **`age` may be `''`** when the form is empty (frontend), causing `400 bad json` from the backend.
4. **Two UIs coexisting** — `index.css` (legacy) vs `App.css` (current theme). Both target `body`, `#root`; visual conflicts possible.
5. **`src/mainApp.jsx` and `backend/testbin`** are stray/leftover files — should be removed or gitignored.

---

> **File ownership & change frequency:** see [FRONTEND.md Appendix A](./FRONTEND.md#appendix-a--file-by-file-reference-matrix) and [BACKEND-API.md Appendix A](./BACKEND-API.md#appendix-a--file-by-file-reference-matrix).
