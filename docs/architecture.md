# Architecture and extension guide

## Recommendation

Keep the first wave of internal tools in one repository and one deployable workbench while the team learns which primitives are genuinely shared. The code is a modular monolith, not a generic workflow engine:

```text
client/src/
  components/          shared queue, badges, and audit history
  modules/             explicit KYC, refunds, and feature-flag workspaces
server/
  app.ts               explicit HTTP routes and validation
  *-service.ts         domain queries and transactional commands
  policies.ts          shared permission and transition primitives
  audit.ts             shared append-only audit access
  database.ts          schema, additive migration, and synthetic seed data
tests/
  *-api.test.ts        isolated domain authorization and transaction tests
```

This keeps setup, runtime, UI conventions, authorization, auditability, concurrency, and testing consistent without coupling every application to a configurable workflow abstraction.

## Adding application 4 or 5

1. Add domain-specific tables and deterministic synthetic seeds.
2. Add domain types and an explicit service with list, detail, and command functions.
3. Add server-owned read/write permissions and a demo persona when needed.
4. Register explicit validated API routes.
5. Reuse `QueueTable`, `Badge`, `AuditHistory`, and formatting helpers.
6. Add a workspace module and one shell navigation entry.
7. Test direct authorization, forged payloads, validation, stale versions, and audit rollback.
8. Update the architecture inventory and seed/reset documentation.

A straightforward queue-and-decision application should require a domain service, a workspace, routes, seeds, and tests—not changes to the shared runtime model.

## When to split deployments

Keep modules together while they share operators, release cadence, and operational risk. Split a module into a separate package or deployment when it needs materially different:

- availability or scaling;
- data residency or access controls;
- release ownership;
- incident blast radius;
- external integrations.

Feature-flag administration is the most likely early split because a real implementation would control production behavior. This prototype intentionally manages only local synthetic flags and connects to no SDK or production service.

## Build-versus-buy evidence

Use the next applications to measure:

- implementation time by app and by reusable primitive;
- percentage of domain code versus shared code;
- maintenance and security ownership;
- hosting, observability, and support cost;
- change lead time compared with the licensed platform;
- whether specialized requirements force per-app exceptions.

The decision should compare the avoided license cost with ongoing platform ownership, not prototype development cost alone.
