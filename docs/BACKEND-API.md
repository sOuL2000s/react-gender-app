# 🔌 Backend API Documentation

> Part of [Project Documentation](./README.md). See also: [ARCHITECTURE.md](./ARCHITECTURE.md), [FRONTEND.md](./FRONTEND.md), [RUNBOOK.md](./RUNBOOK.md).

## Table of contents
1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Server Entry & Bootstrap (`main`)](#2-server-entry--bootstrap-main)
3. [API Contract](#3-api-contract)
4. [Data Model (`User` Struct)](#4-data-model-user-struct)
5. [Handler Logic (`userHandler`)](#5-handler-logic-userhandler)
6. [CORS Middleware](#6-cors-middleware)
7. [Environment Variables](#7-environment-variables)
8. [Appendix A — File-by-File Reference Matrix](#appendix-a--file-by-file-reference-matrix)
9. [Appendix B — API Reference Card](#appendix-b--api-reference-card)

---

## 1. Tech Stack & Dependencies

- **Language:** Go **1.22** (per `go.mod`).
- **Module path:** `github.com/example/user-api`.
- **Standard library only:** `encoding/json`, `log`, `net/http`, `os`. **No third-party deps.**
- Single file: `backend/main.go` (~60 lines).

## 2. Server Entry & Bootstrap (`main`)

1. Creates `http.NewServeMux()` and registers `"/api/user"` → `userHandler`.
2. Reads `FRONTEND_URL` (CORS origin) — default `*` (see §6).
3. Wraps mux in CORS handler (see §6).
4. Reads `PORT` env — default `"8080"`.
5. Logs `Listening on :<port>`.
6. `log.Fatal(http.ListenAndServe(":"+port, handler))` — blocks; fatal on error.

**Notes:**
- Uses Go's default server — **no read/write/idle timeouts configured**. Recommended for production: wrap in `&http.Server{ ReadHeaderTimeout, ReadTimeout, WriteTimeout, IdleTimeout }`.
- No graceful shutdown (SIGTERM handling).
- No health-check endpoint (e.g. `/healthz`).

## 3. API Contract

### `POST /api/user`

**Request**
- Method: `POST` (only method allowed; others → `405 Method Not Allowed`).
- Headers: `Content-Type: application/json`.
- Body:
  ```json
  { "name": "Alice", "age": 30, "gender": "female" }
  ```
  | Field | JSON key | Go type | Required in practice |
  |-------|----------|---------|----------------------|
  | Name | `name` | string | Yes (semantically) |
  | Age | `age` | int | Yes (semantically) |
  | Gender | `gender` | string | Yes (semantically) |

**Success Response — `200 OK`**
```json
{ "status": "ok", "name": "Alice" }
```
- Header: `Content-Type: application/json`.

**Error Responses**

| Status | Body (plain text via `http.Error`) | Trigger |
|--------|-----------------------------------|---------|
| `405 Method Not Allowed` | `method not allowed` | Any method other than POST (e.g. GET) |
| `400 Bad Request` | `bad json` | Body is not valid JSON or types mismatch (e.g. `age` as `""` or string) |

> **⚠️ Important cross-cutting bug risk:** The frontend sends `age: ""` when the age input is empty. The Go struct has `Age int`, so `""` cannot unmarshal into `int` → backend returns **400 bad json**. In practice the form's `required` + `type=number` prevents empty submit in-browser, but API consumers and programmatic tests must send a **number** for `age`.

**OPTIONS preflight** → `204 No Content` with CORS headers (see §6).

## 4. Data Model (`User` Struct)

```go
type User struct {
    Name   string `json:"name"`
    Age    int    `json:"age"`
    Gender string `json:"gender"`
}
```
- JSON tags map lower-case keys to Go fields.
- Strict typing: `Age` is `int`. Unknown JSON fields are ignored (Go default behavior, no `DisallowUnknownFields`).
- No validation tags (no `validator` lib), no length checks, no age range checks.

## 5. Handler Logic (`userHandler`)

`func userHandler(w http.ResponseWriter, r *http.Request)`
1. **Method check:** if `r.Method != POST` → `405 method not allowed`.
2. **Decode:** `json.NewDecoder(r.Body).Decode(&u)`; on error → `400 bad json`.
3. **Log:** `log.Printf("Received user: %+v\n", u)` — prints to stdout/logs. This is the only "persistence".
4. **Respond:** sets `Content-Type: application/json`, writes `200`, encodes `{"status":"ok","name":u.Name}`.

**Notes:**
- No request body size limit (`http.MaxBytesReader` not used) — potential DoS vector in production.
- No timeout on body read.
- No context cancellation checks.
- Errors from `json.NewEncoder(...).Encode(...)` are ignored.

## 6. CORS Middleware

Wrapping `http.HandlerFunc` around the mux:

```go
origin := os.Getenv("FRONTEND_URL")
if origin == "" { origin = "*" } // local dev

handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", origin)
    w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusNoContent)
        return
    }
    mux.ServeHTTP(w, r)
})
```

- **`Access-Control-Allow-Origin`**: reflects `FRONTEND_URL` env, else `*`.
- **Allowed methods:** `POST, OPTIONS` only.
- **Allowed headers:** `Content-Type` only.
- **Preflight:** `OPTIONS` short-circuits with `204 No Content`.
- **Not set:** `Access-Control-Allow-Credentials`, `Access-Control-Max-Age`, `Vary: Origin`. With credentials not used this is fine for the demo, but for production:
  - Setting `*` while also sending cookies would fail — keep `*` only for unauthenticated APIs.
  - Add `Vary: Origin` if you later make origin dynamic per request.

## 7. Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | No | `8080` | TCP port to listen on |
| `FRONTEND_URL` | No | `*` | Value for `Access-Control-Allow-Origin` |

**Example production env:**
```bash
PORT=8080
FRONTEND_URL=https://app.example.com
```

> `backend/.gitignore` includes `.env` — safe for secrets if you later add any.

Full env-var matrix across contexts: see [RUNBOOK.md Appendix C](./RUNBOOK.md#appendix-c--environment-variable-reference-all-contexts).

---

## Appendix A — File-by-File Reference Matrix

| File | Role | Primary Owner | Change Frequency |
|------|------|---------------|------------------|
| `backend/main.go` | API handler, CORS, server | Backend Dev | Frequent |
| `backend/go.mod` | Module path + Go version | Backend Dev | Rare |
| `backend/.gitignore` | Ignores env/node artifacts in backend | DevOps | Rare |

---

## Appendix B — API Reference Card

**Endpoint:** `POST /api/user`

**Request headers**
```
Content-Type: application/json
```

**Request body (exact shape)**
```json
{ "name": "string", "age": 0, "gender": "string" }
```
- `age` **must be a JSON number** — strings and `""` cause `400`.
- Extra/unknown fields are silently ignored.

**Responses**

| Case | Status | Content-Type | Body |
|------|--------|--------------|------|
| Success | `200` | `application/json` | `{"status":"ok","name":"<echoed name>"}` |
| Wrong method (e.g. GET) | `405` | `text/plain` | `method not allowed` |
| Malformed / type-mismatched JSON | `400` | `text/plain` | `bad json` |
| CORS preflight (OPTIONS) | `204` | — | (empty) + CORS headers |

**CORS headers on every response**
```
Access-Control-Allow-Origin: <FRONTEND_URL or *>
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**Curl cheat-sheet**
```bash
# Success
curl -i -X POST localhost:8080/api/user -H 'Content-Type: application/json' \
  -d '{"name":"Alice","age":30,"gender":"female"}'

# Wrong method
curl -i localhost:8080/api/user

# Bad JSON type
curl -i -X POST localhost:8080/api/user -H 'Content-Type: application/json' \
  -d '{"name":"Alice","age":"","gender":"female"}'

# Preflight
curl -i -X OPTIONS localhost:8080/api/user \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST'
```
