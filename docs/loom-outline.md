# VP Engineering Loom walkthrough (target: 4:50)

Follow the five slides in order. Switch to the workbench during slide 3. The slides are for the VP; the click sequence is here.

## 0:00–0:25 — The question (slide 1)

You have three Power Apps today: KYC reviews, refunds, and feature flags. At least ten more are planned, and the platform costs about $250K a year. I looked at what you're getting for that spend and whether Devin could help your team build the next apps in code.

## 0:25–1:05 — Power Apps (slide 2)

Power Apps lets people build and change apps through visual editors. Dataverse and connectors handle data access, while environments, data policies, and pipelines help admins manage releases and data movement. Microsoft operates the service underneath. I'd want to know who actually edits your apps, which connectors you depend on, and which features your license covers before pricing a replacement.

## 1:05–2:40 — What I built (slide 3 and live workbench)

I built the three workflows in a React and Express workbench with SQLite. They share server-side permission checks, validated writes, version checks, and one audit log. The repo also generates a starter for a new app and checks that registered apps follow the same rules. Devin helped build the code; engineers would still review the rules and changes.

In the workbench, select the KYC reviewer persona, open a pending case, enter a reason, and approve or reject it. Switch to the platform admin persona, open Platform overview, and find that decision in the activity feed. Keep the demo short; the point is that the event is recorded across apps without a separate audit implementation for each one.

## 2:40–3:35 — What the demo leaves out (slide 4)

These are synthetic records. The persona picker allows impersonation, and the connector uses a local fixture. To handle real users and data, your team would need SSO and group mapping, real integrations, deployment, secrets, monitoring, backups, security review, and someone to support the apps. That includes maintaining the shared code as the app count grows. This prototype hasn't measured that cost or the product work those engineers would give up.

## 3:35–4:50 — Recommendation and next step (slide 5)

I'd leave the existing apps in Power Apps and run a 90-day pilot on two new ones with Devin: one straightforward and one with a real integration. First check usage and contract terms so we know what spend could actually go away. Put production access and an operations owner in place before live use. Track build time, support work, security findings, and the full three-year cost.

If the team can run the new apps safely and the numbers work, move others over gradually. If they don't, keep Power Apps for the routine tools and use Devin where custom code earns its keep.
