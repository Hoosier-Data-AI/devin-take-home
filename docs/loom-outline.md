# VP Engineering walkthrough (aim for 4:45)

Use the slides as prompts, then switch to the running workbench for the demo. Don't read the tables aloud.

## 0:00–0:35 — Slide 1: recommendation

I'd keep Power Apps for now and run a 90-day pilot with two *new* apps. The company spends $250K a year, uses three apps, and expects at least ten more. That is enough potential spend to investigate, but this prototype says nothing about the cost of running an alternative.

## 0:35–1:15 — Slide 2: what they're buying

Power Apps provides canvas and model-driven builders, Dataverse and connectors, and administrative tooling around environments, data policies, and deployment. Non-engineers can build and change apps. Ask which of these the client uses and what its contract includes before treating the license as a line item to remove.

## 1:15–2:30 — Slide 3 and live workbench: what Devin helped build

The three synthetic apps are KYC review, refund approvals, and feature-flag administration. They share the shell and server-side controls, but the domain rules are explicit code.

In the KYC queue, choose a pending case, enter a reason, and make a decision. Open Platform overview and find the entry in the cross-app audit feed. Every write requires a reason and expected version; the state change and audit event commit together. Show the app 4 path briefly: scaffolding, repository checks, then an engineer implementing and reviewing the real integration. Devin helped write this foundation and can help build subsequent apps. This is a working code prototype with synthetic data, not a production system or a visual builder.

## 2:30–3:20 — Slide 4: boundary of the proof

Custom KYC rules, UX, source control, tests, and reusable patterns are feasible. The team would still own identity, access lifecycle, deployments, secrets, monitoring, backup, support, and incidents. Persona switching is not authentication; the connector is a fixture. Microsoft supplies platform services, while the customer still configures and governs its Power Apps.

## 3:20–4:00 — Slide 5: economics

The $250K is current spend, not projected savings. Check whether licenses can actually be reduced. Compare three years of license and admin spend against engineers' build time, integrations, hosting, security review, maintenance, on-call, and migration. Track what product work those engineers would otherwise ship.

## 4:00–4:45 — Slide 6: the decision

Keep the current apps during the pilot. Inventory usage and contract terms; make the foundation operable; ship one ordinary queue and one integration-heavy app. Have security and platform owners review the result. Migrate only if repeatable delivery, reliability, operational ownership, and full cost all make sense.

If the pilot doesn't clear that bar, keep Power Apps for standard apps. Devin can still help with extensions, integrations, tests, and custom apps that don't fit Power Apps.
