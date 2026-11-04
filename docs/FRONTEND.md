# ⚛ Frontend Documentation

> Part of [Project Documentation](./README.md). See also: [ARCHITECTURE.md](./ARCHITECTURE.md), [BACKEND-API.md](./BACKEND-API.md).

## Table of contents
1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Entry Point & Bootstrapping](#2-entry-point--bootstrapping)
3. [Component: `App.jsx` (The User Form)](#3-component-appjsx-the-user-form)
4. [Styling System](#4-styling-system)
5. [Assets, Icons & Public Files](#5-assets-icons--public-files)
6. [Build Tooling (Vite)](#6-build-tooling-vite)
7. [Linting (Oxlint)](#7-linting-oxlint)
8. [Environment Variables (Frontend)](#8-environment-variables-frontend)
9. [Frontend Scripts Reference](#9-frontend-scripts-reference)
10. [Appendix A — File-by-File Reference Matrix](#appendix-a--file-by-file-reference-matrix)

---

## 1. Tech Stack & Dependencies

From `package.json`:

| Type | Package | Version | Purpose |
|------|---------|---------|---------|
| Runtime | `react` | ^19.3.1 | UI library |
| Runtime | `react-dom` | ^19.3.1 | DOM renderer |
| Dev | `@types/react` | ^19.3.0 | TypeScript type hints (editor) |
| Dev | `@types/react-dom` | ^19.3.0 | TypeScript type hints (editor) |
| Dev | `@vitejs/plugin-react` | ^6.1.2 | Vite plugin using Oxc transform |
| Dev | `oxlint` | ^1.89.0 | Fast Rust-based linter |
| Dev | `vite` | ^8.3.5 | Build tool & dev server |

- **Module system:** ESM (`"type": "module"`).
- **Package manager:** npm (scripts use `npm`; lockfile not included).
- **React 19** is used — note `react-dom/client`'s `createRoot` API.
- The **React Compiler is intentionally NOT enabled** (per README), to preserve dev/build performance.

## 2. Entry Point & Bootstrapping

**`index.html`** (served by Vite)
- Sets `<html lang="en">`.
- Loads `/favicon.svg` as icon.
- Sets viewport for responsive rendering.
- Title: `react-gender-app`.
- Contains `<div id="root">` — the mount point.
- Loads `/src/main.jsx` as a **module** script (Vite handles bundling).

**`src/main.jsx`**
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```
- Imports **global CSS** (`index.css`) first.
- Renders `<App />` inside `<StrictMode>` (enables React dev-time checks: double-render, effect sanity checks).
- Uses React 19's `createRoot` from `react-dom/client`.

## 3. Component: `App.jsx` (The User Form)

`App.jsx` is the **entire application UI**. It is a single function component.

### State (via `useState`)

| State | Initial | Type | Purpose |
|-------|---------|------|---------|
| `name` | `''` | string | Controlled input for name |
| `age` | `''` | string | Controlled input for age (kept as string in input) |
| `gender` | `''` | string | Controlled input for gender |
| `status` | `''` | string | User-facing status message |

### API Endpoint Resolution
```js
const API_ENDPOINT =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/user'
```
- Uses Vite's `import.meta.env` mechanism.
- Falls back to localhost:8080 for local dev.
- `VITE_API_URL` must be prefixed with `VITE_` to be exposed to client code.

### Submit Handler (`handleSubmit`)
1. **Prevents default form submission** (no page reload).
2. Builds payload:
   ```js
   { name, age: age ? Number(age) : '', gender }
   ```
   - `age` is converted from string to **number**; if empty, it becomes `''` (which the backend expects to be an int — see limitations).
3. Sets status to `'Sending...'`.
4. `fetch(API_ENDPOINT, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })`.
5. If response is **not** `ok` (non-2xx), throws `Error("HTTP <status>")`.
6. On success → `'Sent successfully!'`.
7. On any error → logs to console and sets `'Error: <message>'`.

### Rendered UI Structure
```
<div class="container">
  <h1>User Form</h1>
  <form onSubmit={handleSubmit}>
    <label> Name   <input ... required /> </label>
    <label> Age    <input type="number" ... required /> </label>
    <label> Gender <input ... required /> </label>
    <button type="submit">Submit to Backend</button>
  </form>
  {status && <p class="status">{status}</p>}
  <pre class="preview">{JSON.stringify({ name, age, gender }, null, 2)}</pre>
</div>
```

- **All three fields are `required`** — browser will block submit if empty.
- `age` input is `type="number"`.
- The `preview` block **always shows** the current form values as pretty-printed JSON (2-space indent) — useful for demos/debugging.

### Behavior Notes for Testers
- Submitting with all fields fills → happy path.
- Submitting invalid age (non-numeric) → browser blocks (type=number).
- Backend down → status shows `Error: Failed to fetch`.
- Backend returns non-2xx → status shows `Error: HTTP <code>`.
- The UI does **not** clear after submit; it does **not** display the server's response body.

## 4. Styling System

There are **two CSS files** with **overlapping global selectors** — be aware of cascade order.

### `src/index.css` (Global)
Loaded in `main.jsx`. Defines:
- CSS custom properties (`--text`, `--bg`, `--accent`, `--border`, `--shadow`, etc.) on `:root`.
- **Light/dark mode** via `@media (prefers-color-scheme: dark)` — automatically switches palette.
- Font stack: system-ui / Segoe UI / Roboto; monospace stack for code.
- Base font-size `18px` (16px under 1024px width).
- `#root` is set to a **1126px max-width centered column** with side borders (`border-inline`), `min-height: 100svh`, flex column, centered text.
- Large `h1` (56px) and `h2` (24px) styles with responsive reductions.
- `code` and `.counter` styling.

### `src/App.css` (Component)
Imported in `App.jsx`. Defines:
- Universal reset (`* { box-sizing:border-box; margin:0; padding:0 }`).
- `body` font/background — **note:** this conflicts with `index.css` `:root` background; `App.css`'s `body` rule appears later in bundle, may override.
- `#root` centering with `min-height:100vh`, flex center, 2rem padding — **overrides** the `#root` layout from `index.css` (since App.css is imported after index.css in module graph order).
- `.container` — white card, 12px radius, shadow, max-width 420px.
- `form` — vertical flex with 1rem gap.
- `label` — column flex, 0.9rem, 500 weight.
- `input` — padding, 1px `#ddd` border, 8px radius, focus outline `#6366f1`.
- `button` — indigo (`#6366f1`), white text, 600 weight; hover `#4f46e5`.
- `.status` — centered, bold-ish text.
- `.preview` — light grey block, rounded, monospace-ish small text, horizontal scroll.

**Cascade caution:** Both files style `body` and `#root`. Effective look depends on import order (index.css → App.css via module graph). Testers should validate appearance in both light and dark OS modes. (Known cleanup item — see [TESTING.md §4](./TESTING.md#4-known-limitations--recommended-improvements).)

## 5. Assets, Icons & Public Files

- **`src/assets/hero.png`** — binary image; available as URL reference from external source (GitHub raw link in file listing). Not currently imported by `App.jsx`.
- **`src/assets/react.svg`** — React logo SVG (Iconify style, `#00D8FF`). Not imported by current code.
- **`src/assets/vite.svg`** — Vite logo SVG with blurred gradient background. Not imported by current code.
- **`public/icons.svg`** — SVG **sprite** defining symbols: `bluesky-icon`, `discord-icon`, `documentation-icon`, `github-icon`, `social-icon`, `x-icon`. Intended to be used via `<svg><use href="/icons.svg#github-icon"/></svg>`. Not currently used by `App.jsx` — likely leftovers from a template.
- **`public/favicon.svg`** — Purple Vite-style lightning bolt favicon, loaded by `index.html`.

**Note for DevOps:** `public/` contents are copied verbatim to the build output root (`dist/`). `src/assets/` are hashed and processed by Vite at build time.

## 6. Build Tooling (Vite)

**`vite.config.js`**
```js
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
});
```
- **React plugin** — uses Oxc-based transform (per README), enables Fast Refresh (HMR).
- **Dev server port hard-set to `3000`** (note: `strictPort` is NOT set, so Vite may pick 3001 if 3000 is busy — testers should confirm the printed URL).
- No `build.outDir` override → default `dist/`.
- No proxy configured — the frontend calls the backend directly cross-origin (hence backend CORS).

## 7. Linting (Oxlint)

**`.oxlintrc.json`**
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```
- **`react/rules-of-hooks` (error)** — enforces hook call rules.
- **`react/only-export-components` (warn)** — warns if a module exports non-components alongside components (Fast Refresh friendliness), allowing constant exports.
- Run with `npm run lint`.

## 8. Environment Variables (Frontend)

| Variable | Required | Default | Consumed in | Notes |
|----------|----------|---------|-------------|-------|
| `VITE_API_URL` | No | `http://localhost:8080/api/user` | `App.jsx` | Must start with `VITE_` to reach the browser. Set in `.env` (gitignored). |

- **Baked at build time** by Vite — changing it requires a rebuild/restart of dev server. It is **not** a runtime variable.
- Example `.env`:
  ```
  VITE_API_URL=https://api.example.com/api/user
  ```
- Full env-var matrix (frontend + backend): see [BACKEND-API.md §7](./BACKEND-API.md#7-environment-variables).

## 9. Frontend Scripts Reference

| Command | What it does | When to use |
|---------|--------------|-------------|
| `npm install` | Installs dependencies | First setup |
| `npm run dev` | Starts Vite dev server on :3000 with HMR | Local development |
| `npm run build` | Production build → `dist/` | Before deploy |
| `npm run preview` | Serves the built `dist/` locally | Verify prod build |
| `npm run lint` | Runs Oxlint | CI / pre-commit |

---

## Appendix A — File-by-File Reference Matrix

| File | Role | Primary Owner | Change Frequency |
|------|------|---------------|------------------|
| `index.html` | HTML shell, mounts React | Frontend Dev | Rare |
| `src/main.jsx` | React bootstrap + StrictMode | Frontend Dev | Rare |
| `src/App.jsx` | Entire form UI + submit logic | Frontend Dev | Frequent |
| `src/App.css` | Card/form/button styling | Frontend Dev / Designer | Occasional |
| `src/index.css` | Global theme, CSS vars, dark mode | Frontend Dev / Designer | Occasional |
| `src/assets/hero.png` | Unused hero image | Designer | Rare |
| `src/assets/react.svg` | React logo (unused) | — | Static |
| `src/assets/vite.svg` | Vite logo (unused) | — | Static |
| `public/icons.svg` | SVG sprite of UI/social icons (unused by app) | Designer | Rare |
| `public/favicon.svg` | Browser tab icon | Designer | Rare |
| `vite.config.js` | Dev server port + React plugin | Frontend Dev | Rare |
| `.oxlintrc.json` | Lint rules | Frontend Dev | Rare |
| `package.json` | Deps + scripts | Frontend Dev | Occasional |
