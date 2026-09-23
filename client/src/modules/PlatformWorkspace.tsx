import { useEffect, useState } from "react";
import { fetchPlatformAudit, fetchPlatformOverview } from "../api";
import { formatDate, titleCase } from "../format";
import type {
  AuditEntityType,
  AuditEvent,
  PlatformOverview
} from "../types";
import type { WorkspaceProps } from "./types";

const auditSources: Array<{ value: AuditEntityType | ""; label: string }> = [
  { value: "", label: "All applications" },
  { value: "kyc_case", label: "KYC review" },
  { value: "refund_request", label: "Refunds dashboard" },
  { value: "feature_flag", label: "Feature-flag admin" }
];

export function PlatformWorkspace({ personaId }: WorkspaceProps) {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState("");
  const [auditSource, setAuditSource] = useState<AuditEntityType | "">("");
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditError, setAuditError] = useState("");

  useEffect(() => {
    void fetchPlatformOverview(personaId)
      .then((nextOverview) => {
        setOverview(nextOverview);
        setError("");
      })
      .catch((loadError: unknown) => {
        setOverview(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the platform overview."
        );
      });
  }, [personaId]);

  useEffect(() => {
    let active = true;
    void fetchPlatformAudit(personaId, { entityType: auditSource })
      .then((events) => {
        if (!active) {
          return;
        }
        setAuditEvents(events);
        setAuditError("");
      })
      .catch((loadError: unknown) => {
        if (!active) {
          return;
        }
        setAuditEvents([]);
        setAuditError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the activity log."
        );
      });
    return () => {
      active = false;
    };
  }, [auditSource, personaId]);

  if (error) {
    return <div className="message error-message">{error}</div>;
  }

  if (!overview) {
    return <div className="loading-state">Loading platform overview…</div>;
  }

  return (
    <>
      <section className="workspace-heading">
        <div>
          <p className="eyebrow">Platform administration</p>
          <h2>Application catalog and guardrails</h2>
          <p>
            A governance view of what exists, who can access it, and which
            controls every new application inherits.
          </p>
        </div>
        <div className="queue-summary">
          <strong>{overview.applications.length}</strong>
          <span>registered apps</span>
        </div>
      </section>

      <div className="platform-note">
        <strong>Deliberately not a user directory.</strong> Production access
        should come from the company identity provider and mapped groups; this
        prototype only exposes server-owned demo personas.
      </div>

      <section className="platform-section accelerator-showcase">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Code-first acceleration</p>
            <h3>App accelerator</h3>
          </div>
          <span
            className={
              overview.accelerator.passed
                ? "gate-status gate-status-passed"
                : "gate-status gate-status-failed"
            }
          >
            {overview.accelerator.passingChecks}/
            {overview.accelerator.totalChecks} gates passing
          </span>
        </div>
        <p className="section-intro">
          Devin starts from typed code and enforces the platform contract. The
          generator creates a reviewable starting point; executable checks
          prevent a new app from bypassing the shared controls.
        </p>
        <div className="accelerator-grid">
          <article className="accelerator-card">
            <p className="eyebrow">Generate</p>
            <h4>Typed application starter</h4>
            <pre>
              <code>{overview.accelerator.scaffoldCommand}</code>
            </pre>
            <ul>
              {overview.accelerator.generatedFiles.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          </article>

          <article className="accelerator-card governance-card">
            <p className="eyebrow">Enforce</p>
            <h4>Governance as code</h4>
            <strong>
              {overview.accelerator.passingChecks}/
              {overview.accelerator.totalChecks}
            </strong>
            <span>repository controls currently passing</span>
            <code>{overview.accelerator.governanceCommand}</code>
            <p>
              Checks registered apps for services, workspaces, API tests,
              route permissions, and assigned roles.
            </p>
          </article>

          {overview.connectors.map((connector) => (
            <article className="accelerator-card" key={connector.id}>
              <p className="eyebrow">Connect</p>
              <div className="connector-heading">
                <h4>{connector.name}</h4>
                <span>{titleCase(connector.status)}</span>
              </div>
              <p>
                {connector.owner} · {titleCase(connector.direction)}
              </p>
              <code>{connector.contractPath}</code>
              <ul>
                {connector.controls.map((control) => (
                  <li key={control}>{control}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Inventory</p>
            <h3>Registered applications</h3>
          </div>
          <span>Ownership and risk stay explicit</span>
        </div>
        <div className="application-card-grid">
          {overview.applications.map((application) => (
            <article className="application-card" key={application.id}>
              <div className="application-card-heading">
                <span className="app-monogram">
                  {application.name.slice(0, 2)}
                </span>
                <div>
                  <h3>{application.name}</h3>
                  <p>{application.owner}</p>
                </div>
                <span className={`risk-chip risk-chip-${application.riskTier}`}>
                  {titleCase(application.riskTier)}
                </span>
              </div>
              <p>{application.description}</p>
              <dl>
                <div>
                  <dt>Data</dt>
                  <dd>{titleCase(application.dataClassification)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{titleCase(application.status)}</dd>
                </div>
              </dl>
              <div className="permission-list">
                {application.permissions.map((permission) => (
                  <code key={permission}>{permission}</code>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="platform-columns">
        <section className="platform-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Inherited controls</p>
              <h3>The boring hard parts</h3>
            </div>
          </div>
          <ul className="control-checklist">
            {overview.sharedControls.map((control) => (
              <li key={control}>{control}</li>
            ))}
          </ul>
        </section>

        <section className="platform-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Application 4</p>
              <h3>Repeatable extension path</h3>
            </div>
          </div>
          <ol className="extension-steps">
            {overview.extensionSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="platform-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Oversight</p>
            <h3>Activity across every application</h3>
          </div>
          <label className="audit-source-filter">
            <span>Application</span>
            <select
              onChange={(event) =>
                setAuditSource(event.target.value as AuditEntityType | "")
              }
              value={auditSource}
            >
              {auditSources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="section-intro">
          Every application writes to the same append-only audit table, so one
          query answers who changed what without per-app reporting work.
        </p>
        {auditError ? (
          <div className="message error-message">{auditError}</div>
        ) : (
          <div className="access-table-wrap">
            <table className="access-table activity-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Record</th>
                  <th>Change</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No recorded activity for this filter.</td>
                  </tr>
                ) : (
                  auditEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDate(event.createdAt)}</td>
                      <td>{event.actorId}</td>
                      <td>
                        <strong>{event.entityId}</strong>
                        <span>{titleCase(event.entityType)}</span>
                      </td>
                      <td>
                        {event.oldStatus ?? "new"} → {event.newStatus}
                      </td>
                      <td>{event.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="platform-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Access model</p>
            <h3>Demo personas and effective permissions</h3>
          </div>
          <span>Production mapping belongs in SSO groups</span>
        </div>
        <div className="access-table-wrap">
          <table className="access-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Type</th>
                <th>Effective permissions</th>
              </tr>
            </thead>
            <tbody>
              {overview.personas.map((persona) => (
                <tr key={persona.id}>
                  <td>
                    <strong>{persona.label}</strong>
                    <span>{persona.id}</span>
                  </td>
                  <td>{titleCase(persona.personaType)}</td>
                  <td>
                    <div className="permission-list">
                      {persona.permissions.map((permission) => (
                        <code key={permission}>{permission}</code>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
