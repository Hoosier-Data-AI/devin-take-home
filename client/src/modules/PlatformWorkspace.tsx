import { useEffect, useState } from "react";
import { fetchPlatformOverview } from "../api";
import { titleCase } from "../format";
import type { PlatformOverview } from "../types";
import type { WorkspaceProps } from "./types";

export function PlatformWorkspace({ personaId }: WorkspaceProps) {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState("");

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
