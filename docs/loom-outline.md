# VP Engineering walkthrough (aim for 4:50)

Use the slides as prompts, then switch to the running workbench for the demo. Don't read the tables aloud.

## 0:00–0:35 — Recommendation

I'd keep the three existing apps in Power Apps for now and build the next two with Devin. You spend $250K a year and have more than ten apps planned, so it's worth finding out what it would take to own them. That includes engineering time and ongoing support.

## 0:35–1:15 — What Power Apps provides

Power Apps gives people outside engineering a way to make and change apps. Dataverse and connectors help with data access; environments, policies, and pipelines help you manage the apps. I'd want to know which of these you actually use, and what your current contract covers.

## 1:15–2:45 — Prototype and live workbench

I built the three use cases you described: KYC, refunds, and feature flags. They share server-side access checks, validation, version checks, and an audit record that commits with each change. Each app's rules are still code an engineer can review.

Switch to the workbench. Pick a pending KYC case, enter a reason, decide it, then open Platform overview and find the new event in the shared audit feed. Mention that the repo also has a starter generator and checks for the next app. Devin helped build this code and could help with each new app; an engineer still owns the rules and reviews the changes. The data is synthetic and the persona selector is for the demo.

## 2:45–3:40 — What the team would own

Owned code gives you more freedom with KYC rules, UX, testing, and releases. Before any real users move over, we'd need SSO, group mapping, real integrations, deployment, secrets, monitoring, backups, and an on-call owner. The prototype's connector is a local fixture; I haven't tested a production integration.

## 3:40–4:50 — The pilot and decision

For 90 days, keep existing apps on Power Apps. Check usage and license terms, add the missing production controls, and ship two new apps: one straightforward and one with a real integration. Measure delivery and support time. Compare the full three-year cost, including hosting, security, on-call, migration, and the product work those engineers could have done instead. Check which licenses you can cancel under the contract.

If the team can operate this safely and the cost makes sense, migrate gradually. Otherwise keep Power Apps for the routine apps. Devin can still help with extensions, integrations, tests, and custom apps.
