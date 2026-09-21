# Fintech Operations Workbench

A small, reusable internal-tools prototype centered on one explicit KYC review workflow. It uses React + TypeScript, Express + TypeScript, and SQLite in one repository.

> **Synthetic-data demo only.** This project is not compliant, production-ready, or an authentication system. Its development persona selector permits impersonation by design. The server refuses to start when `NODE_ENV=production`.

## Prerequisites

- Node.js `24.21.0` (pinned in `.nvmrc`)
- npm `11.19.0` (pinned in `package.json`)

With `nvm`:

```bash
nvm install
nvm use
npm run setup
```

`npm run setup` runs `npm ci` against the committed lockfile.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run setup` | Clean, lockfile-compatible dependency install |
| `npm run seed` | Seed 12 synthetic cases only when the database is empty |
| `npm run reset` | Explicitly replace demo data with the original 12 synthetic cases |
| `npm run dev` | Run the Vite client and Express API together |
| `npm run build` | TypeScript server build plus optimized client build |
| `npm start` | Run the built demo server; serves the built client when present |
| `npm test` | Run isolated Vitest API and policy tests |
| `npm run typecheck` | Type-check server and client |
| `npm run lint` | Run ESLint |

Normal startup creates and seeds the database only when it is empty. It never resets existing data.

## Local ports

- Web interface: `http://localhost:5173`
- Express API: `http://localhost:3001`

Run:

```bash
npm run dev
```

The development server stores SQLite data at `data/workbench.sqlite`. Override the location with `DB_PATH`.

After `npm run build`, `npm start` serves the API and built client from port `3001` by default. Set `PORT` to use a different local port. Production mode is intentionally prohibited:

```bash
NODE_ENV=production npm start
```

That command exits with a clear demo-only error.

## Demo personas

The persona ID is sent in the `x-demo-persona-id` header and resolved against server-owned records:

- `viewer-001`: can read KYC cases, cannot decide.
- `kyc-reviewer-001`: can read and decide pending KYC cases.
- `refund-reviewer-001`: has refund-domain permissions only and cannot access KYC routes.

Unknown identities are rejected. Roles or permissions in request bodies are never trusted.

## KYC workflow

- The queue supports status and risk filters and is prioritized by risk.
- Only `pending` cases may transition to `approved` or `rejected`.
- Every decision requires a non-blank trimmed reason and `expectedVersion`.
- The conditional state update and audit insert run in one SQLite transaction.
- Stale or repeated decisions return HTTP `409`.
- Audit events are append-only in the schema, and the API exposes no update or delete endpoint.

The queue component, authorization policy helper, and audit writer are reusable. KYC route handlers and transition rules remain explicit rather than forming a generic workflow engine.

## Tests

Tests use a new in-memory SQLite database for each case. They cover:

- allowed reviewer decision and audit details;
- direct viewer denial;
- forged-role payload denial;
- blank trimmed reason;
- stale and repeated decision conflicts;
- rollback when audit insertion fails;
- unknown identity and cross-domain permission denial;
- production-mode startup guard.

Run:

```bash
npm test
```
