# 🛠 Runbook (DevOps / Operations)

> Part of [Project Documentation](./README.md). See also: [BACKEND-API.md](./BACKEND-API.md), [TESTING.md](./TESTING.md).

## Table of contents
1. [Local Development Setup](#1-local-development-setup)
2. [Deployment & DevOps Notes](#2-deployment--devops-notes)
3. [Appendix D — Troubleshooting & Common Scenarios](#appendix-d--troubleshooting--common-scenarios)
4. [Appendix C — Environment Variable Reference (All Contexts)](#appendix-c--environment-variable-reference-all-contexts)
5. [Appendix G — Sample `.env` Files](#appendix-g--sample-env-files-copy-paste-ready)
6. [Appendix H — Suggested CI Pipeline](#appendix-h--suggested-ci-pipeline-scaffold)

---

## 1. Local Development Setup

### Prerequisites
- **Node.js** ≥ 18 (Vite 8 & React 19 expectations) — use an LTS.
- **npm** (bundled with Node).
- **Go** 1.22+.
- Two terminals (frontend + backend).

### Step-by-step

**Terminal 1 — Backend**
```bash
cd backend
go run main.go
# → Listening on :8080
```
Optional env:
```bash
PORT=9090 FRONTEND_URL=http://localhost:3000 go run main.go
```

**Terminal 2 — Frontend**
```bash
npm install
npm run dev
# → Local: http://localhost:3000
```
Optional `.env` at repo root:
```markdown
VITE_API_URL=http://localhost:8080/api/user
```

**Verify:**
- Open http://localhost:3000.
- Submit the form.
- Check backend terminal for `Received user: ...`.
- Frontend shows **"Sent successfully!"**.

### Quick API smoke test (no UI)
```bash
curl -i -X POST http://localhost:8080/api/user \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","age":30,"gender":"female"}'
```
Expected: `200 OK`, body `{"status":"ok","name":"Alice"}`.

Method guard test:
```bash
curl -i http://localhost:8080/api/user
# → 405 method not allowed
```

Bad JSON test:
```bash
curl -i -X POST http://localhost:8080/api/user \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","age":"","gender":"female"}'
# → 400 bad json  (because "" is not an int)
```

---

## 2. Deployment & DevOps Notes

### Frontend build
```bash
npm ci        # if lockfile exists; otherwise npm install
npm run build # → dist/
```
- Deploy `dist/` to any static host (S3+CloudFront, Netlify, Vercel, Nginx).
- **Set `VITE_API_URL` at build time** to the production backend URL:
  ```bash
  VITE_API_URL=https://api.example.com/api/user npm run build
  ```
- SPA routing: currently only `/` — if you add a router later, configure history fallback to `index.html`.

### Backend build
```bash
cd backend
go build -o user-api .
./user-api
```
- Cross-compile example: `GOOS=linux GOARCH=amd64 go build -o user-api .`
- No external deps → simple container image possible:
  ```dockerfile
  FROM golang:1.22 AS build
  WORKDIR /src
  COPY backend/ .
  RUN CGO_ENABLED=0 go build -o /out/user-api .

  FROM gcr.io/distroless/static
  COPY --from=build /out/user-api /user-api
  EXPOSE 8080
  ENTRYPOINT ["/user-api"]
  ```

### Environment matrix

| Environment | Frontend `VITE_API_URL` | Backend `PORT` | Backend `FRONTEND_URL` |
|-------------|-------------------------|----------------|------------------------|
| Local | `http://localhost:8080/api/user` (or unset) | `8080` | `http://localhost:3000` (or unset → `*`) |
| Staging | `https://staging-api.example.com/api/user` | `8080` | `https://staging.example.com` |
| Prod | `https://api.example.com/api/user` | `8080` | `https://example.com` |

### Operational concerns for DevOps
- ✅ Stateless backend — horizontally scalable behind a load balancer.
- ✅ No DB → no backup/migration needs.
- ⚠️ No health endpoint — **recommend adding `/healthz`** before adding to a load balancer / k8s probes.
- ⚠️ No server timeouts — add `http.Server{ReadHeaderTimeout: 5s, ReadTimeout: 10s, WriteTimeout: 10s, IdleTimeout: 60s}`.
- ⚠️ No graceful shutdown — add `signal.Notify` + `server.Shutdown(ctx)`.
- ⚠️ No request size limit — add `http.MaxBytesReader(w, r.Body, 1<<20)`.
- ✅ Logs go to stdout via `log` — compatible with container log collectors.
- 🔐 No secrets currently required — safe to run without env vars in dev.

---

## Appendix D — Troubleshooting & Common Scenarios

### D.1 "Frontend shows `Error: Failed to fetch`"
1. Is the backend running? `curl -i -X POST localhost:8080/api/user -H 'Content-Type: application/json' -d '{"name":"x","age":1,"gender":"m"}'`
2. Does `VITE_API_URL` point to a reachable URL? (Check browser DevTools → Network tab.)
3. Is CORS blocking? Look for a CORS error in the browser console. If present, set `FRONTEND_URL=http://localhost:3000` on the backend and restart.
4. Rebuild/restart the frontend if you changed `VITE_API_URL`.

### D.2 "Frontend shows `Error: HTTP 400`"
- The `age` field is missing/empty/string. Confirm the form sends a number. If calling the API directly, send an integer for `age`.

### D.3 "Frontend shows `Error: HTTP 405`"
- The call is not a POST. Check the request method in DevTools.

### D.4 "Backend exits immediately with `listen tcp :8080: bind: address already in use`"
- Another process owns port 8080. Either stop it or run with `PORT=8081 go run main.go` (and update `VITE_API_URL` accordingly).

### D.5 "Browser blocks form submit / no request is made"
- All three inputs are `required` and `age` is `type="number"` — invalid values prevent submission. Check browser validity tooltips.

### D.6 "Colors look wrong / unreadable in dark mode"
- The OS dark-mode media query in `index.css` swaps CSS variables, while `App.css` hard-codes `#f6f7fb`/`#111`. If contrast is poor, this is a CSS-layer conflict (see [TESTING.md §4](./TESTING.md#4-known-limitations--recommended-improvements)). Toggle OS theme to compare.

### D.7 "Port 3000 is busy; Vite picked 3001"
- Vite has no `strictPort` set, so it auto-increments. Either free 3000 or set the backend's `FRONTEND_URL` to the actual origin (or leave it unset for `*` in dev).

---

## Appendix C — Environment Variable Reference (All Contexts)

| Context | Variable | Default | When read | Who sets it |
|---------|----------|---------|-----------|-------------|
| Frontend (build) | `VITE_API_URL` | `http://localhost:8080/api/user` | Build / dev-server start | Frontend dev / DevOps |
| Backend (runtime) | `PORT` | `8080` | Process start | DevOps |
| Backend (runtime) | `FRONTEND_URL` | `*` | Process start (CORS wrapper) | DevOps |

**Notes**
- Frontend var is **baked into the bundle** — redeploy/rebuild required to change it.
- Backend vars are read **once at startup** — a restart is required to change them.
- No secrets are currently consumed by either side.

---

## Appendix G — Sample `.env` Files (Copy-Paste Ready)

**Root `.env` (frontend, gitignored)**
```bash
# Where the React app sends form submissions
VITE_API_URL=http://localhost:8080/api/user
```

**Backend environment (exported in shell or via container env)**
```bash
# ./backend local dev example
export PORT=8080
export FRONTEND_URL=http://localhost:3000
go run main.go
```

**Production template (backend)**
```bash
PORT=8080
FRONTEND_URL=https://app.example.com   # never leave this unset in prod
```

**Production build command (frontend)**
```bash
VITE_API_URL=https://api.example.com/api/user npm run build
```

---

## Appendix H — Suggested CI Pipeline (Scaffold)

A minimal, pragmatic CI config sketch (GitHub Actions-style pseudocode) covering both halves of the repo:

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
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - working-directory: backend
        run: |
          go vet ./...
          go build ./...
          # go test ./...   # enable once main_test.go exists
```

**What this guarantees:** no lint regressions, no broken frontend build, no broken Go build. Add `go test` and Vitest once those tests exist (see [TESTING.md §3](./TESTING.md#3-suggested-automated-tests)).
