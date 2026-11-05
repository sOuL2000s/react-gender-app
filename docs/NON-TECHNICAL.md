# 🧑‍💼 Non-Technical Summary (Plain English)

> Part of [Project Documentation](./README.md). For technical details see [ARCHITECTURE.md](./ARCHITECTURE.md), [FRONTEND.md](./FRONTEND.md), [BACKEND-API.md](./BACKEND-API.md).

## What this project is

The **Inovix Labs Demo App** is a small **two-part website**:

- A **web app** in the browser with two screens:
  - **Create Account** — collects first name, last name, email, password, age, gender.
  - **Sign In** — collects email + password.
- A **server program** behind the scenes that receives the "Create Account" submission.

## What actually happens when someone signs up

1. The person fills in the **Create Account** form and clicks **Create Account**.
2. The web app **sends the details** to the server.
3. The server either:
   - **Saves the details to a database** (if a database is configured), or
   - **Just looks at them and replies "ok"** without saving (if no database is configured — the default for quick local runs).
4. The web app shows **"Registration successful!"** and clears the form.

## What the Sign In screen does (important)

The **Sign In** screen currently **does not check any credentials**. It pretends to log in for about one second and then shows **"Login successful!"**.

👉 **This is a placeholder.** It is not real authentication and does not talk to the server. Do not use it to gate access to anything sensitive.

## What data is and is not stored

| Field | Sent by the form? | Saved in the database (when a DB is configured)? |
|-------|------------------|---------------------------------------------------|
| First name | ✅ | Only as part of the combined `name` |
| Last name | ✅ | Only as part of the combined `name` |
| Email | ✅ | ❌ **not saved** |
| Password | ✅ | ❌ **not saved** |
| Age | ✅ | ✅ (including `0` — no range check) |
| Gender | ✅ | ✅ |

> ⚠️ **Security note for stakeholders:** Passwords are transmitted in plain form to the server but are **not stored** by the current backend. In a real product, this would be unacceptable — passwords must be hashed on the server (and the connection must be HTTPS). Treat this as a demo.

## Two ways the server can run

Think of the server as having two personalities:

1. **"Memory-only" mode (default):** It receives the signup, replies "ok", and **forgets it immediately**. Useful for showing the UI without setting up a database. It **does** reply properly to the browser (the "CORS" permission header is set automatically in this mode, so no browser-side blocking).
2. **"Database" mode:** The server is pointed at a PostgreSQL database at startup; it creates a `users` table if missing and **saves every signup** there. It also exposes a small health-check URL (`/health`) that cloud platforms can poll to know the service is alive.

> ⚠️ **Freshness warning for stakeholders:** the `dist/` folder that ships with the repository is **out of date**. It was built from an older version of the signup screen and points at a different server URL. Whoever deploys must **rebuild** it first (`npm run build`). Do not hand the checked-in `dist/` to a hosting provider.

A one-line difference worth knowing:

| | Memory-only | Database |
|---|---|---|
| Saves data? | ❌ | ✅ |
| Has `/health`? | ❌ | ✅ |
| Browser can call from another site? | ✅ (but allowed from **any** site — fine for a demo, tighten for prod) | ✅ (only from the address you configure) |
| Uses a database password? | No | Yes |

## What "done" would look like for a bigger version

If this becomes a real product, the obvious next steps (in plain terms):

1. **Real sign-in** — passwords hashed and verified on the server; a login endpoint; sessions or tokens.
2. **Save email and password** — currently they're thrown away.
3. **Input validation** — reject nonsense ages, empty names, bad genders, with friendly messages.
4. **Account page / dashboard** — a screen listing registered users or the current user's profile.
5. **Email verification** — confirm the email address belongs to the person.
6. **Deployment polish** — CI, Docker, HTTPS, and monitoring.
7. **Fix the build pipeline** — stop committing `dist/`; always rebuild from `src/`; add a lockfile so installs are reproducible.
8. **Make the server fail loudly** — if the database is unreachable at startup, the server currently pretends everything is fine and stops saving data. It should retry or refuse to start.

## Who is involved and what they care about

| Role | What they do here |
|------|-------------------|
| **Developers** | Change the web screens (frontend) or the server logic (backend). |
| **DevOps** | Deploy the web app to a static host (needs "SPA history fallback") and the server to a cloud container; provide `DATABASE_URL`, `FRONTEND_URL`, `PORT`, and build the frontend with the correct `VITE_API_URL`. |
| **Testers** | Verify the UI flows and the API in **both** server modes (memory-only and database). |
| **Project managers** | Treat this as a **demo baseline**. Use the "bigger version" list above to scope the next milestone. |

## Glossary (plain-English)

- **Frontend** — what users see (the web pages).
- **Backend** — the server program that receives and processes submissions.
- **API** — the agreed way the frontend and backend exchange data.
- **JSON** — a simple text format for data (looks like `{"name":"Alice","age":30}`).
- **Route / router** — in the browser, a URL like `/register` that shows a particular screen without a full page reload.
- **SPA (Single Page Application)** — a web app that loads once and switches screens in the browser; the hosting service must be told to always serve `index.html` for unknown paths.
- **CORS** — a browser security rule requiring the server to say "yes, this website may read my response". Both server modes now respond with that "yes" header; the difference is that memory-only mode says "yes to anyone" while database mode says "yes only to the address you configured".
- **Environment variable** — a setting stored outside the code (e.g. database address, frontend URL).
- **Database / Postgres** — a service that stores data permanently so it isn't forgotten between requests.
- **Health check** — a small URL (`/health`) that cloud platforms poll to confirm the server is alive.
- **Password hashing** — turning a password into a one-way scramble so even server staff can't read it; required for real auth.
- **Build / deploy** — turning source code into files that run on servers, then putting them online.
- **CI (Continuous Integration)** — an automated robot that runs lint/build/tests on every code change.
- **gofmt** — Go's standard code formatter. CI now fails if any Go file isn't formatted with it.
