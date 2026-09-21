# Fintech Operations Workbench

A small, reusable internal-tools prototype containing three explicit fintech operations applications: KYC review, refund approvals, and feature-flag administration. It uses React + TypeScript, Express + TypeScript, and SQLite in one repository.

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
| `npm run seed` | Add synthetic seed data for any empty application module |
| `npm run reset` | Atomically replace all demo data with the original synthetic records |
| `npm run scaffold:app -- ...` | Generate a typed new-application starter outside the live workbench |
| `npm run governance` | Verify registered apps, permissions, tests, and accelerator contracts |
| `npm run dev` | Run the Vite client and Express API together |
| `npm run build` | TypeScript server build plus optimized client build |
| `npm start` | Run the built demo server; serves the built client when present |
| `npm test` | Run isolated Vitest API and policy tests |
| `npm run typecheck` | Type-check server and client |
| `npm run lint` | Run ESLint |

Normal startup creates the schema and seeds only application modules that are empty. It never resets existing data.

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

- `viewer-001`: can read all three applications, cannot change state.
- `kyc-reviewer-001`: can read and decide pending KYC cases.
- `refund-reviewer-001`: has refund-domain permissions only and cannot access KYC routes.
- `feature-flag-admin-001`: can read and change synthetic feature flags.
- `platform-admin-001`: can read the application catalog, access model, and inherited controls.

Unknown identities are rejected. Roles or permissions in request bodies are never trusted.

## Application modules

- **KYC review:** status/risk queue, case detail, and pending-only approval or rejection.
- **Refunds dashboard:** status/risk queue prioritized by risk and amount, with pending-only approval or rejection.
- **Feature-flag admin:** environment/state filters and versioned enable/disable actions against synthetic flags only.
- **Platform overview:** read-only application inventory, ownership, risk, effective permissions, shared guardrails, app scaffolding, executable governance gates, a synthetic connector contract, and the app 4 extension path.

Every state change requires a non-blank trimmed reason and `expectedVersion`. The conditional update and append-only audit insert run in one SQLite transaction; stale, repeated, and no-op requests return HTTP `409`.

The shell, queue component, badges, audit history, authorization policy helper, audit writer, persistence, and test patterns are reusable. Domain services and routes remain explicit rather than forming a generic workflow engine. See [Architecture and extension guide](docs/architecture.md).

Generate a reviewable starter outside the live application:

```bash
npm run scaffold:app -- \
  --id disputes \
  --label "Dispute review" \
  --owner "Payment Operations" \
  --risk elevated \
  --data restricted \
  --output ../dispute-review
```

The generator writes a manifest, typed service, React workspace, starter test, and integration checklist. It does not register or deploy the generated application automatically. `npm run governance` then checks that registered modules have services, workspaces, API tests, enforced route permissions, assigned roles, and the expected accelerator/connector assets.

Take-home deliverables:

- [Key decisions one-pager](docs/key-decisions.md)
- [Five-minute presentation outline](docs/loom-outline.md)

## Tests

Tests use a new in-memory SQLite database for each case. They cover:

- allowed reviewer decision and audit details;
- direct viewer denial;
- forged-role payload denial;
- blank trimmed reason;
- stale and repeated decision conflicts;
- rollback when audit insertion fails;
- rollback when replacement seeding fails during reset;
- unknown identity and cross-domain permission denial;
- JSON 404 responses for unknown API reads when serving the SPA;
- refund authorization, validation, concurrency, and rollback;
- feature-flag authorization, filtering, concurrency, no-op rejection, and rollback;
- platform catalog authorization and inherited-control payload;
- application scaffolder validation and generated-file coverage;
- executable platform-governance checks;
- strict synthetic connector and OpenAPI fixture alignment;
- production-mode startup guard.

Run:

```bash
npm test
```
