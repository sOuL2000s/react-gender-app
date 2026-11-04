# React + Vite (Inovix Labs Auth Demo)

> 📘 **Full documentation lives in [`docs/`](./docs/README.md).**
> Start with the [documentation index](./docs/README.md) — it maps every role (developer, DevOps, QA, PM) to the right file.

A small full-stack demo: **React 19 + Vite 8 + React Router 7** frontend and a **Go 1.25 + `pgx/v5`** backend.

- **Frontend:** `/register` (default) and `/login` pages under a shared "Inovix Labs" auth layout. `/login` is a **UI-only placeholder** (no real auth).
- **Backend:** runs in **no-DB mode** (log-only, CORS allowed from any origin, no `/health`) by default, or in **Postgres mode** when `DATABASE_URL` is set and reachable (persists to `users`, CORS respects `FRONTEND_URL`, adds `/health`).

## Run

**Frontend**
```bash
npm install
npm run dev      # http://localhost:3000
```

**Backend — no DB (fastest; works end-to-end from the UI)**
```bash
cd backend
go run main.go
```

**Backend — with Postgres (recommended for anything resembling prod)**
```bash
export DATABASE_URL='postgres://postgres:postgres@localhost:5432/appdb?sslmode=disable'
export FRONTEND_URL='http://localhost:3000'
cd backend && go run main.go
```

**Env**
- Frontend: `VITE_API_URL=http://localhost:8080/register` (baked at build time)
- Backend: `DATABASE_URL`, `PORT` (default `8080`), `FRONTEND_URL` (default `*`, DB mode only)

See [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) for full setup, deployment, troubleshooting, and the env-var matrix.

## Key facts at a glance

| Item | Value |
|------|-------|
| Frontend dev port | `3000` |
| Backend port | `8080` (`PORT`) |
| Backend endpoints | `POST /register`, `POST /api/user` (alias), `GET /health` (**DB mode only**) |
| CORS | Always sent — `*` in no-DB mode; `FRONTEND_URL or *` in DB mode |
| Auth | None (Login is simulated) |
| DB | Optional Postgres; table `users` auto-created |
| Known gaps | `email`/`password` not stored; `age` can be `''` → 400; `FRONTEND_URL` ignored in no-DB mode |

See [`docs/TESTING.md §5`](./docs/TESTING.md#5-known-limitations--recommended-improvements) for the full 26-item backlog.
