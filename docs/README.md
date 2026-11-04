# 📘 Project Documentation — Index

**Project:** React Gender App / Inovix Labs auth demo (React + Go + Postgres)
**Audience:** developers, DevOps, QA, PMs, non-technical stakeholders

## Where to start

| I am… | Start here |
|-------|------------|
| A new developer | [ARCHITECTURE.md](./ARCHITECTURE.md) → [FRONTEND.md](./FRONTEND.md) → [BACKEND-API.md](./BACKEND-API.md) |
| A DevOps engineer | [RUNBOOK.md](./RUNBOOK.md) → [BACKEND-API.md §7 env vars](./BACKEND-API.md#7-environment-variables) |
| A tester / QA | [TESTING.md](./TESTING.md) → [BACKEND-API.md §3 API contract](./BACKEND-API.md#3-api-contract) |
| A project manager / non-technical | [NON-TECHNICAL.md](./NON-TECHNICAL.md) |
| Just trying to run it | [RUNBOOK.md §1 Local setup](./RUNBOOK.md#1-local-development-setup) |

## Document map

| File | Covers | Primary owner |
|------|--------|---------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Project overview, high-level diagram, dual-mode backend, end-to-end data flow | Maintainers |
| [FRONTEND.md](./FRONTEND.md) | React app: stack, routing, pages (Register/Login), styling, assets, Vite, Oxlint, env vars, scripts | Frontend dev |
| [BACKEND-API.md](./BACKEND-API.md) | Go API: dual-mode (no-DB vs Postgres), endpoints, models, CORS, health, env vars, API card | Backend dev |
| [RUNBOOK.md](./RUNBOOK.md) | Local setup, Postgres, deployment/DevOps, troubleshooting, sample `.env`, CI scaffold | DevOps |
| [TESTING.md](./TESTING.md) | Manual QA checklists (per mode), suggested automated tests, limitations, Definition of Done | QA / all |
| [NON-TECHNICAL.md](./NON-TECHNICAL.md) | Plain-English summary + glossary | PM / stakeholders |

## Recent changes (v0.1.0 → current)

- **Frontend now multi-page:** `react-router-dom@7`, `/register` and `/login` routes, `/` redirects to `/register`.
- **Backend now dual-mode:** runs without a DB (in-memory log-only), or with `DATABASE_URL` set → Postgres via `pgx/v5`. Adds `/health` in DB mode only.
- **Known gap:** frontend sends `email`/`password` but backend does **not** store them; register endpoint is not real auth.

## Keeping docs in sync

Whenever the API shape, env vars, ports, or scripts change, update **the same PR**:
- [BACKEND-API.md §3](./BACKEND-API.md#3-api-contract) (contract)
- [BACKEND-API.md §7](./BACKEND-API.md#7-environment-variables) + [FRONTEND.md §8](./FRONTEND.md#8-environment-variables) (env vars)
- [TESTING.md](./TESTING.md) checklists

**Source of truth:** the code. If a doc disagrees with the code, the code wins — open a doc-fix PR.
