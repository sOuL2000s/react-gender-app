# React + Vite

> 📘 **Full documentation lives in [`docs/`](./docs/README.md).**
> Start with the [documentation index](./docs/README.md) — it maps every role (developer, DevOps, QA, PM) to the right file.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Project
React + Vite frontend with Go backend API.
Three fields: name, age, gender (plus first/last/email/password in the UI). Values posted as JSON to backend `/register` (alias: `/api/user`).

> ⚠️ The committed `dist/` directory is **stale**: it was built from an older `Register.jsx` and hardcodes `http://localhost:8080/api/user`, ignoring `VITE_API_URL`. **Do not deploy `dist/` as-is — run `npm run build` first.**

## Run
Frontend:
```bash
npm install
npm run dev
```

Backend:
```bash
cd backend
go run main.go
```

Env:
`VITE_API_URL=http://localhost:8080/register`

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
