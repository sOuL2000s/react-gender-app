# 🏛 Architecture

> Part of [Project Documentation](./README.md). See also: [FRONTEND.md](./FRONTEND.md), [BACKEND-API.md](./BACKEND-API.md).

## Table of contents
1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [End-to-End Data Flow](#3-end-to-end-data-flow)
4. [Repository Structure (Annotated)](#4-repository-structure-annotated)

---

## 1. Project Overview

The **React Gender App** is a minimal full-stack demo application that:

1. Presents a **web form** with three fields: **Name**, **Age**, and **Gender**.
2. On submit, sends the entered values as **JSON** via HTTP `POST` to a **Go backend**.
3. The backend **logs the received data** and responds with a JSON success message containing the user's name.
4. The frontend displays a **status message** ("Sending...", "Sent successfully!", or an error) and a **live JSON preview** of what the user has typed.

It is intentionally small — a learning/scaffolding project demonstrating how a **Vite + React 19** frontend talks to a **Go 1.22** HTTP API, including CORS handling and environment-variable configuration on both sides.

**Key characteristics:**
- No database. Data is logged only.
- No authentication or authorization.
- Single API endpoint: `POST /api/user`.
- Dev-only CORS fallback (`*`) if `FRONTEND_URL` is unset.

---

## 2. High-Level Architecture

```
┌────────────────────────┐        HTTP POST (JSON)       ┌────────────────────────┐
│                        │  ──────────────────────────►  │                        │
│  React Frontend        │     /api/user                 │  Go Backend            │
│  (Vite dev server      │                               │  (net/http server)     │
│   on :3000)            │  ◄──────────────────────────  │  on :8080              │
│                        │  200 OK {status:"ok",...}     │                        │
└────────────────────────┘                               └────────────────────────┘
        │                                                        │
        │ reads VITE_API_URL                                     │ reads PORT,
        │ (default http://localhost:8080/api/user)               │ FRONTEND_URL
        │                                                        │
   Browser env                                             Process env
```

- **Frontend port (dev):** `3000` (set in `vite.config.js`).
- **Backend port (default):** `8080` (overridable via `PORT`).
- **Transport:** JSON over HTTP/1.1.
- **Cross-origin:** Handled by backend CORS middleware (see [BACKEND-API.md §5](./BACKEND-API.md#5-cors-middleware)).

---

## 3. End-to-End Data Flow

1. **User** opens `http://localhost:3000` (Vite dev server serves `index.html` + bundled React).
2. `main.jsx` mounts `App` into `#root`.
3. User fills **Name**, **Age**, **Gender**.
4. Presses **"Submit to Backend"**.
5. `handleSubmit` builds JSON:
   ```json
   { "name": "Alice", "age": 30, "gender": "female" }
   ```
6. `fetch` POSTs to `VITE_API_URL` (default `http://localhost:8080/api/user`) with `Content-Type: application/json`.
7. Browser sends an **OPTIONS preflight** (cross-origin + JSON content type). Backend answers `204` with CORS headers.
8. Browser sends the actual **POST**. Backend:
   - Verifies method POST ✓
   - Decodes JSON into `User` ✓
   - Logs `Received user: {Name:Alice Age:30 Gender:female}`
   - Responds `200 {"status":"ok","name":"Alice"}`
9. Frontend sets status to **"Sent successfully!"**.
10. The `<pre class="preview">` continues showing the live form JSON.

---

## 4. Repository Structure (Annotated)

```
.
├── backend/                     # Go API server
│   ├── .gitignore               # Ignores node_modules, dist, .env, package.json
│   ├── go.mod                   # Go module: github.com/example/user-api, go 1.22
│   └── main.go                  # Entire backend: types, handler, CORS, server
│
├── src/                         # React frontend source
│   ├── assets/                  # Images & SVGs bundled by Vite
│   │   ├── hero.png             # Hero image (binary asset)
│   │   ├── react.svg            # React logo
│   │   └── vite.svg             # Vite logo
│   ├── main.jsx                 # React root mount (StrictMode)
│   ├── App.jsx                  # The only application component (form)
│   ├── App.css                  # Component-level styles
│   └── index.css                # Global styles / CSS variables / dark mode
│
├── public/                      # Served as-is at site root, not processed by Vite
│   ├── icons.svg                # SVG sprite: social/UI icon symbols
│   └── favicon.svg              # Browser tab icon
│
├── docs/                        # 📚 You are here
│   ├── README.md                # This index
│   ├── ARCHITECTURE.md          # Overview, diagram, data flow, repo map
│   ├── FRONTEND.md
│   ├── BACKEND-API.md
│   ├── RUNBOOK.md
│   ├── TESTING.md
│   └── NON-TECHNICAL.md
│
├── index.html                   # HTML entry point for Vite
├── vite.config.js               # Vite config (React plugin, port 3000)
├── .oxlintrc.json               # Linter config (React + Oxc rules)
├── .gitignore                   # Ignores node_modules, dist, logs, .env, editors
├── package.json                 # NPM manifest, scripts, dependencies
└── README.md                    # Short project README (links to docs/)
```

**Note:** `backend/.gitignore` ignores `package.json`, which is unusual for a Go backend but harmless — there is no `package.json` in `backend/` anyway.

---

> **File ownership & change frequency:** see [FRONTEND.md Appendix A](./FRONTEND.md#appendix-a--file-by-file-reference-matrix) and [BACKEND-API.md Appendix A](./BACKEND-API.md#appendix-a--file-by-file-reference-matrix) for per-file owner tables.
