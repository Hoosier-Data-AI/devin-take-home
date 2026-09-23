# Five-minute presentation outline

## 0:00–0:40 — Recommendation first

The recommendation is a 90-day code-first pilot, not an immediate Power Apps replacement. The opportunity is real—especially with more than 10 apps planned—but the license buys governance and non-engineer autonomy, not just screens and forms.

## 0:40–1:25 — What Power Apps provides

Power Apps combines canvas and model-driven builders, Dataverse, connectors, workflows, role-based access, data policies, audit, environments, and deployment tooling. That managed control plane is the difficult part to replace.

## 1:25–2:40 — Prototype walkthrough

Show the application sidebar and the three explicit tools. In one workflow, demonstrate a filtered queue, required reason, versioned state change, and appended audit history. Then open the platform overview to show application ownership, risk classification, permissions, inherited controls, and the six-step app 4 path.

Point at the cross-application activity feed on that page: the decision just made in the KYC queue appears there, because every app writes to one append-only audit table. In Power Apps that reporting is a platform feature; here it is a schema choice.

Emphasize that Devin helped create standard code with tests and full customization; it did not generate a low-code platform.

## 2:40–3:40 — Honest comparison

Owned code wins on custom UX, domain logic, source control, automated testing, and avoiding platform constraints. Power Apps wins on citizen development, managed connectors, governance, administration, and transferring operational responsibility to Microsoft.

The prototype does not demonstrate production SSO, provisioning, observability, backups, incident response, compliance, or total cost.

## 3:40–4:35 — Build-versus-buy recommendation

Keep Power Apps during a 90-day pilot. Add SSO/group mapping, secrets, deployment, observability, backups, security review, and runbooks. Build one ordinary queue app and one integration-heavy app. Measure elapsed engineering effort, reuse, defects, operating burden, and three-year cost.

## 4:35–5:00 — Where Devin fits

If the pilot succeeds, Devin accelerates each new application and maintains the shared foundation. If Power Apps remains, Devin still helps with custom extensions, testing, migration tooling, integrations, and the applications that exceed low-code constraints.
