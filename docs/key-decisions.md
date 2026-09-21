# Key decisions

## Scope

The prototype tests one question: can a small shared codebase support a growing portfolio of fintech internal tools without becoming another generic app builder? It implements the client's three current use cases—KYC review, refund approvals, and feature-flag administration—using synthetic data only.

## Architecture

I chose a TypeScript modular monolith: one React shell, one Express API, and one SQLite database. Shared code handles the repeated platform concerns (navigation, queue UI, server-owned permissions, validation, optimistic concurrency, atomic audit writes, and test setup). Each domain retains explicit tables, services, routes, permissions, and UI modules.

This is intentionally not a low-code designer. Building a configurable workflow engine would consume the prototype budget, hide the domain rules that matter in fintech, and recreate only a weak subset of Power Apps.

## Product decisions

- **App-oriented sidebar:** the three tools are separate applications inside one operations shell, not tabs in one workflow.
- **Application-scoped roles:** the development persona selector shows only roles relevant to the active app.
- **Narrow platform overview:** a read-only catalog shows application ownership, risk, permissions, inherited controls, and the steps to add app 4. It does not pretend to replace enterprise identity administration.
- **Code-first accelerator:** a CLI generates a typed service/workspace/test starter, while an executable governance gate checks files, route permissions, assigned roles, and connector contracts. Engineering review still controls registration and deployment.
- **Connector boundary, not a production integration:** a local OpenAPI fixture and strict synthetic adapter demonstrate how Devin can turn an API contract into typed code and tests without requiring credentials or external services.
- **Feature flags remain synthetic:** the prototype demonstrates authorization and auditability but cannot change a real production system.
- **Production refusal:** the process exits in production mode because demo impersonation is deliberately not authentication.

## Tradeoffs

The design makes standard engineering practices—source control, testing, custom UX, and explicit domain logic—first class. In exchange, the client would own deployment, SSO integration, secrets, observability, backups, security review, incident response, and long-term platform maintenance.

Power Apps already packages visual authoring, Dataverse, connectors, environments, security roles, data policies, audit, and application lifecycle tooling. Its strongest advantage is not generating forms; it is allowing non-engineers to build while Microsoft operates the control plane.

## Recommendation

Do not commit to a wholesale replacement from this prototype. Run a 90-day code-first pilot while retaining Power Apps. Productionize the shared foundation, then build two representative new applications: one standard queue and one integration-heavy workflow. Compare delivery effort, reliability, security findings, operator burden, and three-year total cost.

Proceed with a migration only if the pilot shows repeatable delivery and the organization is willing to own the platform. Otherwise retain Power Apps for commodity/citizen-developed tools and use Devin for custom applications, extensions, testing, and selective migration work.
