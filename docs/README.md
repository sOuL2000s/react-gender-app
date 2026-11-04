# 📘 Project Documentation — Index

**Project:** React Gender App (React + Go full-stack demo)
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
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Project overview, high-level diagram, end-to-end data flow | Maintainers |
| [FRONTEND.md](./FRONTEND.md) | React app: stack, entry point, `App.jsx`, styling, assets, Vite, Oxlint, env vars, scripts | Frontend dev |
| [BACKEND-API.md](./BACKEND-API.md) | Go API: stack, endpoint contract, `User` model, handler, CORS, bootstrap, env vars, quick-reference card | Backend dev |
| [RUNBOOK.md](./RUNBOOK.md) | Local setup, deployment/DevOps, troubleshooting, sample `.env`, CI scaffold | DevOps |
| [TESTING.md](./TESTING.md) | Manual QA checklists, suggested automated tests, Definition of Done | QA / all |
| [NON-TECHNICAL.md](./NON-TECHNICAL.md) | Plain-English summary + glossary | PM / stakeholders |

## Keeping docs in sync

Whenever the API shape, env vars, ports, or scripts change, update **the same PR**:
- [BACKEND-API.md §3](./BACKEND-API.md#3-api-contract) (contract)
- [BACKEND-API.md §7](./BACKEND-API.md#7-environment-variables) + [FRONTEND.md §8](./FRONTEND.md#8-environment-variables) (env vars)
- [TESTING.md](./TESTING.md) checklists

**Source of truth:** the code. If a doc disagrees with the code, the code wins — open a doc-fix PR.
