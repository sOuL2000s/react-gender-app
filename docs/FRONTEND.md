# ⚛ Frontend Documentation

> Part of [Project Documentation](./README.md). See also: [ARCHITECTURE.md](./ARCHITECTURE.md), [BACKEND-API.md](./BACKEND-API.md).

## Table of contents
1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Entry Point & Routing](#2-entry-point--routing)
3. [Pages](#3-pages)
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
| Runtime | `react-router-dom` | **^7.18.5** | Client-side routing |
| Dev | `@types/react` | ^19.3.0 | TypeScript type hints (editor) |
| Dev | `@types/react-dom` | ^19.3.0 | TypeScript type hints (editor) |
| Dev | `@vitejs/plugin-react` | ^6.1.2 | Vite plugin using Oxc transform |
| Dev | `oxlint` | ^1.89.0 | Fast Rust-based linter |
| Dev | `vite` | ^8.3.5 | Build tool & dev server |

- **Module system:** ESM (`"type": "module"`).
- **React 19**, **React Router 7**.
- No lockfile in repo — `npm install` resolves latest-compatible.

## 2. Entry Point & Routing

**`index.html`**
- Loads `/favicon.svg`; title is **`Test App`** (the built `dist/index.html` says `react-gender-app` — rebuild will reset it); mounts `<div id="root">`; loads `/src/main.jsx`.

**`src/main.jsx`** *(updated)*
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```
- Wraps `<App/>` in `<BrowserRouter>` — enables client routing.
- Uses `history` API; **requires** the static host to fall back to `index.html` for unknown paths in production (see [RUNBOOK.md §2](./RUNBOOK.md#2-deployment--devops-notes)).

**`src/App.jsx`** *(rewritten — now a router)*
```jsx
import { Routes, Route, Navigate } from "react-router-dom";
import RegisterPage from "./pages/Register.jsx";
import LoginPage from "./pages/Login.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}
export default App;
```
- `/` → redirects to `/register` (replace history).
- `/register` → `<RegisterPage/>`.
- `/login` → `<LoginPage/>`.
- **No 404 route** — unknown paths render nothing (blank `<Routes/>`). Consider a catch-all later.

**`src/mainApp.jsx`** *(unused)*
```jsx
import { Register } from './pages/Register'
import './App.css'
function App() { return <Register /> }
export default App
```
- Leftover alternate entry. **Not referenced** by `index.html` or `main.jsx`. Safe to delete. Note it imports a **named** `Register`, but `pages/Register.jsx` has only a **default** export — this file would fail if ever loaded.

## 3. Pages

### 3.1 `src/pages/Register.jsx`

**Purpose:** primary page. Collects user details and POSTs to the backend.

**State (`useState`)**

| State | Init | Type |
|-------|------|------|
| `firstName` | `""` | string |
| `lastName` | `""` | string |
| `email` | `""` | string |
| `password` | `""` | string |
| `age` | `""` | string |
| `gender` | `""` | string (`male`/`female`/`other`) |
| `status` | `""` | string |

**API endpoint**
```js
const API_ENDPOINT =
  import.meta.env.VITE_API_URL || "http://localhost:8080/register";
```
- Default now points to **`/register`** (not `/api/user`).
- ⚠️ **The committed `dist/` bundle does NOT match this.** It hardcodes `http://localhost:8080/api/user` (no `import.meta.env` substitution). Rebuild before deploy.

**Payload sent**
```js
{
  firstName, lastName,
  name: `${firstName} ${lastName}`.trim(),
  email, password,
  age: age ? Number(age) : "",
  gender,
}
```
- `name` is derived by joining first + last.
- `age` becomes a **number** if non-empty, else `""` (⚠️ see limitation — backend expects int).
- `email` and `password` are **sent but ignored** by the backend (see [BACKEND-API.md §4](./BACKEND-API.md#4-data-models)).

**Submit handler**
1. `preventDefault()`, set status `"Sending..."`.
2. `fetch` POST JSON.
3. On `!res.ok` → throw `HTTP <status>`.
4. On success → `await res.json()` (ignored), set status `"Registration successful!"`, **reset all six fields**.
5. On error → `console.error`, status `Error: <msg>`.

**UI structure**

```
<div.auth-container>
  <div.auth-wrapper>
    <div.auth-branding>
      🚀 Inovix Labs
      tagline + <ul.brand-features> (3 checkmarks)
    </div>
    <div.auth-form-section>
      <header: "Create Account" / "Start your journey with us today">
      <form>
        <field First Name (required)>
        <field Last Name  (required)>
        <field Email (type=email, required)>
        <field Password (type=password, required)>
        <field Age (type=text, pattern="[0-9]*", required)>
        <field Gender (select: Male/Female/Other, required)>
        <button.auth-btn>Create Account</button>
      </form>
      {status && <p.status>{status}</p>}
      <p.auth-footer>Already have an account? <Link to="/login">Sign In</Link></p>
    </div>
  </div>
</div>
```

**Notes for QA**
- Age is `type="text"` with `pattern="[0-9]*"` — browser blocks non-digit input on submit (HTML5 pattern check).
- Gender uses a `<select>` with an empty placeholder option (`required` → blocked until chosen).
- On success the form clears; the status message remains until next submit.
- Backend response body is **not displayed** (only used to satisfy `await res.json()`).
- On error, the server's response body is **discarded** — the user only sees `Error: HTTP <code>`. Consider reading `res.text()` and surfacing the server's message.
- ⚠️ **The committed `dist/` bundle does not match this component**: it posts to `http://localhost:8080/api/user` with a hardcoded URL and ignores `VITE_API_URL`. Rebuild before testing the built artifact.

### 3.2 `src/pages/Login.jsx`

**Purpose:** UI-only login placeholder. **Does not call the backend.**

**State:** `email`, `password`, `status`.

**Submit handler**
1. `preventDefault()`, status `"Logging in..."`.
2. `await new Promise(r => setTimeout(r, 1000))` — simulated latency.
3. status `"Login successful!"`.
4. No redirect, no token, no storage, no API call.

**UI structure**

```
<div.auth-container>
  <div.auth-wrapper>
    <div.auth-branding>  (same branding as Register)
    <div.auth-form-section>
      <header: "Welcome Back" / "Sign in to your account to continue">
      <form>
        <field Email (type=email, required)>
        <field Password (type=password, required)>
        <button.auth-btn>Sign In</button>
      </form>
      {status && <p.status>{status}</p>}
      <p.auth-footer>Don't have an account? <Link to="/register">Create Account</Link></p>
    </div>
  </div>
</div>
```

**Notes for QA**
- Every click submits and "succeeds" — this is a demo, not auth.
- No navigation on success (stays on `/login`).
- Cross-link to `/register` works via React Router.

## 4. Styling System

There are **two CSS files** with different themes now coexisting.

### `src/index.css` (global, legacy)
Loaded first in `main.jsx`. Defines `:root` CSS variables (`--text`, `--bg`, `--accent`, `--shadow` …), a light/dark palette via `prefers-color-scheme`, system font stack, and a `#root` layout (1126px max-width column, side borders, flex column, centered text, `min-height: 100svh`). No current page uses those variables directly, but they still style `body`, `#root`, `h1`, `h2`, `code`. **This is live, not theoretical**: the built `dist/assets/index-CgBc2zQV.css` concatenates both files, so `#root`'s 1126px bordered column coexists with `.auth-container`'s full-screen layout.

### `src/App.css` (current, "Inovix Labs" theme)
Imported by `pages/Register.jsx` and `pages/Login.jsx` (and by the unused `mainApp.jsx`). Provides:

| Selector | Meaning |
|----------|---------|
| `*` reset | box-sizing, margin, padding zero |
| `body` | dark slate `#0f172a`, system font stack |
| `.auth-container` | full-screen flex center, dark gradient background |
| `.auth-wrapper` | flex split, 1000px max-width, white card, 24px radius, deep shadow |
| `.auth-branding` | purple gradient (`#667eea → #764ba2`) panel with SVG dot pattern overlay (`::before`) |
| `.brand-logo`, `.brand-icon` | 🚀 mark + "Inovix Labs" |
| `.brand-tagline`, `.brand-features` | marketing copy |
| `.auth-form-section` | right panel, max-width 500px |
| `.auth-header`, `.auth-title`, `.auth-subtitle` | headings |
| `.field` | bottom-margin wrapper |
| `.field label` | bold slate label |
| `.field input`, `.field select` | 2px light border, 12px radius, `#f8fafc` bg; on `:focus` → purple border + glow |
| `.auth-btn` | gradient button, `translateY(-2px)` hover lift |
| `.status` | sky-blue informational box |
| `.auth-footer`, `.auth-footer a` | muted gray link row |
| `@media (max-width: 768px)` | `.auth-wrapper` becomes a single column (`flex-direction: column`, max-width 440px); padding shrinks |

**Cascade caution:** `index.css` sets `#root` to a bordered 1126px column with side borders and centered text; `App.css`'s `.auth-container` draws its own full-screen gradient. Because `App.css` is imported *after* `index.css` (via module graph), and both target `body`, the **dark** body background from App.css wins. Test both light and dark OS modes.

## 5. Assets, Icons & Public Files

- **`src/assets/hero.png`** — unused binary (external URL in file listing).
- **`src/assets/react.svg`, `src/assets/vite.svg`** — unused logos.
- **`public/icons.svg`** — SVG sprite: `bluesky-icon`, `discord-icon`, `documentation-icon`, `github-icon`, `social-icon`, `x-icon`. Not referenced by current pages. A copy also exists at `dist/icons.svg` (committed stale build output).
- **`public/favicon.svg`** — used by `index.html`.

**DevOps:** `public/*` are copied verbatim into `dist/`; `src/assets/*` are hashed and processed by Vite.

## 6. Build Tooling (Vite)

**`vite.config.js`**
```js
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
});
```
- Dev server on **`:3000`**, no `strictPort` (may auto-increment to 3001 if busy).
- **No proxy** → frontend calls backend cross-origin (`:8080`); CORS must be configured on the backend. In no-DB backend mode CORS **is** applied (`simpleHandler` sets `Access-Control-Allow-Origin: *`) — see [ARCHITECTURE.md §3](./ARCHITECTURE.md#3-backend-modes-no-db-vs-postgres). *(Earlier revisions of this doc said the opposite; corrected.)*
- Build default `dist/`. SPA needs history fallback (`try_files $uri /index.html` for Nginx).

## 7. Linting (Oxlint)

Same `.oxlintrc.json` as before — `react/rules-of-hooks: error`, `react/only-export-components: warn`. Run `npm run lint`. Note: `@types/react` and `@types/react-dom` are installed but the project is plain JS (no TypeScript) — these devDeps are unused and can be removed to shrink install time.

## 8. Environment Variables (Frontend)

| Variable | Required | Default | Consumed in | Notes |
|----------|----------|---------|-------------|-------|
| `VITE_API_URL` | No | `http://localhost:8080/register` | `pages/Register.jsx` | Must start with `VITE_`. **Baked at build time.** ⚠️ Committed `dist/` was built **without** this and hardcodes `/api/user` — rebuild required. |

- Set in a root `.env` (gitignored).
- Login page doesn't use any API URL.
- Full matrix: [BACKEND-API.md §7](./BACKEND-API.md#7-environment-variables).

## 9. Frontend Scripts Reference

| Command | What it does | When |
|---------|--------------|------|
| `npm install` | Installs deps (incl. React Router) | First setup / after dep change |
| `npm run dev` | Vite dev server on :3000 with HMR | Development |
| `npm run build` | Production build → `dist/` | Before deploy |
| `npm run preview` | Serve built `dist/` locally | Verify prod build |
| `npm run lint` | Runs Oxlint | CI / pre-commit |

> ⚠️ **No `package-lock.json` is committed.** `npm install` resolves latest-compatible versions each time — builds are not reproducible. The suggested CI (`RUNBOOK Appendix H`) uses `npm ci`, which **requires** a lockfile and will fail today. Commit a lockfile (or change CI to `npm install`).

---

## Appendix A — File-by-File Reference Matrix

| File | Role | Owner | Frequency |
|------|------|-------|-----------|
| `index.html` | HTML shell — `<title>` is `Test App` (built `dist/` says `react-gender-app`) | Frontend | Rare |
| `dist/` | ⚠️ **Committed stale build** — hardcodes `/api/user`, ignores `VITE_API_URL` | — | Should be gitignored; rebuild before deploy |
| `src/main.jsx` | Entry: StrictMode + BrowserRouter + `<App/>` | Frontend | Rare |
| `src/App.jsx` | Route table (`/`, `/register`, `/login`) | Frontend | Occasional |
| `src/mainApp.jsx` | **Unused** alternate entry rendering `<Register/>` | — | Should be deleted |
| `src/pages/Register.jsx` | Registration form + POST to backend | Frontend | Frequent |
| `src/pages/Login.jsx` | UI-only login (simulated success) | Frontend | Occasional |
| `src/App.css` | Auth split-panel theme (Inovix Labs) | Frontend / Designer | Occasional |
| `src/index.css` | Global vars / legacy theme | Frontend / Designer | Occasional |
| `src/assets/hero.png` | Unused image | Designer | Rare |
| `src/assets/react.svg` | Unused logo | — | Static |
| `src/assets/vite.svg` | Unused logo | — | Static |
| `public/icons.svg` | SVG sprite (unused by pages) | Designer | Rare |
| `public/favicon.svg` | Browser tab icon | Designer | Rare |
| `vite.config.js` | React plugin; port 3000 | Frontend | Rare |
| `.oxlintrc.json` | Lint rules | Frontend | Rare |
| `package.json` | Deps + scripts (incl. `react-router-dom`) | Frontend | Occasional |
