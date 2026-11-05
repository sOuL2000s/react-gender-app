# 🔌 Backend API Documentation

> Part of [Project Documentation](./README.md). See also: [ARCHITECTURE.md](./ARCHITECTURE.md), [FRONTEND.md](./FRONTEND.md), [RUNBOOK.md](./RUNBOOK.md).

## Table of contents
1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Server Entry & Dual-Mode Bootstrap (`main`)](#2-server-entry--dual-mode-bootstrap-main)
3. [API Contract](#3-api-contract)
4. [Data Models](#4-data-models)
5. [Handler Logic](#5-handler-logic)
6. [CORS](#6-cors)
7. [Environment Variables](#7-environment-variables)
8. [Database Schema](#8-database-schema)
9. [Appendix A — File-by-File Reference Matrix](#appendix-a--file-by-file-reference-matrix)
10. [Appendix B — API Reference Card](#appendix-b--api-reference-card)

---

## 1. Tech Stack & Dependencies

- **Language:** Go **1.25.0** (per `go.mod`).
- **Module path:** `github.com/example/user-api`.
- **Third-party deps:**
  - `github.com/jackc/pgx/v5 v5.12.0` — Postgres driver (connection + queries).
  - `github.com/jackc/pgpassfile v1.0.0` — indirect (pgx dep).
  - `github.com/jackc/pgservicefile v0.0.0-2024…` — indirect (pgx dep).
  - `golang.org/x/text v0.41.0` — indirect.
- **Stdlib used:** `context`, `encoding/json`, `log`, `net/http`, `os`.
- Single file: `backend/main.go` (~165 lines).
- **`backend/testbin`** — a committed binary artifact. Should be gitignored. **`backend/.gitignore` does not currently list it** (it mistakenly ignores `package.json`, `node_modules/`, `dist/`).
- **`go.mod` hygiene** — `github.com/jackc/pgx/v5` is imported directly by `main.go` but marked `// indirect` in `go.mod`. Run `go mod tidy` before CI; the suggested CI gate (`go mod tidy` followed by `git diff --exit-code go.mod go.sum` — see RUNBOOK Appendix H) fails today.

## 2. Server Entry & Dual-Mode Bootstrap (`main`)

`main()` branches on `DATABASE_URL`:

```
DATABASE_URL set?
├─ NO  → simpleHandler on /api/user + /register; CORS applied inside handler (allows *);
│        no /health; listen on PORT (default 8080).
└─ YES → pgx.Connect(context.Background(), dsn)
          ├─ FAIL → log; simpleHandler on /api/user + /register; CORS from handler;
          │         no /health; listen.
          └─ OK   → defer db.Close(); ensureTable(db) (fatal if fails);
                    userHandler(db) on /api/user + /register;
                    GET /health → healthHandler;
                    wrap in CORS middleware (respects FRONTEND_URL);
                    listen on PORT (default 8080).
```

### Branch A — No DB (default)

```go
log.Println("DATABASE_URL not set, using simple handler (no DB)")
mux := http.NewServeMux()
mux.HandleFunc("/api/user", simpleHandler)
mux.HandleFunc("/register", simpleHandler)
port := os.Getenv("PORT"); if port == "" { port = "8080" }
log.Printf("Listening on :%s (no DB)", port)
log.Fatal(http.ListenAndServe(":"+port, mux))
```

- Uses a **bare `ServeMux`**, but `simpleHandler` now **sets CORS headers itself** (`Access-Control-Allow-Origin: *`) and answers `OPTIONS` with `204`.
- **No `/health`** endpoint is registered.
- Browser calls from `:3000` will **not** be blocked by CORS (header is sent), but the origin is hardcoded to `*` — `FRONTEND_URL` is ignored in this branch.

### Branch B — DB connect fails

Same handlers as Branch A, but logged as `DB connection failed, using simple handler on :<port>`. Practically equivalent to Branch A.

### Branch C — DB connect succeeds (real mode)

```go
defer db.Close(context.Background())
if err := ensureTable(db); err != nil { log.Fatalf("ensure table: %v", err) }

mux := http.NewServeMux()
mux.HandleFunc("/api/user", userHandler(db))
mux.HandleFunc("/register", userHandler(db))
mux.HandleFunc("/health", healthHandler)

origin := os.Getenv("FRONTEND_URL"); if origin == "" { origin = "*" }
handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", origin)
    w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusNoContent)
        return
    }
    mux.ServeHTTP(w, r)
})
log.Fatal(http.ListenAndServe(":"+port, handler))
```

- CORS middleware wraps all routes and **respects `FRONTEND_URL`**.
- `/health` endpoint is available.
- Both `/api/user` and `/register` route to the **same** `userHandler(db)`.

## 3. API Contract

### Common endpoint: `POST /register` and `POST /api/user` (aliases)

Both paths hit the same handler in their respective mode.

**Request**
- Method: `POST` (only; others → `405 method not allowed`).
- Headers: `Content-Type: application/json`.
- Body (what the frontend actually sends):
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe",
    "email": "john@example.com",
    "password": "••••",
    "age": 25,
    "gender": "male"
  }
  ```

**Fields read by backend (`UserRequest`)**

| JSON key | Type | Notes |
|----------|------|-------|
| `firstName` | string | Read but **not persisted** |
| `lastName` | string | Read but **not persisted** |
| `name` | string | Persisted (in DB mode) |
| `age` | int | Persisted. Must be a JSON **number** — string/empty → `400 bad json` |
| `gender` | string | Persisted |
| `email` | *not in struct* | Silently dropped |
| `password` | *not in struct* | Silently dropped |

**Success responses**

DB mode (`userHandler(db)`), status `200`, `Content-Type: application/json`:
```json
{ "status": "ok", "id": 42, "name": "John Doe" }
```

No-DB mode (`simpleHandler`), status `200`, `Content-Type: application/json`:
```json
{ "status": "ok", "name": "John Doe" }
```

**Error responses**

| Status | Body | Trigger |
|--------|------|---------|
| `405` | `method not allowed` | Non-POST |
| `400` | `bad json` | Malformed JSON, or type mismatch (e.g. `age: ""` or string) |
| `500` | `internal server error` | DB insert error (**DB mode only**) |

### `GET /health` *(DB mode only)*
- Returns `200` with `{"status":"healthy"}` and `Content-Type: application/json`.
- **Not registered in no-DB or DB-connect-failed modes** → `404 Not Found`.

### `OPTIONS` preflight *(all modes)*
- **No-DB mode:** handled inline by `simpleHandler` → `204 No Content`.
- **DB mode:** handled by the CORS wrapper → `204 No Content`.
- Allowed methods: `POST, OPTIONS, GET`. Allowed headers: `Content-Type`.

## 4. Data Models

### `User` (unused struct, but defined)
```go
type User struct {
    ID     int    `json:"id"`
    Name   string `json:"name"`
    Age    int    `json:"age"`
    Gender string `json:"gender"`
}
```

### `UserRequest` (the actual request decoder)
```go
type UserRequest struct {
    FirstName string `json:"firstName"`
    LastName  string `json:"lastName"`
    Name      string `json:"name"`
    Age       int    `json:"age"`
    Gender    string `json:"gender"`
}
```
- `email`, `password` absent → ignored by JSON decoder.
- `Age int` strict. Note: `age: 0` is accepted (no range validation) and inserts `age=0`.
- `FirstName`/`LastName` are decoded but **never used**. The persisted `name` comes solely from the JSON `name` field. If a client omits `name`, the DB gets `name=""` → NOT NULL violation → `500`.

### `Response` (DB mode only)
```go
type Response struct {
    Status string `json:"status"`
    ID     int    `json:"id,omitempty"`
    Name   string `json:"name,omitempty"`
}
```

### DB row shape (`users` table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PRIMARY KEY` | Auto-increment |
| `name` | `TEXT NOT NULL` | |
| `age` | `INT NOT NULL` | |
| `gender` | `TEXT NOT NULL` | |
| `created_at` | `TIMESTAMP DEFAULT NOW()` | Auto |

## 5. Handler Logic

### `simpleHandler(w, r)` — no-DB mode
1. **Sets CORS headers directly:** `Access-Control-Allow-Origin: *`, `-Methods: POST, OPTIONS, GET`, `-Headers: Content-Type`.
2. `OPTIONS` → `204 No Content` and returns.
3. `POST` only, else `405`.
4. Decode into `UserRequest`; error → `400 bad json`.
5. Respond `200` `{"status":"ok","name":req.Name}`. **No logging (despite "log-only" wording elsewhere), no persistence.** Data is silently dropped.

### `userHandler(db)` — DB mode (returns `http.HandlerFunc`)
1. `POST` only, else `405`.
2. Decode into `UserRequest`; error → `400 bad json`. **No body-size limit** — `json.NewDecoder(r.Body)` is unbounded. Add `http.MaxBytesReader(w, r.Body, 1<<20)`.
3. `INSERT INTO users (name, age, gender) VALUES ($1,$2,$3) RETURNING id`.
4. On insert error → log + `500 internal server error`.
5. Respond `200` `{status:"ok", id, name}`.

### `healthHandler(w, r)` — DB mode only
- Writes `Content-Type: application/json` and `{"status":"healthy"}`. No method check (any method returns 200).

### `ensureTable(db)` — DB mode only
- `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, age INT NOT NULL, gender TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`.
- Runs once at startup. Fatal on error.

## 6. CORS

**Applied in all modes, but configured differently:**

| Mode | Where | Origin value | Configurable? |
|------|-------|--------------|---------------|
| No-DB (default) | Inside `simpleHandler` | `*` (hardcoded) | ❌ — `FRONTEND_URL` is ignored |
| DB connect fails | Inside `simpleHandler` | `*` (hardcoded) | ❌ |
| DB connect succeeds | Wrapper around mux | `FRONTEND_URL` env or `*` | ✅ |

**Common headers in all modes:**
```
Access-Control-Allow-Methods: POST, OPTIONS, GET
Access-Control-Allow-Headers: Content-Type
```

**Not set:** `Access-Control-Allow-Credentials`, `Access-Control-Max-Age`, `Vary: Origin` (in DB mode, `Vary: Origin` is recommended when `FRONTEND_URL` is not `*` — otherwise CDNs may cache a response for the wrong origin). `Access-Control-Max-Age` is absent in no-DB mode → every preflight re-runs.

> **Suggested improvement:** wrap the no-DB/connect-fail branches in the same CORS function used in DB mode, honoring `FRONTEND_URL`. That removes the current inconsistency where origin restriction silently doesn't apply in dev.

## 7. Environment Variables

| Variable | Required | Default | Consumed in | Effect |
|----------|----------|---------|-------------|--------|
| `DATABASE_URL` | No | (empty) | `main` | Empty → simple mode. Set → attempt Postgres **once at startup**; on failure the process **silently falls back to simple mode for its entire lifetime** (no retry). Example: `postgres://user:pass@localhost:5432/mydb?sslmode=disable` |
| `PORT` | No | `8080` | `main` | Listening port |
| `FRONTEND_URL` | No | `*` | CORS wrapper (DB mode only) | `Access-Control-Allow-Origin` value. **Ignored in no-DB mode.** |

## 8. Database Schema

Managed by `ensureTable` at startup (idempotent):

```sql
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  age         INT NOT NULL,
  gender      TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

- **No migrations tool.** Schema is created idempotently, but **changes to columns are not applied** on existing tables.
- **No unique constraints** on name/email.
- Query used: `INSERT INTO users (name, age, gender) VALUES ($1,$2,$3) RETURNING id`.

Inspect inserted rows:
```sql
SELECT id, name, age, gender, created_at FROM users ORDER BY id DESC;
```

---

## Appendix A — File-by-File Reference Matrix

| File | Role | Owner | Frequency |
|------|------|-------|-----------|
| `backend/main.go` | Dual-mode server: simple (with inline CORS) vs DB, CORS wrapper, `/health` | Backend Dev | Frequent |
| `backend/go.mod` | Module path, Go 1.25, pgx/v5 | Backend Dev | Rare |
| `backend/go.sum` | Checksums | Auto-generated | Auto |
| `backend/testbin` | **Committed binary artifact** | — | Should be gitignored |
| `backend/.gitignore` | Ignores `.env`, `dist/`, node artifacts | DevOps | Rare |

---

## Appendix B — API Reference Card

**Endpoints**

| Method | Path | Modes | Auth | Notes |
|--------|------|-------|------|-------|
| POST | `/register` | both | none | Alias of `/api/user` |
| POST | `/api/user` | both | none | Alias of `/register` |
| GET | `/health` | DB only | none | 404 in no-DB / connect-fail modes |
| OPTIONS | any | both | — | CORS preflight → 204 (handler inline in no-DB; wrapper in DB) |

**POST `/register` request**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "••••",
  "age": 25,
  "gender": "male"
}
```
- `age` **must be a JSON number**.
- `email` / `password` are accepted but **ignored** by the backend.

**Responses**

| Case | Mode | Status | Body |
|------|------|--------|------|
| Success | DB | 200 | `{"status":"ok","id":42,"name":"John Doe"}` |
| Success | No-DB | 200 | `{"status":"ok","name":"John Doe"}` |
| Wrong method | both | 405 | `method not allowed` |
| Bad JSON / age wrong type | both | 400 | `bad json` |
| DB insert error | DB | 500 | `internal server error` |
| Health | DB | 200 | `{"status":"healthy"}` |
| Health | No-DB | 404 | (mux default) |
| Valid POST but `name` omitted | DB | 500 | `internal server error` (NOT NULL violation — `UserRequest.FirstName/LastName` are not used to build `name`) |
| `age: 0` | both | 200 | accepted (no range validation) |

**Curl cheat-sheet**

```bash
# Register (works in either mode)
curl -i -X POST localhost:8080/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"John","lastName":"Doe","name":"John Doe","age":25,"gender":"male"}'

# Alias endpoint
curl -i -X POST localhost:8080/api/user \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","age":30,"gender":"female"}'

# Health (DB mode only; expect 404 otherwise)
curl -i localhost:8080/health

# Wrong method
curl -i localhost:8080/register

# Bad JSON type (age as string)
curl -i -X POST localhost:8080/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"X","age":"","gender":"m"}'

# Preflight (works in all modes now)
curl -i -X OPTIONS localhost:8080/register \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST'

# Empty name (DB mode only) — expect 500 from NOT NULL violation
curl -i -X POST localhost:8080/register \
  -H 'Content-Type: application/json' \
  -d '{"age":25,"gender":"male"}'

# age = 0 — currently accepted despite "positive integer" guidance
curl -i -X POST localhost:8080/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Zero","age":0,"gender":"male"}'
```
