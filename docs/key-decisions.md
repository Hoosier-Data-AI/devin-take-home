# Key decisions

## Scope

Two hours buys one honest answer, not a platform. I built the three apps they already run in Power Apps (KYC review queue, refunds dashboard, feature-flag admin) on synthetic data, and spent the rest of the budget on the thing that actually decides build-vs-buy for them: what happens when they add apps 4 through 13.

That is why roughly half the repo is not the three apps. It is a generator, a governance gate, a connector contract, and a platform view that shows what every new app inherits.

## Architecture

One React shell, one Express API, one SQLite file. A modular monolith, because 10 more internal tools at a 60-person company is not a microservices problem, and because the whole thing has to be clonable and runnable in a minute for this evaluation to mean anything.

Each domain keeps its own tables, service, routes, Zod schemas, permissions, and workspace. Shared code owns the parts that are identical in every internal tool and dangerous to reimplement: navigation, the queue/detail UI, server-side permission checks, request validation, optimistic concurrency, and the audit write.

I did not build a form designer or a configurable workflow engine. That is where the prototype budget goes to die, and the result would be a worse Power Apps with a fintech company's KYC rules buried in JSON config.

## The bet: controls live in code, not in policy docs

Every write route checks a domain-specific permission on the server, requires a non-blank reason and an `expectedVersion`, and writes the state change and the audit row in one SQLite transaction. The audit table is append-only, enforced by triggers, not by convention.

Because all three apps write to that one table, "who changed what across every internal tool" is one query. The platform view exposes it as an activity feed with a per-app filter. In Power Apps that is a feature you buy; here it fell out of the schema choice.

`npm run scaffold:app` generates a typed service, workspace, test, manifest, and integration checklist. `npm run governance` fails CI if a registered app is missing a service, workspace, or API test, if a route skips its permission check, or if a role has no assigned permissions. The generator makes the standard path fast; the gate makes the non-standard path loud. Neither one deploys anything: a human still reviews and registers the app.

## What I left out on purpose

Persona switching is impersonation, not authentication, so the server refuses to boot with `NODE_ENV=production`. There is no SSO, no real connector, no deployment pipeline, no compliance claim. The customer-profile connector is a local OpenAPI fixture with a strict adapter and contract tests, which shows how the integration work gets typed without touching credentials.

## The tradeoff I am asking them to accept

They get custom UX, real source control, real tests, and domain logic they can read. They also take on deployment, SSO, secrets, observability, backups, security review, on-call, and the maintenance of the shared foundation itself. Power Apps' durable value is not form generation. It is Microsoft operating the control plane and non-engineers building without filing a ticket.

## Recommendation

Do not rip out Power Apps because a prototype worked. Keep paying for it and run a 90-day pilot: productionize this foundation, then ship two new apps with Devin, one ordinary queue and one integration-heavy workflow. Measure delivery time, security findings, operator complaints, and three-year cost. Migrate only if delivery is repeatable and someone owns the platform on-call. Otherwise keep Power Apps for commodity and citizen-built tools and use Devin for the custom ones.
