# 🛠 Runbook (DevOps / Operations)

> Part of [Project Documentation](./README.md). See also: [BACKEND-API.md](./BACKEND-API.md), [TESTING.md](./TESTING.md).

## Table of contents
1. [Local Development Setup](#1-local-development-setup)
2. [Deployment & DevOps Notes](#2-deployment--devops-notes)
3. [Appendix C — Environment Variable Reference](#appendix-c--environment-variable-reference-all-contexts)
4. [Appendix D — Troubleshooting & Common Scenarios](#appendix-d--troubleshooting--common-scenarios)
5. [Appendix G — Sample `.env` Files](#appendix-g--sample-env-files-copy-paste-ready)
6. [Appendix H — Suggested CI Pipeline](#appendix-h--suggested-ci-pipeline-scaffold)

---

## 1. Local Development Setup

### Prerequisites
- Node.js ≥ 18, npm
- Go ≥ 1.25 (per `go.mod`)
- **Optional:** PostgreSQL ≥ 14 (to exercise DB mode)
- Two terminals

### Three ways to run, pick one

#### Option A — No-DB mode (fastest; works end-to-end now)
```bash
cd backend
go run main.go
# → Listening on :8080 (no DB)

# in another terminal
npm install
npm run dev
# → http://localhost:3000
```
✅ **No-DB mode sends CORS headers** (`Access-Control-Allow-Origin: *` set inside `simpleHandler`), so the browser can call `:8080` from `:3000`. You should get "Registration successful!" on a valid submit.
⚠️ **Caveat:** The origin is hardcoded to `*` — `FRONTEND_URL` is ignored in this mode. Fine for local dev; do not ship no-DB mode to a production browser surface.

#### Option B — Postgres mode (recommended for anything resembling prod)
```bash
# 1. Start a local Postgres (Docker)
docker run --rm -d --name pg-dev -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=appdb postgres:16

# 2. Run backend against it
cd backend
export DATABASE_URL='postgres://postgres:postgres@localhost:5432/appdb?sslmode=disable'
export FRONTEND_URL='http://localhost:3000'
go run main.go
# → Listening on :8080

# 3. Frontend
npm install && npm run dev
```
- Table `users` auto-created.
- CORS enabled, respects `FRONTEND_URL`.
- `/health` available.

#### Option C — No-DB + Vite proxy (optional; useful if you later tighten CORS)
Add to `vite.config.js`:
```js
server: {
  port: 3000,
  proxy: { "/register": "http://localhost:8080", "/api": "http://localhost:8080", "/health": "http://localhost:8080" },
},
```
Then set `VITE_API_URL=/register` in `.env`. Makes calls same-origin from the browser and works regardless of how backend CORS is configured.

### Verify

| Check | Command |
|-------|---------|
| Backend up | `curl -i localhost:8080/health` (DB mode) |
| Register works | `curl -i -X POST localhost:8080/register -H 'Content-Type: application/json' -d '{"name":"A","age":30,"gender":"f"}'` |
| UI loads | open http://localhost:3000 → redirected to `/register` |
| Rows inserted | `psql "$DATABASE_URL" -c 'select * from users;'` |

## 2. Deployment & DevOps Notes

### Frontend build
```bash
VITE_API_URL=https://api.example.com/register npm run build
# → dist/
```
- Deploy `dist/` to a static host.
- **SPA history fallback required** because of React Router's BrowserRouter:
  - **Nginx:** `try_files $uri $uri/ /index.html;`
  - **Netlify/Vercel:** enable SPA rewrite to `/index.html`.
  - **S3 + CloudFront:** configure error document → `/index.html`.
- `VITE_API_URL` is **baked at build time**; changing it requires a rebuild.

### Backend build
```bash
cd backend
go build -o user-api .
```
- Cross-compile: `GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o user-api .`
- Container sketch:
  ```dockerfile
  FROM golang:1.25 AS build
  WORKDIR /src
  COPY backend/ .
  RUN CGO_ENABLED=0 go build -o /out/user-api .
  FROM gcr.io/distroless/static
  COPY --from=build /out/user-api /user-api
  EXPOSE 8080
  ENTRYPOINT ["/user-api"]
  ```
- **`backend/testbin` should be removed from the repo** and added to `.gitignore` (see [TESTING.md §5](./TESTING.md#5-known-limitations--recommended-improvements) item 10).

### Environment matrix

| Environment | `VITE_API_URL` | `DATABASE_URL` | `FRONTEND_URL` | `PORT` |
|-------------|----------------|----------------|----------------|--------|
| Local no-DB | `http://localhost:8080/register` (or unset) | *(unset)* | (ignored in no-DB) | `8080` |
| Local DB | `http://localhost:8080/register` | `postgres://…` | `http://localhost:3000` | `8080` |
| Staging | `https://staging-api.example.com/register` | staging DSN | `https://staging.example.com` | `8080` |
| Prod | `https://api.example.com/register` | prod DSN | `https://example.com` | `8080` |

### Operational concerns

- ✅ Backend stateless per-request (DB does the persistence) — safe behind LB.
- ✅ DB mode exposes `/health` — usable for LB/k8s probes. **No-DB mode has no health endpoint.**
- ⚠️ **`FRONTEND_URL` is ignored in no-DB mode** — `simpleHandler` hardcodes `Access-Control-Allow-Origin: *`. Acceptable in dev only; do **not** ship no-DB mode to a browser-facing production.
- ⚠️ No server timeouts / graceful shutdown — add `http.Server{ ReadHeaderTimeout:5s, ReadTimeout:10s, WriteTimeout:10s, IdleTimeout:60s }` + `signal.Notify` + `server.Shutdown(ctx)`.
- ⚠️ No body size limit — `http.MaxBytesReader(w, r.Body, 1<<20)`.
- ⚠️ `pgx.Connect` at startup — **no pooling** and no retry. For production, use `pgxpool.Pool` (`github.com/jackc/pgx/v5/pgxpool`) and a retry/backoff on connect.
- ⚠️ `ensureTable` uses `CREATE TABLE IF NOT EXISTS` — fine for fresh installs; **not** a real migration system. Add `golang-migrate` or similar when schema evolves.
- 🔐 DB password lives in `DATABASE_URL` — keep it in a secret manager; `.env` is gitignored on both sides.
- 📝 Logs to stdout — container-friendly.
- 🧹 `gofmt` check is in CI (see Appendix H). Run `gofmt -w backend/` before pushing if you touch `.go` files.

---

## Appendix C — Environment Variable Reference (All Contexts)

| Context | Variable | Default | When read | Notes |
|---------|----------|---------|-----------|-------|
| Frontend build | `VITE_API_URL` | `http://localhost:8080/register` | Build / dev start | Baked into bundle |
| Backend runtime | `DATABASE_URL` | (empty) | Startup | Empty → no-DB mode |
| Backend runtime | `PORT` | `8080` | Startup | Listening port |
| Backend runtime | `FRONTEND_URL` | `*` | Startup (CORS, DB mode only) | `Access-Control-Allow-Origin`. **Ignored in no-DB mode.** |

**Notes**
- Frontend var: rebuild required to change.
- Backend vars: restart required to change.
- `FRONTEND_URL` and `DATABASE_URL` may contain secrets → **never commit**; use env vars or secret manager.

---

## Appendix D — Troubleshooting & Common Scenarios

### D.1 "Browser console: `Access-Control-Allow-Origin` missing"
- **As of current code, this should not happen** — both modes send CORS headers.
- If you still see it:
  1. Confirm you rebuilt the backend after pulling latest (`simpleHandler` sets CORS headers in the no-DB branch).
  2. Confirm you are not hitting an old cached binary/container.
  3. In DB mode, confirm `FRONTEND_URL` matches the actual browser origin exactly (including port, no trailing slash). If it doesn't match, the response will still have an `Access-Control-Allow-Origin` (the configured value, not `*`) and the browser will block.
  4. If you've customized CORS further, re-check the `simpleHandler` headers.

### D.1b "`FRONTEND_URL` doesn't seem to apply in no-DB mode"
- By design: `simpleHandler` hardcodes `Access-Control-Allow-Origin: *`, so `FRONTEND_URL` is ignored in no-DB mode. Use DB mode if you need origin restriction. See [TESTING.md §5 item 1](./TESTING.md#5-known-limitations--recommended-improvements) for the suggested fix.

### D.2 "Frontend `Error: HTTP 400`"
- `age` empty/string. Send integer or fix the frontend coercion.

### D.3 "Frontend `Error: HTTP 500`"
- DB mode only. Check backend log line `DB insert error: …` and the DB itself (`NOT NULL` violations, disk, permissions).

### D.4 "Backend logs `DB connection failed: … using simple handler`"
- `pgx.Connect` failed. Verify `DATABASE_URL` format (`postgres://user:pass@host:port/db?sslmode=disable`), network reachability, DB up. Server falls back to `simpleHandler`.

### D.5 "Health returns 404"
- You're not in DB mode. `/health` only exists when a successful DB connection was made.

### D.6 "Table exists but new columns missing after a code change"
- `ensureTable` only creates; it doesn't alter. Manually `ALTER TABLE` or introduce migrations.

### D.7 "Port already in use (`bind: address already in use`)"
- `PORT=8081 go run main.go` and update `VITE_API_URL` accordingly.

### D.8 "Vite picked 3001 because 3000 was busy"
- No `strictPort`. Either free 3000 or update `FRONTEND_URL` / API URL to the actual origin.

### D.9 "Login always succeeds — is auth broken?"
- By design. `pages/Login.jsx` simulates success (1s timeout) and never calls the backend.

### D.10 "CI failed on `gofmt check`"
- A `.go` file under `backend/` is not gofmt-formatted. Fix locally:
  ```bash
  cd backend
  gofmt -w .
  ```
  Review the diff, then commit. Do **not** disable the CI check — it prevents future formatting drift.

---

## Appendix G — Sample `.env` Files

**Root `.env` (frontend, gitignored)**
```bash
VITE_API_URL=http://localhost:8080/register
```

**Backend — no-DB local dev**
```bash
export PORT=8080
# leave DATABASE_URL unset
go run main.go
```

**Backend — DB local dev**
```bash
export DATABASE_URL='postgres://postgres:postgres@localhost:5432/appdb?sslmode=disable'
export FRONTEND_URL='http://localhost:3000'
export PORT=8080
go run main.go
```

**Backend — production template**
```bash
DATABASE_URL='postgres://app:${DB_PASSWORD}@db.internal:5432/app?sslmode=require'
FRONTEND_URL='https://app.example.com'
PORT=8080
```

**Frontend build — production**
```bash
VITE_API_URL=https://api.example.com/register npm run build
```

---

## Appendix H — Suggested CI Pipeline

```yaml
name: ci
on: [push, pull_request]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci            # or npm install if no lockfile
      - run: npm run lint
      - run: npm run build

  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: appdb
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s
          --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/appdb?sslmode=disable
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.25' }
      - working-directory: backend
        run: |
          go vet ./...
          go build ./...
          # go test ./...   # enable once tests exist
      - name: gofmt check
        working-directory: backend
        run: test -z "$(gofmt -l .)"
```

**What each backend gate covers:**

| Step | Fails when |
|------|-----------|
| `go vet ./...` | Suspicious constructs (unreachable code, bad format strings, etc.) |
| `go build ./...` | Compile errors |
| `gofmt check` | Any `.go` file under `backend/` is not `gofmt`-formatted |
| `go test ./...` *(when enabled)* | Test failures |

**To fix a `gofmt` failure locally:**
```bash
cd backend
gofmt -w .
# or from repo root:
gofmt -w backend/
```
