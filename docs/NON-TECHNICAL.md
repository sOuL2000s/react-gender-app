# 🧑‍💼 Non-Technical Summary (Plain English)

> Part of [Project Documentation](./README.md). For technical details see [ARCHITECTURE.md](./ARCHITECTURE.md), [FRONTEND.md](./FRONTEND.md), [BACKEND-API.md](./BACKEND-API.md).

## What this project is

This project is a **small demo website** with two parts: a **form on the web** and a **server program**.

- On the **website**, someone types their **name, age, and gender** and clicks **"Submit to Backend"**.
- The website sends those details to the **server program**, which **writes them into a log** (like a notepad) and says **"ok"**.
- The website then shows **"Sent successfully!"** or an error message.

## What it does NOT do

- It doesn't save data to a database.
- It doesn't have accounts or logins.
- It doesn't store anything permanently.

It's a learning/prototype app to show the two sides talking to each other.

## Who is involved and what they care about

| Role | What they do here |
|------|-------------------|
| **Developers** | Change the form (frontend) or the server logic (backend). |
| **DevOps** | Deploy the website to a hosting service and the server program to a cloud server. They set two small settings: where the website sends data, and which website is allowed to talk to the server. |
| **Testers** | Verify the form sends data correctly and the server replies with success/errors as expected. |
| **Project managers** | Consider this the "hello world" baseline. The next steps would be adding data saving, logins, and input validation. |

## What "done" would look like for a bigger version

If this were to become a real product, the obvious next steps (in plain terms) are:

1. **Save the data** — write it to a database instead of just a log.
2. **Add logins** — so only authorized staff can submit.
3. **Validate inputs** — e.g. reject an age of 500 or an empty name with a friendly message.
4. **Better error messages** — tell the user *why* something failed, not just "Error".
5. **A dashboard** — a page to view submitted entries.

## Glossary (plain-English)

- **Frontend** — the part users see in the browser (the form).
- **Backend** — the program running on a server that receives and processes submissions.
- **API** — the agreed way the frontend and backend talk to each other (here: a single "submit a user" request).
- **JSON** — a simple text format for sending data (looks like `{"name": "Alice", "age": 30}`).
- **Server / port** — a computer program listening for requests; a "port" is like a numbered door it listens on (frontend: 3000, backend: 8080 in development).
- **CORS** — a browser security rule that makes the backend explicitly say "yes, this website is allowed to talk to me".
- **Environment variable** — a setting stored outside the code (e.g. "where should the form send data?") so the same code can run in dev, staging, and production.
- **Log** — a running record of events (the backend writes each received submission to its log).
- **Build** — turning the developer's source files into the final files that get deployed.
- **Deploy** — putting those final files onto a server so users can access them.
- **CI (Continuous Integration)** — an automated robot that runs checks (lint, build, tests) every time code changes.
